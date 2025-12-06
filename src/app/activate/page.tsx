import { redirect } from 'next/navigation';
import fs from 'fs/promises';
import path from 'path';
import ActivatePageClient from '@/components/activate-page-client';

async function checkActivationStatus(): Promise<boolean> {
  // Теперь мы проверяем наличие файла .activated в корне проекта.
  const activationFilePath = path.join(process.cwd(), '.activated');
  try {
    await fs.access(activationFilePath);
    return true; 
  } catch {
    return false;
  }
}

// Теперь это серверный компонент
export default async function ActivatePage() {
  const isActivated = await checkActivationStatus();

  // Если система уже активирована, не показываем эту страницу
  if (isActivated) {
    redirect('/login');
  }

  // Если не активирована, показываем клиентский компонент с формой.
  return <ActivatePageClient />;
}
