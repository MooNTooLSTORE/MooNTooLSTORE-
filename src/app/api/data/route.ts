
import { NextResponse } from 'next/server';
import { createClient } from 'redis';
import { MongoClient, ObjectId } from 'mongodb';
import { getConfig } from '../status/route';

const PRODUCTS_COLLECTION = "products";
const SETTINGS_COLLECTION = 'settings';
const CAMPAIGNS_COLLECTION = "campaigns";


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
        console.error("Error fetching dashboard data:", error);
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
        // --- Targeted Redis Cleanup ---
        await redisClient.connect();
        const keyPatterns = [
            'telegram_logs:*',
            'telegram_user_state:*',
            'connect:*',
            'confirm:*',
            'user_active_request:*',
            'telegram_user_connections:*',
            'telegram_cart:*',
        ];
        
        let allKeys: string[] = [];
        for (const pattern of keyPatterns) {
            const keys = await redisClient.keys(pattern);
            allKeys.push(...keys);
        }

        // Remove duplicates and delete if any keys found
        const uniqueKeys = [...new Set(allKeys)];
        if (uniqueKeys.length > 0) {
            await redisClient.del(uniqueKeys);
        }


        // --- Targeted MongoDB Cleanup ---
        mongoClient = new MongoClient(MONGODB_URI);
        await mongoClient.connect();
        const dbName = new URL(MONGODB_URI).pathname.substring(1) || MONGODB_DB_NAME;
        const db = mongoClient.db(dbName);
        const collectionsToDrop = [PRODUCTS_COLLECTION, SETTINGS_COLLECTION, CAMPAIGNS_COLLECTION];
        
        for (const collectionName of collectionsToDrop) {
            try {
                await db.collection(collectionName).drop();
            } catch (error: any) {
                // Ignore error if collection doesn't exist
                if (error.codeName !== 'NamespaceNotFound') {
                    throw error;
                }
            }
        }

        return NextResponse.json({ message: 'All project-specific data has been cleared from Redis and MongoDB.' });

    } catch (error: any) {
        console.error("Error clearing data:", error);
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
    
