
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  const logFilePath = path.join(process.cwd(), 'deploy_logs.txt');
  
  try {
    const logs = await fs.readFile(logFilePath, 'utf-8');
    return new NextResponse(logs, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        // Prevent caching of the log file
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error: any) {
    // If the file doesn't exist, it's not a critical error, just means no logs yet.
    if (error.code === 'ENOENT') {
        return new NextResponse('Ожидание начала деплоя...', { status: 200 });
    }
    console.error('Failed to read deploy logs:', error);
    return new NextResponse('Не удалось прочитать файл логов.', { status: 500 });
  }
}
