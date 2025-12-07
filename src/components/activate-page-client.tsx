
"use client";

import { useState } from 'react';
import Image from 'next/image';
import { ActivationForm } from '@/components/activation-form';
import PlexusEffect from '@/components/plexus-effect';
import FirefliesEffect from '@/components/fireflies-effect';
import { useWindowSize } from '@/hooks/use-window-size';
import { useToast } from '@/hooks/use-toast';

export default function ActivatePageClient() {
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activationStep, setActivationStep] = useState('');
  const { width = 0 } = useWindowSize();
  const { toast } = useToast();

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
    setIsActivating(true);
    setError(null);
    setActivationStep('Отправка ключа на сервер...');
    
    try {
        const response = await fetch('/api/system/activate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activation_key })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Не удалось активировать ключ.');
        }

        setActivationStep('Активация успешна! Сервер перезагружается, ожидайте...');
        toast({
            title: "Активация завершена",
            description: "Вы будете автоматически перенаправлены после перезагрузки сервера.",
        });
        
        // Poll for server readiness after activation
        const checkServerStatus = async () => {
          try {
            const res = await fetch('/api/status');
            if (res.ok) {
              // Server is up, redirect
              window.location.href = '/login';
            } else {
              // Server not ready, poll again
              setTimeout(checkServerStatus, 2000);
            }
          } catch (e) {
            // Network error, server likely still down, poll again
            setTimeout(checkServerStatus, 2000);
          }
        };
        
        // Start polling a few seconds after the activation request
        setTimeout(checkServerStatus, 5000);
        
    } catch (e: any) {
        setError(e.message);
        setActivationStep('');
        toast({
            variant: "destructive",
            title: "Ошибка активации",
            description: e.message,
        });
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
          src="/rpm-hero-header.png"
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
