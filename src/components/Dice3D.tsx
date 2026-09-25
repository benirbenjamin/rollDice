'use client';

import React from 'react';
import Image from 'next/image';

interface Dice3DProps {
  value: number;
  isRolling: boolean;
  size?: number;
}

export const Dice3D: React.FC<Dice3DProps> = ({ value, isRolling, size = 100 }) => {
  // Map 1-6 value to image source or dynamic pip rendering
  const diceImageSrc = `/dice-${value >= 1 && value <= 6 ? value : 1}.png`;

  return (
    <div className="relative flex items-center justify-center p-4">
      {/* Outer ambient neon glow effect */}
      <div
        className={`absolute rounded-3xl transition-all duration-300 ${
          isRolling
            ? 'h-32 w-32 bg-amber-500/30 blur-2xl animate-pulse'
            : value === 1
            ? 'h-28 w-28 bg-red-500/30 blur-xl'
            : 'h-28 w-28 bg-amber-500/20 blur-xl'
        }`}
      />

      {/* Main Dice Container */}
      <div
        className={`relative flex items-center justify-center overflow-hidden rounded-2xl border-2 bg-gradient-to-br from-slate-900 to-slate-950 p-2 shadow-2xl transition-all duration-300 ${
          isRolling
            ? 'animate-dice-roll border-amber-400 shadow-amber-500/50 scale-105'
            : value === 1
            ? 'border-red-500 shadow-red-500/40'
            : 'border-amber-500/60 shadow-amber-500/30'
        }`}
        style={{ width: size, height: size }}
      >
        <Image
          src={diceImageSrc}
          alt={`Dice Roll ${value}`}
          width={size - 16}
          height={size - 16}
          className={`object-contain transition-transform duration-200 ${
            isRolling ? 'rotate-12 scale-110' : 'rotate-0 scale-100'
          }`}
          priority
        />

        {/* Glossy Overlay Highlight */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent" />
      </div>
    </div>
  );
};
