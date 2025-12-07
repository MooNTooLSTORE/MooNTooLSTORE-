
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import fs from 'fs/promises';
import path from 'path';
import { deployUi } from '@/lib/deploy-ui';
import { deployApi } from '@/lib/deploy-api';

export async function login(formData: FormData) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);

  const username = formData.get("username");
  const password = formData.get("password");

  if (
    username === (process.env.ADMIN_USERNAME || "admin") &&
    password === (process.env.ADMIN_PASSWORD || "admin")
  ) {
    session.isLoggedIn = true;
    await session.save();
    redirect("/dashboard");
  } else {
    redirect("/login?error=Invalid credentials");
  }
}

export async function logout() {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  session.destroy();
  redirect("/login");
}

async function runDeployProcess(deployType: 'ui' | 'api', repoUrl: string, token: string) {
    const logFilePath = path.join(process.cwd(), 'deploy_logs.txt');
    const tempDir = path.join(process.cwd(), '.deploy_temp', deployType);
    const sourceDir = process.cwd();

    // Clear previous logs
    try {
        await fs.writeFile(logFilePath, `Начинаем деплой ${deployType.toUpperCase()}...\n`);
    } catch (e) {
        // Ignore if file doesn't exist
    }
    
    const onProgress = async (log: string) => {
        try {
            await fs.appendFile(logFilePath, log + '\n');
        } catch (e) {
            console.error("Failed to write to log file:", e);
        }
    };

    try {
        if (deployType === 'ui') {
            await deployUi({ repoUrl, token, sourceDir, tempDir, onProgress });
        } else {
            await deployApi({ repoUrl, token, sourceDir, tempDir, onProgress });
        }
        await onProgress(`SUCCESS:Деплой ${deployType.toUpperCase()} успешно завершен!`);
    } catch (e: any) {
        await onProgress(`КРИТИЧЕСКАЯ ОШИБКА: ${e.message}`);
        console.error(`Deploy Error (${deployType}):`, e);
    } finally {
        await onProgress('Начинаю очистку временной директории...');
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
        await onProgress('Очистка завершена.');
    }
}


export async function deployToGithub(deployType: 'ui' | 'api', repoUrl: string, token: string) {
    if (!repoUrl || !token) {
        return { success: false, error: "Репозиторий и токен должны быть указаны." };
    }
    
    // Don't await this, let it run in the background
    runDeployProcess(deployType, repoUrl, token);

    return { success: true, message: `Процесс деплоя ${deployType.toUpperCase()} запущен в фоновом режиме.` };
}
