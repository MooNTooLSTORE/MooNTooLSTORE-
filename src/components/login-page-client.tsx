"use client";

import Image from 'next/image';
import { LoginForm } from '@/components/login-form';
import PlexusEffect from '@/components/plexus-effect';
import FirefliesEffect from '@/components/fireflies-effect';
import { useWindowSize } from '@/hooks/use-window-size';

export default function LoginPageClient() {
  const { width = 0 } = useWindowSize();
  
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
      <div className="relative z-20 w-full max-w-sm">
        <div className="p-8 bg-card/80 backdrop-blur-sm rounded-2xl border border-border">
            <LoginForm />
        </div>
      </div>
    </div>
  );
}
