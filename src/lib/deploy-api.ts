
"use server"

import fs from 'fs/promises';
import path from 'path';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';

interface DeployOptions {
    repoUrl: string;
    token: string;
    sourceDir: string;
    tempDir: string;
    onProgress: (log: string) => void;
}

async function selectiveCopyApi(source: string, destination: string, onProgress: (log: string) => void) {
    onProgress(`Начинаю копирование файлов API...`);
    const apiBaseSource = path.join(source, 'src', 'app', 'api');
    const apiBaseDest = path.join(destination, 'src', 'app', 'api');

    const apiDirsToCopy = ['telegram', 'products', 'campaigns'];

    try {
        onProgress(`Создаю базовую структуру директорий API в: ${apiBaseDest}`);
        await fs.mkdir(apiBaseDest, { recursive: true });
        
        for (const dirName of apiDirsToCopy) {
            const sourcePath = path.join(apiBaseSource, dirName);
            const destPath = path.join(apiBaseDest, dirName);
            try {
                await fs.access(sourcePath); // Check if source directory exists
                onProgress(`Копирую директорию API: ${sourcePath} -> ${destPath}`);
                await fs.cp(sourcePath, destPath, { recursive: true });
            } catch (e) {
                onProgress(`ВНИМАНИЕ: Директория ${sourcePath} не найдена, пропуск.`);
            }
        }
        
        onProgress('Копирование API завершено.');
    } catch (error: any) {
         onProgress(`КРИТИЧЕСКАЯ ОШИБКА КОПИРОВАНИЯ API: ${error.message}`);
         throw error;
    }
}


export async function deployApi(options: DeployOptions) {
    const { repoUrl, token, sourceDir, tempDir, onProgress } = options;

    onProgress(`Начинается деплой API в репозиторий: ${repoUrl}`);
    onProgress(`Временная директория: ${tempDir}`);
    
    await fs.rm(tempDir, { recursive: true, force: true });
    await fs.mkdir(tempDir, { recursive: true });
    onProgress('Временная директория API создана.');

    await git.init({ fs: { promises: fs }, dir: tempDir });
    onProgress('Новый API репозиторий инициализирован.');

    await selectiveCopyApi(sourceDir, tempDir, onProgress);

    onProgress("Индексация API файлов...");
    await git.add({ fs: { promises: fs }, dir: tempDir, filepath: '.' });
    onProgress("API файлы проиндексированы.");
    
    onProgress("Создание коммита для API...");
    try {
        await git.commit({
            fs: { promises: fs },
            dir: tempDir,
            message: `Deploy API: ${new Date().toISOString()}`,
            author: { name: 'MooNTooLSTORE Deployer', email: 'deployer@moontool.store' },
        });
        onProgress(`API коммит создан.`);
    } catch (e: any) {
        if (e.name === 'EmptyCommitError') {
             onProgress('Нет изменений для коммита API.');
        } else {
            throw new Error(`Ошибка создания коммита API: ${e.message}`);
        }
    }

    onProgress("Отправка API в ветку 'master'...");
    await git.addRemote({ fs: { promises: fs }, dir: tempDir, remote: 'origin', url: repoUrl });
    const pushResult = await git.push({
        fs: { promises: fs }, http, dir: tempDir, remote: 'origin', ref: 'master', force: true,
        onAuth: () => ({ username: token }),
    });

    if (!pushResult.ok) {
        throw new Error(`Не удалось отправить API: ${pushResult.error || "Неизвестная ошибка"}`);
    }
    onProgress("API успешно отправлен.");
}
