
import { redirect } from 'next/navigation';
import fs from 'fs/promises';
import path from 'path';

async function checkActivationStatus(): Promise<boolean> {
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
    redirect('/login');
  } else {
    // Если не активировано, принудительно на страницу активации
    redirect('/activate');
  }
}
