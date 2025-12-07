
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

async function selectiveCopyUi(source: string, destination: string, onProgress: (log: string) => void) {
    onProgress(`Начинаю копирование файлов UI...`);
    
    const rootExcluded = [
        '.deploy_temp',
        '.git',
        '.next',
        'node_modules',
        'backups',
        'deploy_logs.txt',
        '.activated'
    ];

    const entries = await fs.readdir(source, { withFileTypes: true });

    for (const entry of entries) {
        const sourcePath = path.join(source, entry.name);
        const destPath = path.join(destination, entry.name);

        if (rootExcluded.includes(entry.name)) {
            onProgress(`-> Пропуск корневой директории/файла: ${entry.name}`);
            continue;
        }

        onProgress(`Копирую: ${entry.name}`);
        await fs.cp(sourcePath, destPath, { 
            recursive: true,
            filter: (src) => {
                const relative = path.relative(source, src);
                if (relative.startsWith('src/app/admin_panel') || relative.startsWith('src/app/api/telegram') || relative.startsWith('src/app/api/products') || relative.startsWith('src/app/api/campaigns')) {
                    onProgress(`-> Пропуск (API/Admin): ${relative}`);
                    return false;
                }
                return true;
            }
        });
    }

    onProgress('Копирование файлов проекта завершено.');
}


export async function deployUi(options: DeployOptions) {
    const { repoUrl, token, sourceDir, tempDir, onProgress } = options;

    onProgress(`Начинается деплой UI в репозиторий: ${repoUrl}`);
    onProgress(`Временная директория: ${tempDir}`);
    
    await fs.rm(tempDir, { recursive: true, force: true });
    await fs.mkdir(tempDir, { recursive: true });
    onProgress('Временная директория UI создана.');

    await git.init({ fs: { promises: fs }, dir: tempDir });
    onProgress('Новый UI репозиторий инициализирован.');

    await selectiveCopyUi(sourceDir, tempDir, onProgress);

    onProgress("Индексация UI файлов...");
    await git.add({ fs: { promises: fs }, dir: tempDir, filepath: '.' });
    onProgress("UI файлы проиндексированы.");
    
    onProgress("Создание коммита для UI...");
    try {
        await git.commit({
            fs: { promises: fs },
            dir: tempDir,
            message: `Deploy UI: ${new Date().toISOString()}`,
            author: { name: 'MooNTooLSTORE Deployer', email: 'deployer@moontool.store' },
        });
        onProgress(`UI коммит создан.`);
    } catch (e: any) {
        if (e.name === 'EmptyCommitError') {
             onProgress('Нет изменений для коммита UI.');
        } else {
            throw new Error(`Ошибка создания коммита UI: ${e.message}`);
        }
    }

    onProgress("Отправка UI в ветку 'master'...");
    await git.addRemote({ fs: { promises: fs }, dir: tempDir, remote: 'origin', url: repoUrl });
    const pushResult = await git.push({
        fs: { promises: fs }, http, dir: tempDir, remote: 'origin', ref: 'master', force: true,
        onAuth: () => ({ username: token }),
    });

    if (!pushResult.ok) {
        throw new Error(`Не удалось отправить UI: ${pushResult.error || "Неизвестная ошибка"}`);
    }
    onProgress("UI успешно отправлен.");
}
