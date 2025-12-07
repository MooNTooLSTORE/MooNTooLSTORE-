import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const file = searchParams.get('file');

    if (!file) {
        return new NextResponse('File not specified', { status: 400 });
    }

    // --- Security Enhancement ---
    // Sanitize the file path to prevent directory traversal
    const safeFile = path.normalize(file).replace(/^(\.\.[\/\\])+/, '');
    
    const allowedDir = path.join(process.cwd(), 'backups');
    const filePath = path.join(allowedDir, safeFile);

    // Check if the resolved path is still within the allowed directory
    if (!filePath.startsWith(allowedDir)) {
        return new NextResponse('Forbidden: Access is denied.', { status: 403 });
    }


    try {
        await fs.access(filePath); // Check if file exists and is accessible
        
        const fileBuffer = await fs.readFile(filePath);
        const headers = new Headers();
        headers.append('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
        headers.append('Content-Type', 'application/json');

        return new NextResponse(fileBuffer, {
            status: 200,
            headers: headers,
        });
    } catch (error) {
        console.error("File download error:", error);
        return new NextResponse('File not found', { status: 404 });
    }
}
