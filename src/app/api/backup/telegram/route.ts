
"use server";
import { NextResponse } from 'next/server';
import { createClient } from 'redis';
import { getConfig } from '../../status/route';
import fs from 'fs/promises';
import path from 'path';
import { MongoClient } from 'mongodb';
import { logEvent } from '@/lib/logger';

const COLLECTION_NAME = "bot_users";
const STATUS_KEY = 'background_export_tg_status';
const PROGRESS_KEY = 'background_export_tg_progress';
const TOTAL_KEY = 'background_export_tg_total';
const FILE_PATH_KEY = 'background_export_tg_file_path';
const ERROR_KEY = 'background_export_tg_error';
const PROCESS_LOCK_KEY = 'background_export_tg_lock';

let redisClient: any;

async function getRedisClient() {
    if (redisClient && redisClient.isOpen) {
        return redisClient;
    }
    const { REDIS_URI } = await getConfig();
    if (!REDIS_URI) throw new Error("Redis не сконфигурирован.");
    
    redisClient = createClient({ url: REDIS_URI });
    await redisClient.connect();
    return redisClient;
}

async function cleanupRedisState(client: any) {
    await client.del([STATUS_KEY, PROGRESS_KEY, TOTAL_KEY, FILE_PATH_KEY, ERROR_KEY, PROCESS_LOCK_KEY]);
}

async function runExportProcess() {
    let localRedis: any;
    let mongoClient: MongoClient | undefined;

    try {
        localRedis = await getRedisClient();
        
        const lockAcquired = await localRedis.set(PROCESS_LOCK_KEY, 'locked', { NX: true, EX: 3600 });
        if (!lockAcquired) {
            await logEvent('info', "Background Telegram export process is already running.");
            return;
        }

        const { MONGODB_URI, MONGODB_DB_NAME } = await getConfig();
        if (!MONGODB_URI) throw new Error('MongoDB не сконфигурирован.');
        
        mongoClient = new MongoClient(MONGODB_URI);
        await mongoClient.connect();
        const dbName = new URL(MONGODB_URI).pathname.substring(1) || MONGODB_DB_NAME;
        const db = mongoClient.db(dbName);
        const collection = db.collection(COLLECTION_NAME);
        
        const query = {};
        const total = await collection.countDocuments(query);
        
        const backupDir = path.join(process.cwd(), 'backups');
        await fs.mkdir(backupDir, { recursive: true });
        const tempFilePath = path.join(backupDir, `telegram-users-backup-${Date.now()}.json.tmp`);
        const finalFilePath = tempFilePath.replace('.tmp', '');

        await localRedis.set(STATUS_KEY, 'running');
        await localRedis.set(TOTAL_KEY, total);
        await localRedis.set(PROGRESS_KEY, 0);
        await localRedis.set(FILE_PATH_KEY, finalFilePath);
        
        const fileHandle = await fs.open(tempFilePath, 'w');
        await fileHandle.write('[\n');

        const CHUNK_SIZE = 5000;
        let isFirstChunk = true;

        for (let i = 0; i < total; i += CHUNK_SIZE) {
            const currentStatus = await localRedis.get(STATUS_KEY);
            if (currentStatus !== 'running') {
                 throw new Error("Процесс экспорта был остановлен пользователем.");
            }

            const users = await collection.find(query).project({_id: 0}).sort({ joinedAt: 1 }).skip(i).limit(CHUNK_SIZE).toArray();
            
            if (users.length > 0) {
                 const chunkString = users.map(u => JSON.stringify(u)).join(',\n');
                 if (!isFirstChunk) {
                    await fileHandle.write(',\n');
                 }
                 await fileHandle.write(chunkString);
                 isFirstChunk = false;
            }
            
            await localRedis.set(PROGRESS_KEY, Math.min(i + CHUNK_SIZE, total));
        }

        await fileHandle.write('\n]');
        await fileHandle.close();

        await fs.rename(tempFilePath, finalFilePath);

        await localRedis.set(STATUS_KEY, 'completed');
        await localRedis.del(PROCESS_LOCK_KEY);
        await logEvent('success', 'Telegram users background export completed.', { totalUsers: total, filePath: finalFilePath });

    } catch (error: any) {
        if(localRedis) {
            await localRedis.set(STATUS_KEY, 'error');
            await localRedis.set(ERROR_KEY, error.message);
            await localRedis.del(PROCESS_LOCK_KEY);
        }
        await logEvent('error', `Background TG users export failed: ${error.message}`, { stack: error.stack });
    } finally {
        if (localRedis && localRedis.isOpen) await localRedis.quit();
        if (mongoClient) await mongoClient.close();
    }
}


