
"use server";
import { NextResponse } from 'next/server';
import { createClient } from 'redis';
import { exec } from 'child_process';
import { logEvent } from '@/lib/logger';
import fs from 'fs/promises';
import path from 'path';

const ACTIVATION_FLAG_PATH = path.join(process.cwd(), '.activated');
const API_BUNDLE_KEY = 'api_logic_bundle';

// Этап 3: Сохранение расшифрованного бандла и финализация активации.
export async function POST(request: Request) {
    let redisClient: any;
    try {
        const { bundle } = await request.json();
        if (!bundle || typeof bundle !== 'string') {
            throw new Error('Неверный формат бандла.');
        }

        // --- Сохранение в Redis (оперативную память сервера) ---
        const { REDIS_URI } = await getConfigFromEnv(); // Используем отдельную функцию, чтобы не зависеть от бандла
        if (!REDIS_URI) {
            throw new Error("Redis не сконфигурирован. Невозможно сохранить бандл в оперативную память.");
        }

        redisClient = createClient({ url: REDIS_URI });
        await redisClient.connect();
        
        // Сохраняем весь бандл как одну строку в Redis.
        // Это и есть "сохранение в оперативную память" на стороне сервера.
        await redisClient.set(API_BUNDLE_KEY, bundle);
        await logEvent('info', `Бандл API успешно сохранен в оперативной памяти (Redis) по ключу: ${API_BUNDLE_KEY}`);

        // --- Финализация активации ---
        // Создаем файл-флаг как "железную" гарантию активации
        await fs.writeFile(ACTIVATION_FLAG_PATH, new Date().toISOString());
        await logEvent('success', 'Система успешно активирована. Логика API в оперативной памяти.');

        // Trigger server restart to apply changes
        // Это необходимо, чтобы сервер при следующем запуске подгрузил логику из Redis.
        setTimeout(() => {
            exec('touch .modified', (err) => {
                if (err) {
                    logEvent('error', "Не удалось инициировать перезагрузку сервера", { error: err });
                } else {
                    logEvent('info', "Инициирована перезагрузка сервера для применения логики из оперативной памяти.");
                }
            });
        }, 1000);

        return NextResponse.json({ success: true, message: "Логика API успешно сохранена в оперативной памяти. Сервер перезагружается..." });

    } catch (error: any) {
        await logEvent('error', 'Ошибка сохранения бандла в оперативную память', { error: error.message, stack: error.stack });
        return NextResponse.json({ success: false, message: error.message || "Неизвестная ошибка сервера." }, { status: 500 });
    } finally {
        if (redisClient?.isOpen) {
            await redisClient.quit();
        }
    }
}

// Вспомогательная функция, чтобы получить URI Redis без зависимости от полной конфигурации
async function getConfigFromEnv() {
    return {
        REDIS_URI: process.env.REDIS_URI || ""
    };
}

    