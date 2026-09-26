'use client';

import React from 'react';
import { Smartphone, Download } from 'lucide-react';
import { usePWA } from '@/context/PWAContext';
import { soundManager } from '@/lib/sound';

export const FooterInstallButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isInstallable, isInstalled, installApp } = usePWA();

  // Hide button completely if app is already installed or browser doesn't support PWA install prompt
  if (isInstalled || !isInstallable) return null;

  return (
    <button
      onClick={() => {
        soundManager.playClick();
        installApp();
      }}
      className={`inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 px-3.5 py-1.5 text-xs font-black text-amber-300 hover:border-amber-400 hover:bg-amber-500/30 transition shadow-md ${className}`}
    >
      <Smartphone className="h-4 w-4 text-amber-400 animate-pulse" />
      <span>Install Mobile App</span>
      <Download className="h-3.5 w-3.5 ml-0.5" />
    </button>
  );
};
