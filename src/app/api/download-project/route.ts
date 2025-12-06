import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

async function addFolderToZip(zip: JSZip, folderPath: string, root: string) {
    const files = await fs.promises.readdir(folderPath, { withFileTypes: true });
    
    for (const file of files) {
        const fullPath = path.join(folderPath, file.name);
        const zipPath = path.relative(root, fullPath);

        if (file.isDirectory()) {
             // Исключаем ненужные директории
            if (['.next', 'node_modules', '.deploy_temp', '.git'].includes(file.name)) {
                continue;
            }
            await addFolderToZip(zip, fullPath, root);
        } else {
            const content = await fs.promises.readFile(fullPath);
            zip.file(zipPath, content);
        }
    }
}


export async function GET(request: Request) {
    const projectRoot = process.cwd();
    const zip = new JSZip();

    try {
        await addFolderToZip(zip, projectRoot, projectRoot);
        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
        
        const headers = new Headers();
        headers.append('Content-Type', 'application/zip');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        headers.append('Content-Disposition', `attachment; filename="MooNTooLSTORE-project-${timestamp}.zip"`);

        return new NextResponse(zipBuffer, { status: 200, headers });

    } catch (error: any) {
        console.error("Error creating zip archive:", error);
        return NextResponse.json({ error: 'Failed to create project archive.', details: error.message }, { status: 500 });
    }
}
