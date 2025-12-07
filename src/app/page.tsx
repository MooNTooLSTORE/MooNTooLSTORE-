
import { redirect } from 'next/navigation';
import fs from 'fs/promises';
import path from 'path';
import { getConfig } from './api/status/route';

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

// Эта страница теперь главный диспетчер.
export default async function Home() {
  const isActivated = await checkActivationStatus();

  if (isActivated) {
    // Если активировано, middleware перехватит и решит, на /login или /dashboard
    redirect('/dashboard');
  } else {
    // Если не активировано, принудительно на страницу активации
    redirect('/activate');
  }
}
