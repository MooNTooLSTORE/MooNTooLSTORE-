
"use server";
import { NextResponse } from 'next/server';
import { createDecipheriv } from 'crypto';
import { logEvent } from '@/lib/logger';
import { getGlobalConfig } from '@/lib/integrity';
import { createClient } from 'redis';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import CryptoJS from 'crypto-js';

// Эта заглушка будет заменена при сборке на секретные токены.


const ACTIVATION_FLAG_PATH = path.join(process.cwd(), '.activated');
const API_BUNDLE_KEY = 'api_logic_bundle';

async function decryptBundle(
    encryptedBundleHex: string,
    keyHex: string,
    ivHex: string,
    authTagHex: string
): Promise<string> {
    try {
        const key = Buffer.from(keyHex, 'hex');
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const encryptedBundle = Buffer.from(encryptedBundleHex, 'hex');

        const decipher = createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedBundle, undefined, 'utf8');
        decrypted += decipher.final('utf8');

        if (!decrypted) {
            throw new Error('Decryption failed: result is empty.');
        }
        
        return decrypted;
    } catch (e: any) {
        console.error("Decryption error:", e);
        throw new Error(`Failed to decrypt bundle: ${e.message}`);
    }
}


// Единый эндпоинт для полного цикла активации
export async function POST(request: Request) {
    let redisClient: any;
    try {
        const { activation_key } = await request.json();
        
        if (!activation_key) {
            throw new Error('Ключ активации не предоставлен.');
        }

        // --- Этап 1: Активация ключа и получение одноразового токена ---
        await logEvent('info', 'Этап 1: Проверка ключа активации...');
        const config = getGlobalConfig();
        if (!config) {
            throw new Error('Критическая ошибка: глобальная конфигурация (__MT_GLOBAL_CONFIG__) не найдена на сервере.');
        }
        const { masterUrl, collectionId, activationUrl, sessionId, rootToken } = config;
        
        const activationEndpoint = `${masterUrl}${activationUrl}`;
        const activationBody = { activation_key, collectionId };
        const orderedBody: any = {};
        Object.keys(activationBody).sort().forEach(key => {
            orderedBody[key] = (activationBody as any)[key];
        });
        const jsonBodyString = JSON.stringify(orderedBody);
        const dataToSign = jsonBodyString + sessionId;
        const signature = CryptoJS.HmacSHA256(dataToSign, rootToken).toString(CryptoJS.enc.Hex);

        const activationResponse = await fetch(activationEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Root-Token': rootToken,
                'X-Session-ID': sessionId,
                'X-Signature': signature,
            },
            body: jsonBodyString,
        });

        const activationData = await activationResponse.json();
        if (!activationResponse.ok || !activationData.success) {
            throw new Error(`Ошибка валидации ключа: ${activationData.message || activationResponse.statusText}`);
        }
        const oneTimeToken = activationData.token;
        await logEvent('info', 'Этап 1: Ключ успешно проверен, получен одноразовый токен.');
        
        // --- Создание флага активации сразу после успешной проверки ключа ---
        await fs.writeFile(ACTIVATION_FLAG_PATH, new Date().toISOString());
        await logEvent('success', 'Файл .activated создан. Система считается активированной.');

        // --- Этап 2: Загрузка зашифрованного бандла ---
        await logEvent('info', 'Этап 2: Загрузка бандла логики...');
        const { downloadUrl } = config;
        
        const downloadEndpoint = `${masterUrl}${downloadUrl}`;
        const downloadBody = { 
            activationToken: oneTimeToken,
            config: config
        };

        const bundleResponse = await fetch(downloadEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(downloadBody),
        });

        const bundleData = await bundleResponse.json();
        if (!bundleResponse.ok || !bundleData.success) {
            throw new Error(`Ошибка загрузки бандла: ${bundleData.message || bundleResponse.statusText}`);
        }
        const { encryptedBundle, iv, authTag } = bundleData.api_logic_bundle;
        await logEvent('info', 'Этап 2: Бандл успешно загружен.');


        // --- Этап 3: Расшифровка и сохранение бандла ---
        await logEvent('info', 'Этап 3: Расшифровка и сохранение логики...');
        const bundleToken = __MT_BUNDLE_TOKEN__; 
        if (!bundleToken) {
            throw new Error('Критическая ошибка: токен для расшифровки бандла (__MT_BUNDLE_TOKEN__) не найден на сервере.');
        }
        const decryptedContent = await decryptBundle(encryptedBundle, bundleToken, iv, authTag);
        
        const { REDIS_URI } = process.env;
        if (!REDIS_URI) {
            throw new Error("Redis не сконфигурирован (REDIS_URI). Невозможно сохранить бандл в оперативную память.");
        }

        redisClient = createClient({ url: REDIS_URI });
        await redisClient.connect();
        
        await redisClient.set(API_BUNDLE_KEY, decryptedContent);
        await logEvent('success', 'Этап 3: Логика API успешно расшифрована и сохранена в оперативной памяти.');
        

        // --- Этап 4: Перезагрузка сервера для применения изменений ---
        setTimeout(() => {
            exec('touch .modified', (err) => {
                if (err) {
                    logEvent('error', "Не удалось инициировать перезагрузку сервера", { error: err });
                } else {
                    logEvent('info', "Инициирована перезагрузка сервера для применения логики из оперативной памяти.");
                }
            });
        }, 1000);

        return NextResponse.json({ 
            success: true, 
            message: "Система успешно активирована. Сервер перезагружается..." 
        });

    } catch (e: any) {
        await logEvent('error', 'Критическая ошибка в процессе активации', { error: e.message, stack: e.stack });
        return NextResponse.json({ success: false, message: e.message || "Неизвестная ошибка на сервере активации." }, { status: 500 });
    } finally {
        if (redisClient?.isOpen) {
            await redisClient.quit();
        }
    }
}
