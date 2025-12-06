
"use server";
import { NextResponse } from 'next/server';
import { logEvent } from '@/lib/logger';
import { getGlobalConfig } from '@/lib/integrity';

// Эта заглушка будет заменена при сборке на секретный токен.


// Этап 2: Загрузка зашифрованного бандла с мастер-сервера.
export async function POST(request: Request) {
    try {
        const { oneTimeToken } = await request.json();
        
        if (!oneTimeToken) {
            return NextResponse.json({ success: false, message: 'Одноразовый токен не предоставлен.' }, { status: 400 });
        }
        
        const config = getGlobalConfig();
        const bundleToken = __MT_BUNDLE_TOKEN__ || "development_dummy_secret_key_32b";
        const { masterUrl, downloadUrl } = config;

        if (!masterUrl || !downloadUrl || !bundleToken) {
             const errorContext = { masterUrl, downloadUrl, bundleToken: !!bundleToken };
             await logEvent('error', 'Критическая ошибка: Глобальная конфигурация неполна для скачивания бандла.', errorContext);
             throw new Error('Критическая ошибка: Глобальная конфигурация неполна.');
        }

        const endpoint = `${masterUrl}${downloadUrl}`;
        
        const masterRequestBody = { 
            activationToken: oneTimeToken,
            bundleToken: bundleToken,
            config: config
        };

        const masterResponse = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(masterRequestBody),
        });

        const responseData = await masterResponse.json();
        
        if (!masterResponse.ok || !responseData.success) {
            const errorDetails = responseData.message || `Статус: ${masterResponse.statusText}`;
            await logEvent('error', 'Ошибка от мастер-сервера (этап 2)', { endpoint, errorDetails, response: JSON.stringify(responseData) });
            throw new Error(`Ошибка от мастер-сервера: ${errorDetails}`);
        }
        
        // Успешно получили зашифрованный бандл, возвращаем его клиенту как есть.
        return NextResponse.json({ 
            success: true, 
            message: "Бандл получен.",
            api_logic_bundle: responseData.api_logic_bundle
        });

    } catch (e: any) {
        await logEvent('error', 'Ошибка сервера на этапе 2 активации', { error: e.message, stack: e.stack });
        return NextResponse.json({ success: false, message: e.message || "Неизвестная ошибка на сервере при скачивании бандла." }, { status: 500 });
    }
}

    