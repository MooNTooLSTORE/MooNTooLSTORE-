
import { NextResponse } from 'next/server';
import { createClient } from 'redis';
import { MongoClient, ObjectId } from 'mongodb';
import { getConfig } from '../status/route';
import { logEvent } from '@/lib/logger';


export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    const config = await getConfig();
    if (!config.REDIS_URI || !config.MONGODB_URI) {
        return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
    }
    
    return getDashboardData(config);
}

async function getDashboardData(config: any) {
    const redisClient = createClient({ url: config.REDIS_URI });
    
    try {
        await redisClient.connect();

        const activeConnectionKeys = await redisClient.keys('confirm:*');
        const stats = {
            activeConnections: activeConnectionKeys.length / 2, // Each connection has two keys
        };
        
        return NextResponse.json({ stats });

    } catch (error: any) {
        await logEvent('error', "Error fetching dashboard data", { error: error.message });
        return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
    } finally {
        if (redisClient.isOpen) {
            await redisClient.quit();
        }
    }
}


export async function DELETE(request: Request) {
    const { REDIS_URI, MONGODB_URI, MONGODB_DB_NAME } = await getConfig();
    if (!REDIS_URI || !MONGODB_URI) {
        return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
    }
    
    const redisClient = createClient({ url: REDIS_URI });
    let mongoClient: MongoClient | undefined;

    try {
        // --- Comprehensive Redis Cleanup ---
        await redisClient.connect();
        await logEvent('info', 'Starting comprehensive Redis data cleanup.');
        
        const keyPatterns = [
            'telegram_logs:*', 'project_logs', // Logs
            'telegram_user_state:*', 'telegram_cart:*', // User specific data
            'support:*', 'support_chat:*', // Support system
            'campaign_stop:*', // Campaigns
            // Background process keys
            'background_export_tg_status',
            'background_export_tg_progress',
            'background_export_tg_total',
            'background_export_tg_file_path',
            'background_export_tg_error',
            'background_export_tg_lock',
            // Legacy keys just in case
            'connect:*',
            'confirm:*',
            'user_active_request:*',
            'telegram_user_connections:*'
        ];
        
        let allKeys: string[] = [];
        for (const pattern of keyPatterns) {
            const keys = await redisClient.keys(pattern);
            if(keys.length > 0) {
              allKeys.push(...keys);
            }
        }
        
        const uniqueKeys = [...new Set(allKeys)];
        if (uniqueKeys.length > 0) {
            await redisClient.del(uniqueKeys);
            await logEvent('info', `Redis cleanup: Deleted ${uniqueKeys.length} keys.`);
        } else {
            await logEvent('info', 'Redis cleanup: No project-specific keys found to delete.');
        }

        // --- Comprehensive MongoDB Cleanup ---
        await logEvent('info', 'Starting comprehensive MongoDB data cleanup.');
        mongoClient = new MongoClient(MONGODB_URI);
        await mongoClient.connect();
        const dbName = new URL(MONGODB_URI).pathname.substring(1) || MONGODB_DB_NAME;
        const db = mongoClient.db(dbName);
        
        const collections = await db.listCollections().toArray();
        let droppedCount = 0;

        for (const collectionInfo of collections) {
             if (collectionInfo.name.startsWith('system.')) {
                await logEvent('info', `MongoDB cleanup: Skipping system collection ${collectionInfo.name}.`);
                continue;
             }
             try {
                await db.collection(collectionInfo.name).drop();
                await logEvent('info', `MongoDB cleanup: Dropped collection ${collectionInfo.name}.`);
                droppedCount++;
            } catch (error: any) {
                if (error.codeName !== 'NamespaceNotFound') {
                    throw error;
                }
            }
        }
        await logEvent('success', `MongoDB cleanup completed. Dropped ${droppedCount} collections.`);
        
        await logEvent('success', 'Full project data cleanup completed successfully.');
        return NextResponse.json({ message: `Все данные проекта очищены. MongoDB: ${droppedCount} колл. удалено. Redis: ${uniqueKeys.length} ключ. удалено.` });

    } catch (error: any) {
        await logEvent('error', "Error clearing all project data", { error: error.message, stack: error.stack });
        return NextResponse.json({ error: 'Failed to clear data' }, { status: 500 });
    } finally {
         if (redisClient.isOpen) {
            await redisClient.quit();
        }
        if (mongoClient) {
            await mongoClient.close();
        }
    }
}
