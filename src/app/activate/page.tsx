
"use client";
import Image from 'next/image';
import { ActivationForm } from '@/components/activation-form';
import { useState, useEffect } from 'react';
import PlexusEffect from '@/components/plexus-effect';
import FirefliesEffect from '@/components/fireflies-effect';
import { useWindowSize } from '@/hooks/use-window-size';
import CryptoJS from 'crypto-js';
import { useRouter } from 'next/navigation';

// __INTEGRITY_CHECK_WATCHDOG_PLACEHOLDER__

// Extend the Window interface to include our custom properties
declare global {
    interface Window {
        SESSION_ID?: string;
        ROOT_TOKEN?: string;
        API_ROUTES?: { [key: string]: string };
        __loadedUiBundle__?: string; // These are placeholders for the build server
        __loadedLogicBundle__?: string; // to inject real values.
        FILE_HASHES?: string;
    }
}

function setCookie(name: string, value: string, days: number) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}

export default function ActivatePage() {
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activationStep, setActivationStep] = useState('');
  const { width = 0 } = useWindowSize();
  const router = useRouter();

  const getPlexusConfig = () => {
    const baseConfig = { pointCount: 108, speed: 6, maxDist: 333, triMaxDist: 233, showPoints: false, minDistance: 88 };
    if (width < 480) return { ...baseConfig, pointCount: Math.floor(baseConfig.pointCount / 4), maxDist: baseConfig.maxDist / 2, triMaxDist: baseConfig.triMaxDist / 2 };
    if (width < 768) return { ...baseConfig, pointCount: Math.floor(baseConfig.pointCount / 3), maxDist: baseConfig.maxDist / 1.8, triMaxDist: baseConfig.triMaxDist / 1.8 };
    if (width < 1024) return { ...baseConfig, pointCount: Math.floor(baseConfig.pointCount / 2), maxDist: baseConfig.maxDist / 1.5, triMaxDist: baseConfig.triMaxDist / 1.5 };
    if (width < 1280) return { ...baseConfig, pointCount: Math.floor(baseConfig.pointCount / 1.5), maxDist: baseConfig.maxDist / 1.2, triMaxDist: baseConfig.triMaxDist / 1.2 };
    return baseConfig;
  };
  
  const getFirefliesConfig = () => {
    const baseConfig = { count: 155, speed: 56 };
    if (width < 480) return { ...baseConfig, count: Math.floor(baseConfig.count / 4) };
    if (width < 768) return { ...baseConfig, count: Math.floor(baseConfig.count / 3) };
    if (width < 1024) return { ...baseConfig, count: Math.floor(baseConfig.count / 2) };
    if (width < 1280) return { ...baseConfig, count: Math.floor(baseConfig.count / 1.5) };
    return baseConfig;
  };

  const plexusConfig = getPlexusConfig();
  const firefliesConfig = getFirefliesConfig();

  const handleActivate = async (activation_key: string) => {
    verify_integrity('0fa2fac974f20e433363fd9a98679bb22897d89c2ac9b6028142dd9fcbc7e196', '86f20ba0c732e732862518472c9ecc753cb26bd83cb087e08232a0142de1b075');
    setIsActivating(true);
    setError(null);

    try {
        setActivationStep('Инициализация...');
        await new Promise(resolve => setTimeout(resolve, 500));

        const { SESSION_ID, ROOT_TOKEN, API_ROUTES } = window;

        if (!SESSION_ID || !ROOT_TOKEN || !API_ROUTES || !API_ROUTES.activate) {
            throw new Error("Конфигурация безопасности не найдена. Сборка повреждена.");
        }

        setActivationStep('Генерация подписи запроса...');
        const requestBody = JSON.stringify({ activation_key });
        const hmacSignature = CryptoJS.HmacSHA256(requestBody, ROOT_TOKEN).toString(CryptoJS.enc.Hex);
        await new Promise(resolve => setTimeout(resolve, 500));

        setActivationStep('Запрос на активацию...');
        const activationUrl = new URL(API_ROUTES.activate, window.location.origin).href;
        
        const response = await fetch(activationUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${hmacSignature}`,
                'X-Session-ID': SESSION_ID,
                'X-Logical-Route': 'activate_and_get_logic'
            },
            body: requestBody,
        });

        const responseData = await response.json();
        if (!response.ok || !responseData.success) {
            throw new Error(responseData.message || 'Ошибка активации. Неверный ключ или проблема с сервером.');
        }
        
        const encryptedLogicBundle = responseData.api_logic_bundle;
        if (!encryptedLogicBundle) {
            throw new Error('Не удалось получить основную логику приложения от сервера.');
        }

        setActivationStep('Расшифровка логики приложения...');
        const decryptionKey = CryptoJS.SHA256(ROOT_TOKEN + SESSION_ID).toString(CryptoJS.enc.Hex).substring(0, 32);
        const decryptedBytes = CryptoJS.AES.decrypt(encryptedLogicBundle, decryptionKey);
        const decryptedLogic = decryptedBytes.toString(CryptoJS.enc.Utf8);
        
        if (!decryptedLogic) {
             throw new Error('Ошибка расшифровки основной логики. Бандл поврежден или ключ неверный.');
        }
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setActivationStep('Инициализация приложения...');
        (new Function('window', decryptedLogic))(window);

        await new Promise(resolve => setTimeout(resolve, 500));

        setActivationStep('Активация прошла успешно!');
        
        // Устанавливаем cookie для middleware
        setCookie('is_activated', 'true', 365);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        router.push('/login');

    } catch (e: any) {
        setError(e.message || 'Произошла непредвиденная ошибка.');
        setActivationStep('');
    } finally {
        setIsActivating(false);
    }
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col items-center justify-center">
      <FirefliesEffect count={firefliesConfig.count} speed={firefliesConfig.speed} />
      <PlexusEffect
          pointCount={plexusConfig.pointCount}
          speed={plexusConfig.speed}
          maxDist={plexusConfig.maxDist}
          triMaxDist={plexusConfig.triMaxDist}
          showPoints={plexusConfig.showPoints}
          minDistance={plexusConfig.minDistance}
        />
      
      <div className="absolute inset-0 z-10">
        <Image
          src="https://cdn.jsdelivr.net/gh/MooNbyt/icon-png-jpeg-MOONTOOL@835bcf98f7c541274a18e6abc4aa38aa1b754f12/rpm-hero-header.png"
          alt="Hero Header"
          fill
          style={{ objectFit: 'contain', objectPosition: 'center bottom' }}
          priority
        />
      </div>
      
      <div className="relative z-20 w-full h-full flex flex-col items-center justify-between p-4 md:p-8 lg:p-12">
        <div className="w-full max-w-sm md:max-w-md lg:max-w-lg mt-8">
            <div className="p-4 bg-black/50 backdrop-blur-sm rounded-2xl border border-border/30 text-center">
                <h1 className="text-5xl font-bold text-primary animate-neon-glow tracking-widest">MooNTooL</h1>
            </div>
        </div>

        <div className="w-full max-w-sm">
          <div className="p-8 bg-card/80 backdrop-blur-sm rounded-2xl border border-border">
            <ActivationForm 
                onActivate={handleActivate}
                isActivating={isActivating}
                error={error}
                activationStep={activationStep}
              />
          </div>
        </div>
      </div>

      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[150vw] h-[100vh] bg-[radial-gradient(ellipse_at_top,_rgba(29,78,216,0.5)_0%,_rgba(29,78,216,0)_70%)] animate-[flicker_8s_infinite] z-30 pointer-events-none"
        style={{ 
          clipPath: 'polygon(30% 0, 70% 0, 80% 100%, 20% 100%)',
          animationName: 'flicker' 
        }}
      />
    </div>
  );
}
