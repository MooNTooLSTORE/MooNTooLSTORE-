import { NextResponse } from 'next/server';
import { updateConfig, getConfig } from '../status/route';
import { logEvent } from '@/lib/logger';

export async function GET() {
  try {
    const config = await getConfig();
    return NextResponse.json(config);
  } catch (error: any) {
     await logEvent('error', 'Error fetching config', { error: error.message, stack: error.stack });
     return new NextResponse('Error fetching configuration', { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await updateConfig(body);
    return NextResponse.json({ message: 'Configuration updated successfully' });
  } catch (error: any) {
    await logEvent('error', 'Error updating config', { error: error.message, stack: error.stack });
    return new NextResponse('Error updating configuration', { status: 500 });
  }
}
