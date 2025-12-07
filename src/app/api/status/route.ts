
import { MongoClient } from 'mongodb';
import { createClient } from 'redis';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import type { ProductCategory } from '@/types';
import { logEvent } from '@/lib/logger';

const SETTINGS_COLLECTION = 'settings';
const GLOBAL_SETTINGS_ID = 'global_settings'; // Fixed ID for the single settings document

// Default GLOBAL configuration
const defaultConfig = {
  is_activated: false, // Activation flag
  PROJECT_LOGS_TTL_MINUTES: 60,
  TELEGRAM_LOGS_LIMIT: 200,
  TELEGRAM_TOKEN: "",
  TELEGRAM_PROVIDER_TOKEN: "",
  TELEGRAM_PAYMENT_CURRENCY: "RUB",
  TELEGRAM_SHOP_BUTTON_NAME: "Магазин MooNTooL",
  TELEGRAM_CATEGORIES_IMAGE_URL: "",
  TELEGRAM_BOT_LINK: "",
  TELEGRAM_WELCOME_MESSAGE: "🤖 Привет! Я твой магазин от https://t.me/MooNTooLKIT",
  TELEGRAM_WELCOME_IMAGE_URL: "",
  productCategories: [] as ProductCategory[],
  TELEGRAM_CUSTOM_LINKS: [
    { text: "FunPay 1", url: "https://funpay.com/users/14429140/", showInGroups: true },
    { text: "FunPay 2", url: "https://funpay.com/users/15054783/", showInGroups: true },
    { text: "TG ГРУППА", url: "https://t.me/MooNTooLKIT", showInGroups: true },
    { text: "TG ЧАТ", url: "https://t.me/+GMS4gtdMDy43NjAy", showInGroups: true },
    { text: "TG BOT", url: "https://t.me/FunPayXScanBot", showInGroups: true },
  ] as { text: string; url: string; showInGroups: boolean }[],
};

// Environment-level settings that are not saved but used
const environmentConfig = {
  MONGODB_URI: process.env.MONGODB_URI || "",
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || "funpayxscanbot",
  REDIS_URI: process.env.REDIS_URI || "",
};

async function getSettingsDbConnection() {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        throw new Error("MongoDB URI is not configured in environment variables.");
    }
    const client = new MongoClient(mongoUri);
    await client.connect();
    // Use a dedicated DB for settings to keep them separate.
    const dbName = 'funpay_settings';
    return { client, db: client.db(dbName) };
}

export async function getConfig(): Promise<any> {
  let client: MongoClient | undefined;
  
  const finalConfig: any = { 
      ...defaultConfig, 
      ...environmentConfig
  };

  // Determine App URL dynamically if not set in env
  try {
      const requestHeaders = headers();
      const host = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host');
      if (host) {
          finalConfig.NEXT_PUBLIC_APP_URL = `https://${host}`;
      } else if (process.env.NEXT_PUBLIC_APP_URL) {
          finalConfig.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL;
      }
  } catch (e) {
      // This can fail during build time, it's okay.
      if (process.env.NEXT_PUBLIC_APP_URL) {
        finalConfig.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL;
      }
  }
  
  try {
    const { client: connectedClient, db } = await getSettingsDbConnection();
    client = connectedClient;
    const settingsCollection = db.collection(SETTINGS_COLLECTION);
    
    // Fetch the single global settings document.
    const globalSettings = await settingsCollection.findOne({ _id: GLOBAL_SETTINGS_ID });
    if (globalSettings) {
      const { _id, ...dbSettings } = globalSettings;
      Object.assign(finalConfig, dbSettings);
    }
  } catch (error: any) {
    // We log this as a warning because it's expected during initial setup.
    await logEvent('warn', `Could not get config from DB, using default/env values: ${error.message}`);
  } finally {
    if (client) {
      await client.close();
    }
  }

  return finalConfig;
}

export async function updateConfig(newConfig: Partial<any>) {
    const configToSave: any = {};
    const configKeys = Object.keys(defaultConfig);
    // Also allow is_activated to be saved
    configKeys.push('is_activated');

    // Distribute incoming keys into the config object
    for (const key in newConfig) {
        if (configKeys.includes(key)) {
            configToSave[key] = (newConfig as any)[key];
        }
    }
    
    // Type conversion for numeric/boolean fields
    const fieldsToProcess: { [key: string]: any } = {
        PROJECT_LOGS_TTL_MINUTES: Number,
        TELEGRAM_LOGS_LIMIT: Number,
        is_activated: Boolean,
    };

     for (const [key, type] of Object.entries(fieldsToProcess)) {
        if (key in configToSave && configToSave[key] !== undefined) {
            configToSave[key] = type(configToSave[key]);
        }
    }

    let client: MongoClient | undefined;
    try {
        const { client: connectedClient, db } = await getSettingsDbConnection();
        client = connectedClient;
        const settingsCollection = db.collection(SETTINGS_COLLECTION);
        
        // Save all settings to the single global document
        if (Object.keys(configToSave).length > 0) {
            await settingsCollection.updateOne(
                { _id: GLOBAL_SETTINGS_ID }, 
                { $set: configToSave }, 
                { upsert: true }
            );
        }

    } catch (error: any) {
        await logEvent('error', `Failed to update config in DB`, { error: error.message, stack: error.stack });
        throw error;
    } finally {
        if (client) {
            await client.close();
        }
    }
}


export async function GET() {
  const mongoStatus = await checkMongoConnection();
  const redisStatus = await checkRedisConnection();

  return NextResponse.json({
    mongodb: mongoStatus,
    redis: redisStatus,
  });
}

function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}


async function checkMongoConnection(): Promise<{ status: 'connected' | 'error', memory: string | null }> {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) return { status: 'error', memory: null };
  
  let client: MongoClient | undefined;
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const dbName = new URL(MONGODB_URI).pathname.substring(1) || process.env.MONGODB_DB_NAME;
    const db = client.db(dbName);
    await db.command({ ping: 1 });
    const stats = await db.stats();

    return { status: 'connected', memory: formatBytes(stats.storageSize) };
  } catch (error: any) {
    await logEvent('error', `MongoDB connection error: ${error.message}`, { stack: error.stack });
    return { status: 'error', memory: null };
  } finally {
    if (client) await client.close();
  }
}

async function checkRedisConnection(): Promise<{ status: 'connected' | 'error', memory: string | null }> {
  const redisUri = process.env.REDIS_URI;
  if (!redisUri) return { status: 'error', memory: null };
  let client: ReturnType<typeof createClient> | undefined;
  
  try {
    client = createClient({ url: redisUri });
    await client.connect();
    await client.ping();
    const info = await client.info('memory');
    const memoryMatch = info.match(/used_memory_human:([\d.]+.)/);
    const memory = memoryMatch ? `${memoryMatch[1]}B` : null;

    return { status: 'connected', memory: memory };
  } catch (error: any) {
    await logEvent('error', `Redis connection error: ${error.message}`, { stack: error.stack });
    return { status: 'error', memory: null };
  } finally {
    if (client) {
      await client.quit();
    }
  }
}
