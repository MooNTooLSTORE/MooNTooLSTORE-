
"use server";
import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { createClient } from 'redis';
import { getConfig } from '../../status/route';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { SessionData, sessionOptions } from '@/lib/session';

const BOT_USERS_COLLECTION = "bot_users";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fetchType = searchParams.get('type');
  
  const config = await getConfig();
    
  let mongoClient: MongoClient | undefined;
  try {
    const { MONGODB_URI, MONGODB_DB_NAME } = config;
    if (!MONGODB_URI) throw new Error("MongoDB not configured");
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    const dbName = new URL(MONGODB_URI).pathname.substring(1) || MONGODB_DB_NAME;
    const db = mongoClient.db(dbName);
    const collection = db.collection(BOT_USERS_COLLECTION);
    
    // Handle request for user list
    if (fetchType === 'users') {
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '15', 10);
        const searchQuery = searchParams.get('search') || '';

        const query: any = {};
        if (searchQuery) {
            const isNumeric = /^\d+$/.test(searchQuery);
            if(isNumeric) {
                 query.chatId = parseInt(searchQuery, 10);
            } else {
                query.$or = [
                    { username: { $regex: searchQuery, $options: 'i' } },
                    { firstName: { $regex: searchQuery, $options: 'i' } }
                ];
            }
        }

        const total = await collection.countDocuments(query);
        const users = await collection.find(query)
            .sort({ lastSeen: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray();
        
        return NextResponse.json({
            users: users.map(u => ({...u, _id: u._id.toString()})),
            totalPages: Math.ceil(total / limit),
            currentPage: page,
        });
    }

    // Default: handle request for stats
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalUsers,
      activeUsers,
      blockedUsers,
      newToday,
    ] = await Promise.all([
      collection.countDocuments({}),
      collection.countDocuments({ status: 'active' }),
      collection.countDocuments({ status: 'blocked' }),
      collection.countDocuments({ joinedAt: { $gte: today } }),
    ]);

    return NextResponse.json({
      totalUsers,
      activeUsers,
      blockedUsers,
      newToday,
    });

  } catch (error: any) {
    console.error("Error fetching Telegram stats:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
      if(mongoClient) await mongoClient.close();
  }
}


export async function PUT(request: Request) {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions);
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    let mongoClient: MongoClient | undefined;
    try {
        const { MONGODB_URI, MONGODB_DB_NAME } = await getConfig();
        if (!MONGODB_URI) throw new Error("MongoDB not configured");
        
        const { chatId, status, role } = await request.json();
        if (!chatId || (!status && !role)) {
            return NextResponse.json({ error: 'Необходимы chatId и status или role' }, { status: 400 });
        }
        
        mongoClient = new MongoClient(MONGODB_URI);
        await mongoClient.connect();
        const dbName = new URL(MONGODB_URI).pathname.substring(1) || MONGODB_DB_NAME;
        const db = mongoClient.db(dbName);
        const collection = db.collection(BOT_USERS_COLLECTION);
        
        const updateData: any = {};
        if (status) updateData.status = status;
        if (role) updateData.role = role;

        const result = await collection.updateOne(
            { chatId: Number(chatId) },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Данные пользователя обновлены.' });
        
    } catch (error: any) {
        console.error("Error updating user data:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        if(mongoClient) await mongoClient.close();
    }
}
