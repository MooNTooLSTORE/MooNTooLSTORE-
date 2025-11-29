
"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import fs from 'fs/promises';
import path from 'path';
import { deployUi } from "@/lib/deploy-ui";
import { deployApi } from "@/lib/deploy-api";

verify_integrity('03f742b8ab2324aab96441b60cfbd67a97b38c9e4018a2322041018c6a850430', '308d22fc5d32cc324c7abe4b1af91cca9eb5c9427f784ff38f1b8c6792006751');

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

type DeployType = 'ui' | 'api';

export async function deployToGithub(
  deployType: DeployType,
  repoUrl: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
    const logFilePath = path.join(process.cwd(), 'deploy_logs.txt');

    // Fire-and-forget the deployment process
    (async () => {
        const appendLog = async (log: string) => {
            try {
                await fs.appendFile(logFilePath, log + '\n');
            } catch (e) {
                console.error("Failed to append to log file:", e);
            }
        };

        try {
            if (!repoUrl || !token) {
                throw new Error("URL репозитория и токен обязательны для заполнения.");
            }

            const tempDirName = deployType === 'ui' ? 'ui' : 'api';
            const tempDir = path.join(process.cwd(), '.deploy_temp', tempDirName);
            
            await appendLog(`Начинаем деплой ${deployType.toUpperCase()}...`);
            
            if (deployType === 'ui') {
                await deployUi({
                    repoUrl: repoUrl,
                    token: token,
                    sourceDir: process.cwd(),
                    tempDir: tempDir,
                    onProgress: appendLog,
                });
            } else { // api
                await deployApi({
                    repoUrl: repoUrl,
                    token: token,
                    sourceDir: process.cwd(),
                    tempDir: tempDir,
                    onProgress: appendLog,
                });
            }

            await appendLog(`Деплой ${deployType.toUpperCase()} завершен.`);
            await appendLog(`SUCCESS:Деплой ${deployType.toUpperCase()} успешно завершен!`);
            
        } catch (error: any) {
            const errorMessage = `КРИТИЧЕСКАЯ ОШИБКА: ${error.message}`;
            await appendLog(errorMessage);
            console.error(`[Deploy Error - ${deployType.toUpperCase()}]`, error);
        }
    })();
    
    // Return success immediately to the UI
    return { success: true };
}
