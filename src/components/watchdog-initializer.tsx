"use client";

import { useEffect } from 'react';
import { initializeWatchdog } from '@/lib/watchdog-core';

export function WatchdogInitializer() {
  useEffect(() => {
    initializeWatchdog();
  }, []);

  return null;
}
