
"use server";
import { NextResponse } from 'next/server';
import CryptoJS from 'crypto-js';
import { createDecipheriv } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { logEvent } from '@/lib/logger';
import { updateConfig } from '@/app/api/status/route';
import { storeLogic, markAsLoaded } from '@/app/api/logic-cache';

// Import the token from all possible locations
import { __MT_BUNDLE_TOKEN__ as TOKEN_FROM_CACHE } from '@/lib/sys-garbage/cache-manager';
import { __MT_BUNDLE_TOKEN__ as TOKEN_FROM_DOM } from '@/lib/sys-garbage/dom-helpers';
import { __MT_BUNDLE_TOKEN__ as TOKEN_FROM_EVENTS } from '@/lib/sys-garbage/event-emitter';
import { __MT_BUNDLE_TOKEN__ as TOKEN_FROM_FORMAT } from '@/lib/sys-garbage/format-utils';
import { __MT_BUNDLE_TOKEN__ as TOKEN_FROM_POLYFILLS } from '@/lib/sys-garbage/runtime-polyfills';
import { __MT_BUNDLE_TOKEN__ as TOKEN_FROM_SECURITY } from '@/lib/sys-garbage/security-context';

const __MT_GLOBAL_CONFIG__ = {"masterUrl":"https://9000-firebase-studio-1764249226936.cluster-3gc7bglotjgwuxlqpiut7yyqt4.cloudworkstations.dev","collectionId":"691e8a2a03f6f91d344fdead","activationUrl":"/api/rt/activate_and_get_logic","downloadUrl":"/api/secure-download/get-logic","sessionId":"0be990f07c98ea69945341be657461b2","rootToken":"f51caffa0ee5bb16b615778e8c4dacd47139853836a2c405383cde46cbf58f2c"};
const ACTIVATION_FILE_PATH = path.join(process.cwd(), '.activated');

