
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
    
    const excludedDirs = ['.deploy_temp', '.git', 'node_modules'];
    
    try {
        const sourceEntries = await fs.readdir(source, { withFileTypes: true });

        for (const entry of sourceEntries) {
            if (excludedDirs.includes(entry.name)) {
                onProgress(`Пропускаю директорию: ${entry.name}`);
                continue;
            }
            
            const sourcePath = path.join(source, entry.name);
            const destinationPath = path.join(destination, entry.name);
            
            onProgress(`Копирую: ${entry.name}`);
            await fs.cp(sourcePath, destinationPath, { recursive: true });
        }

        onProgress('Копирование файлов проекта завершено.');

    } catch (error: any) {
        onProgress(`КРИТИЧЕСКАЯ ОШИБКА КОПИРОВАНИЯ: ${error.message}`);
        throw error;
    }

    // Принудительно удаляем папку api из временной директории UI
    const apiDirInTemp = path.join(destination, 'src', 'app', 'api');
    try {
        onProgress(`Проверяю и удаляю ${apiDirInTemp}...`);
        await fs.rm(apiDirInTemp, { recursive: true, force: true });
        onProgress('Директория API успешно удалена из сборки UI.');
    } catch (error: any) {
        if (error.code !== 'ENOENT') {
            onProgress(`ERROR: Не удалось удалить директорию API из сборки UI: ${error.message}`);
            throw error;
        }
        onProgress('Директория API не найдена в сборке UI, удаление не требуется.');
    }
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
