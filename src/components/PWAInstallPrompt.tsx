'use client';

import React from 'react';
import Image from 'next/image';
import { Download, X, Smartphone, Sparkles } from 'lucide-react';
import { usePWA } from '@/context/PWAContext';
import { soundManager } from '@/lib/sound';

export const PWAInstallPrompt: React.FC = () => {
  const { showPrompt, installApp, dismissPrompt } = usePWA();

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-in slide-in-from-bottom duration-300">
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 p-4 shadow-2xl backdrop-blur-xl glow-gold">
        
        <button
          onClick={() => {
            soundManager.playClick();
            dismissPrompt();
          }}
          className="absolute top-2.5 right-2.5 rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          title="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-amber-500/30 bg-slate-900 shadow-md">
            <Image
              src="/logo.png"
              alt="RollDice Logo"
              fill
              className="object-cover"
            />
          </div>

          <div className="pr-6">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs sm:text-sm font-black text-white">Install RollDice App</h4>
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Install mobile app for faster gaming & 1-tap home screen launch!
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => {
              soundManager.playVictory();
              installApp();
            }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 py-2.5 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/25 hover:from-amber-400 hover:to-amber-500 transition scale-100 hover:scale-[1.01]"
          >
            <Download className="h-4 w-4 fill-slate-950" />
            Install App Now
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              dismissPrompt();
            }}
            className="rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs font-extrabold text-slate-400 hover:border-slate-700 hover:text-white transition"
          >
            Not Now
          </button>
        </div>

      </div>
    </div>
  );
};