export async function GET() {
    try {
        const redis = await getRedisClient();
        const [status, progress, total, filePath, error] = await redis.mGet([
            STATUS_KEY,
            PROGRESS_KEY,
            TOTAL_KEY,
            FILE_PATH_KEY,
            ERROR_KEY
        ]);

        return NextResponse.json({
            status: status || 'idle',
            progress: parseInt(progress || '0', 10),
            total: parseInt(total || '0', 10),
            filePath: filePath,
            error: error
        });
    } catch (error: any) {
        return NextResponse.json({ 
            status: 'error', 
            progress: 0, 
            total: 0, 
            filePath: null, 
            error: `Не удалось получить статус: ${error.message}` 
        }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const { searchParams } = new URL(request.url);
    const actionParam = searchParams.get('action');

    // Handle import action
    if(actionParam === 'import') {
        const { MONGODB_URI, MONGODB_DB_NAME } = await getConfig();
        if (!MONGODB_URI) {
            return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
        }

        let mongoClient: MongoClient | undefined;
        try {
            const data = await request.json();

            if (!Array.isArray(data)) {
                return NextResponse.json({ error: 'Invalid data format. Expected an array of user profiles.' }, { status: 400 });
            }

            mongoClient = new MongoClient(MONGODB_URI);
            await mongoClient.connect();
            const dbName = new URL(MONGODB_URI).pathname.substring(1) || MONGODB_DB_NAME;
            const db = mongoClient.db(dbName);
            const collection = db.collection(COLLECTION_NAME);

            // Clear the collection before importing
            await collection.deleteMany({});

            if(data.length > 0){
                await collection.insertMany(data);
            }
            
            await logEvent('success', `Telegram database imported successfully`, { userCount: data.length });
            return NextResponse.json({ message: `База данных Telegram успешно импортирована.` });

        } catch (error: any) {
            await logEvent('error', `Failed to import TG data: ${error.message}`, { stack: error.stack });
            return NextResponse.json({ error: 'Failed to import TG data' }, { status: 500 });
        } finally {
            if (mongoClient) await mongoClient.close();
        }
    }


    // Handle background export actions
    try {
        const { action } = await request.json();
        const redis = await getRedisClient();

        if (action === 'start') {
            const currentStatus = await redis.get(STATUS_KEY);
            if (currentStatus === 'running') {
                return NextResponse.json({ message: 'Экспорт уже запущен.' }, { status: 409 });
            }
            await cleanupRedisState(redis);
            runExportProcess().catch(async (e) => await logEvent('error', `Unhandled error in runExportProcess`, { error: e.message, stack: e.stack }));
            return NextResponse.json({ message: 'Фоновый экспорт пользователей Telegram запущен.' });

        } else if (action === 'stop') {
             await redis.set(STATUS_KEY, 'stopped');
             await redis.del(PROCESS_LOCK_KEY);
             return NextResponse.json({ message: 'Команда остановки отправлена.' });
        
        } else if (action === 'clear') {
            const filePath = await redis.get(FILE_PATH_KEY);
            await cleanupRedisState(redis);
            if(filePath){
                try { await fs.unlink(filePath); } catch(e) { /* ignore */ }
            }
            return NextResponse.json({ message: 'Статус экспорта очищен.' });
        }

        return NextResponse.json({ error: 'Неверное действие.' }, { status: 400 });

    } catch (error: any) {
        await logEvent('error', `Server error in POST /api/backup/telegram: ${error.message}`, { stack: error.stack, body: await request.text() });
        return NextResponse.json({ error: `Ошибка сервера: ${error.message}` }, { status: 500 });
    }
}