function decryptBundle(encryptedBundle: string, iv: string, authTag: string): string {
    // Find the injected token from any of the garbage files
    const bundleToken = TOKEN_FROM_CACHE || TOKEN_FROM_DOM || TOKEN_FROM_EVENTS || TOKEN_FROM_FORMAT || TOKEN_FROM_POLYFILLS || TOKEN_FROM_SECURITY;

    if (!bundleToken) {
        throw new Error('__MT_BUNDLE_TOKEN__ is not defined or was not injected.');
    }

    const key = Buffer.from(bundleToken, 'hex');
    const ivBuffer = Buffer.from(iv, 'hex');
    const authTagBuffer = Buffer.from(authTag, 'hex');
    const encryptedData = Buffer.from(encryptedBundle, 'hex');
    
    const decipher = createDecipheriv('aes-256-gcm', key, ivBuffer);
    decipher.setAuthTag(authTagBuffer);
    
    let decrypted = decipher.update(encryptedData, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
}

export async function POST(request: Request) {
    try {
        const { activation_key } = await request.json();
        
        if (!activation_key) {
            return NextResponse.json({ success: false, message: 'Ключ активации не предоставлен.' }, { status: 400 });
        }
        
        const config = __MT_GLOBAL_CONFIG__;
        
        // Find the injected token from any of the garbage files for config check
        const injectedTokenCheck = TOKEN_FROM_CACHE || TOKEN_FROM_DOM || TOKEN_FROM_EVENTS || TOKEN_FROM_FORMAT || TOKEN_FROM_POLYFILLS || TOKEN_FROM_SECURITY;


        if (!config || !injectedTokenCheck || !config.masterUrl || !config.rootToken || !config.sessionId || !config.activationUrl || !config.downloadUrl) {
             const errorContext = { hasConfig: !!config, hasBundleToken: !!injectedTokenCheck, ...config };
             await logEvent('error', 'Incomplete global config for activation', errorContext);
             throw new Error('Критическая ошибка: Глобальная конфигурация не найдена или неполна.');
        }

        // --- Шаг 1: Активация ключа ---
        const activationEndpoint = `${config.masterUrl}${config.activationUrl}`;
        const activationBody: {[key: string]: any} = { activation_key, collectionId: config.collectionId };
        
        // Use only the expected properties for signing
        const bodyToSign: any = { activation_key, collectionId: config.collectionId };
        const orderedBody: any = {};
        Object.keys(bodyToSign).sort().forEach(key => { orderedBody[key] = bodyToSign[key]; });

        const jsonBodyString = JSON.stringify(orderedBody);
        const dataToSign = jsonBodyString + config.sessionId;
        const signature = CryptoJS.HmacSHA256(dataToSign, config.rootToken).toString(CryptoJS.enc.Hex);

        const activationResponse = await fetch(activationEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Root-Token': config.rootToken,
                'X-Signature': signature,
                'X-Session-ID': config.sessionId,
            },
            body: jsonBodyString,
        });

        const activationData = await activationResponse.json();
        if (!activationResponse.ok || !activationData.success || !activationData.token) {
            const errorDetails = activationData.message || `Статус: ${activationResponse.statusText}`;
            await logEvent('error', 'Error from master activation server (Step 1)', { endpoint: activationEndpoint, errorDetails, response: JSON.stringify(activationData) });
            throw new Error(`Ошибка от мастер-сервера: ${errorDetails}`);
        }
        const oneTimeToken = activationData.token;

        // --- Шаг 2: Загрузка основной логики ---
        const downloadEndpoint = `${config.masterUrl}${config.downloadUrl}`;
        const downloadBody = {
          activationToken: oneTimeToken,
          collectionId: config.collectionId,
          rootToken: config.rootToken,
          sessionId: config.sessionId,
        };

        const downloadResponse = await fetch(downloadEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(downloadBody),
        });
        
        if (!downloadResponse.ok) {
           const errorText = await downloadResponse.text();
           await logEvent('error', 'Error from master download server (Step 2)', { endpoint: downloadEndpoint, status: downloadResponse.status, errorText });
           throw new Error(`Ошибка загрузки логики: Сервер ответил со статусом ${downloadResponse.status}.`);
        }

        const downloadData = await downloadResponse.json();
        
        if (!downloadData.success || !downloadData.api_logic_bundle) {
            const errorDetails = downloadData.message || `Статус: ${downloadResponse.statusText}`;
            await logEvent('error', 'Error in master download server response (Step 2)', { endpoint: downloadEndpoint, errorDetails, response: JSON.stringify(downloadData) });
            throw new Error(`Ошибка загрузки логики: ${errorDetails}`);
        }
        
        // --- Шаг 3: Расшифровка и сохранение в память ---
        const { encryptedBundle, iv, authTag } = downloadData.api_logic_bundle;
        const decryptedBundleStr = decryptBundle(encryptedBundle, iv, authTag);

        if (!decryptedBundleStr) {
            throw new Error('Не удалось расшифровать бандл. Ключ неверный или данные повреждены.');
        }
        
        const bundleObject = JSON.parse(decryptedBundleStr);
        if (!bundleObject || !Array.isArray(bundleObject.files)) {
             throw new Error('Расшифрованный бандл имеет неверный формат.');
        }
        
        const logicFiles = bundleObject.files as { path: string, content_base64: string }[];

        for (const file of logicFiles) {
            const content = Buffer.from(file.content_base64, 'base64').toString('utf-8');
            // Используем относительный путь от 'src/app/api/' как ключ
            const moduleName = path.relative('src/app/api', file.path).replace(/\\/g, '/').replace('.ts', '');
            storeLogic(moduleName, content);
            await logEvent('info', `Stored logic for module '${moduleName}' in memory.`);
        }
        
        markAsLoaded(); // Устанавливаем флаг, что логика загружена
        await logEvent('success', 'API bundle decrypted and stored in memory cache.');

        // --- Шаг 4: Установка статуса активации ---

        // 4a. Сохраняем флаг в базу данных (для хостинга)
        await updateConfig({ is_activated: true });
        await logEvent('success', 'System activated successfully in database.', { key: activation_key });

        // 4b. Пытаемся создать файл (для локальной разработки)
        try {
          await fs.writeFile(ACTIVATION_FILE_PATH, new Date().toISOString());
          await logEvent('success', 'System activated successfully on filesystem (local).', { key: activation_key });
        } catch (fileError: any) {
          await logEvent('warn', 'Could not write .activated file (this is expected on read-only filesystems).', { error: fileError.message });
        }


        // Trigger server restart
        setTimeout(() => {
            exec('touch .modified', (err) => {
                if (err) {
                    logEvent('error', "Failed to trigger restart via 'touch'", { error: err.message });
                } else {
                    logEvent('info', "Server restart triggered successfully.");
                }
            });
        }, 1000);

        return NextResponse.json({ 
            success: true, 
            message: "Активация прошла успешно. Сервер перезагружается..."
        });

    } catch (e: any) {
        await logEvent('error', 'Server activation error', { error: e.message, stack: e.stack });
        // Check if error is JSON parse error and show a more specific message
        if (e instanceof SyntaxError && e.message.includes("JSON")) {
            return NextResponse.json({ success: false, message: `Ошибка парсинга ответа от сервера. Возможно, сервер вернул HTML вместо JSON. Проверьте логи вашего мастер-сервера. ${e.message}` }, { status: 500 });
        }
        return NextResponse.json({ success: false, message: e.message || "Неизвестная ошибка на сервере активации." }, { status: 500 });
    }
}
