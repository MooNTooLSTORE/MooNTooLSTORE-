
"use server";
// Этот файл больше не используется, так как логика была объединена в /api/system/activate.
// Оставлен для обратной совместимости, если старый клиент попытается его вызвать.
import { NextResponse } from 'next/server';
import { logEvent } from '@/lib/logger';

export async function POST(request: Request) {
    await logEvent('warn', 'Обращение к устаревшему эндпоинту /api/system/save-bundle', {
        details: 'Этот эндпоинт больше не используется. Вся логика активации теперь в /api/system/activate.'
    });
    return NextResponse.json({ 
        success: false, 
        message: 'Этот API эндпоинт устарел. Пожалуйста, используйте /api/system/activate для полного цикла активации.' 
    }, { status: 410 }); // 410 Gone
}
