'use client';

import React, { useState, useEffect } from 'react';

interface Dice3DProps {
  value: number;
  isRolling: boolean;
  size?: number;
}

export const Dice3D: React.FC<Dice3DProps> = ({ value, isRolling, size = 120 }) => {
  const [displayVal, setDisplayVal] = useState<number>(value);

  // Rapidly cycle dice faces (1-6) while rolling to simulate realistic 3D tumbling!
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRolling) {
      interval = setInterval(() => {
        setDisplayVal(Math.floor(Math.random() * 6) + 1);
      }, 70);
    } else {
      setDisplayVal(value >= 1 && value <= 6 ? value : 1);
    }
    return () => clearInterval(interval);
  }, [isRolling, value]);

  const safeVal = displayVal >= 1 && displayVal <= 6 ? displayVal : 1;

  // Pip positions for 1 to 6
  // Grid 3x3 positions: 0 (top-left), 1 (top-mid), 2 (top-right),
  // 3 (mid-left), 4 (center), 5 (mid-right),
  // 6 (bot-left), 7 (bot-mid), 8 (bot-right)
  const pipLayouts: Record<number, number[]> = {
    1: [4],
    2: [2, 6],
    3: [2, 4, 6],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };

  const currentPips = pipLayouts[safeVal] || [4];

  return (
    <div className="relative flex items-center justify-center p-3">
      {/* Dynamic Ambient Neon Aura */}
      <div
        className={`absolute rounded-full transition-all duration-300 ${
          isRolling
            ? 'h-40 w-40 bg-amber-400/50 blur-3xl animate-pulse'
            : safeVal === 1
            ? 'h-36 w-36 bg-red-500/40 blur-2xl'
            : safeVal === 6
            ? 'h-40 w-40 bg-emerald-400/50 blur-3xl'
            : 'h-36 w-36 bg-amber-500/30 blur-2xl'
        }`}
      />

      {/* Main 3D Dice Face Container */}
      <div
        className={`relative flex items-center justify-center rounded-3xl border-4 p-3.5 shadow-2xl transition-all duration-150 ${
          isRolling
            ? 'animate-spin border-amber-300 bg-gradient-to-br from-amber-900 via-slate-900 to-black shadow-amber-400/80 scale-110 rotate-12'
            : safeVal === 1
            ? 'border-red-500 bg-gradient-to-br from-red-950 via-slate-950 to-black shadow-red-500/60 scale-100'
            : safeVal === 6
            ? 'border-emerald-400 bg-gradient-to-br from-slate-900 via-emerald-950 to-black shadow-emerald-400/70 scale-105'
            : 'border-amber-400/90 bg-gradient-to-br from-slate-900 via-slate-950 to-black shadow-amber-500/40 scale-100'
        }`}
        style={{ width: size, height: size }}
      >
        {/* Glossy Diagonal Shine Glass Layer */}
        <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-tr from-transparent via-white/15 to-transparent" />

        {/* Corner Bevel Highlights for 3D Depth */}
        <div className="pointer-events-none absolute top-1 left-1.5 right-1.5 h-1 rounded-t-full bg-white/25" />

        {/* 3x3 Pip Grid */}
        <div className="grid h-full w-full grid-cols-3 grid-rows-3 p-1.5 gap-1.5">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => {
            const hasPip = currentPips.includes(index);
            return (
              <div key={index} className="flex items-center justify-center">
                {hasPip && (
                  <div
                    className={`h-4.5 w-4.5 rounded-full transition-all duration-150 ${
                      safeVal === 1
                        ? 'bg-red-500 shadow-lg shadow-red-500/90 scale-125'
                        : safeVal === 6
                        ? 'bg-emerald-300 shadow-lg shadow-emerald-400/90 scale-110 glow-emerald'
                        : 'bg-amber-300 shadow-lg shadow-amber-400/90 scale-110 glow-gold'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
