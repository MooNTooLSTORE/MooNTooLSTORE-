
"use server";
// src/lib/logger.ts
import { createClient } from 'redis';
import { getConfig } from '@/app/api/status/route';

const PROJECT_LOGS_KEY = 'project_logs';
const LOG_LIMIT = 500;

let redisClient: any;

async function getRedisClient() {
    // Reuse existing connection if available
    if (redisClient && redisClient.isOpen) {
        return redisClient;
    }
    try {
        const { REDIS_URI } = await getConfig();
        if (!REDIS_URI) {
            // Fallback to console if Redis is not configured
            return null;
        }
        
        redisClient = createClient({ url: REDIS_URI });
        await redisClient.connect();
        return redisClient;
    } catch (e) {
        console.error("Logger failed to connect to Redis:", e);
        return null;
    }
}

type LogLevel = 'info' | 'warn' | 'error' | 'success';

interface LogData {
    [key: string]: any;
    stack?: string;
}

export async function logEvent(level: LogLevel, message: string, data: LogData = {}) {
  const logEntry = {
    level,
    timestamp: new Date().toISOString(),
    message,
    ...data,
  };
  
  const client = await getRedisClient();

  if (client) {
      try {
          await client.lPush(PROJECT_LOGS_KEY, JSON.stringify(logEntry));
          await client.lTrim(PROJECT_LOGS_KEY, 0, LOG_LIMIT - 1);
      } catch (e) {
          console.error("Failed to write to project log:", e);
          console.error("Original Log Entry:", logEntry); // Log to console as a fallback
      }
  } else {
      // Fallback for environments where Redis is not available (e.g., local dev without Redis)
      const logFunction = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
      logFunction(`[${level.toUpperCase()}] ${message}`, data);
  }
}

// Wrapper for catching and logging errors from API handlers
export async function withErrorLogging<T extends (...args: any[]) => any>(
    handler: T
): Promise<ReturnType<T> | void> {
    try {
        return await handler();
    } catch (error: any) {
        const errorMessage = error.message || "An unknown error occurred";
        const errorStack = error.stack || undefined;
        await logEvent('error', errorMessage, { stack: errorStack, handler: handler.name });
        // Depending on desired behavior, you might want to re-throw or return a standard error response
    }
}
