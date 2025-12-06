import { redirect } from 'next/navigation';
import fs from 'fs/promises';
import path from 'path';
import { Suspense } from 'react';
import LoginPageClient from '@/components/login-page-client';

async function checkActivationStatus(): Promise<boolean> {
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

  // Если система не активирована, не показываем эту страницу, а отправляем на активацию.
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
