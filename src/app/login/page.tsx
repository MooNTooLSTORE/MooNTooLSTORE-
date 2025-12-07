import { redirect } from 'next/navigation';
import fs from 'fs/promises';
import path from 'path';
import { Suspense } from 'react';
import LoginPageClient from '@/components/login-page-client';
import { getConfig } from '@/app/api/status/route';

async function checkActivationStatus(): Promise<boolean> {
  // 1. Check for database flag
  try {
    const config = await getConfig();
    if (config.is_activated) {
      return true;
    }
  } catch {
    // Ignore DB errors and proceed to file check
  }

  // 2. Check for local file (for local development)
  const activationFilePath = path.join(process.cwd(), '.activated');
  try {
    await fs.access(activationFilePath);
    return true;
  } catch {
    return false;
  }
}

// Теперь это серверный компонент
export default async function LoginPage() {
  const isActivated = await checkActivationStatus();

  // Если система не активирована, не показываем эту страницу
  if (!isActivated) {
    redirect('/activate');
  }

  // Если активирована, показываем форму входа
  return (
    <Suspense fallback={<div>Загрузка...</div>}>
        <LoginPageClient />
    </Suspense>
  );
}
