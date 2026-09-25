'use client';

import React, { useState, useEffect } from 'react';

interface Dice3DProps {
  value: number;
  isRolling: boolean;
  size?: number;
}

export const Dice3D: React.FC<Dice3DProps> = ({ value, isRolling, size = 110 }) => {
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });

  // Map 1-6 value to target 3D rotations
  const rotationsForValue: Record<number, { x: number; y: number; z: number }> = {
    1: { x: 0, y: 0, z: 0 },
    6: { x: 180, y: 0, z: 0 },
    2: { x: -90, y: 0, z: 0 },
    5: { x: 90, y: 0, z: 0 },
    3: { x: 0, y: -90, z: 0 },
    4: { x: 0, y: 90, z: 0 },
  };

  useEffect(() => {
    if (isRolling) {
      // Add multiple 360 full tumble spins + random offsets while rolling
      const extraX = 720 + Math.floor(Math.random() * 360);
      const extraY = 1080 + Math.floor(Math.random() * 360);
      const extraZ = 360 + Math.floor(Math.random() * 180);
      setRotation({ x: extraX, y: extraY, z: extraZ });
    } else {
      const safeVal = value >= 1 && value <= 6 ? value : 1;
      setRotation(rotationsForValue[safeVal] || { x: 0, y: 0, z: 0 });
    }
  }, [isRolling, value]);

  const halfSize = size / 2;

  // Render individual 3D face with glowing pips
  const renderFace = (faceNumber: number, faceClass: string, transformStyle: string) => {
    const pipLayouts: Record<number, number[]> = {
      1: [4],
      2: [2, 6],
      3: [2, 4, 6],
      4: [0, 2, 6, 8],
      5: [0, 2, 4, 6, 8],
      6: [0, 2, 3, 5, 6, 8],
    };

    const pips = pipLayouts[faceNumber] || [4];

    return (
      <div
        className={`absolute flex items-center justify-center rounded-2xl border-2 shadow-2xl transition-colors ${faceClass}`}
        style={{
          width: size,
          height: size,
          transform: transformStyle,
          backfaceVisibility: 'visible',
        }}
      >
        {/* Glossy overlay */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-white/20 to-transparent" />
        
        {/* Pip Grid */}
        <div className="grid h-full w-full grid-cols-3 grid-rows-3 p-2 gap-1">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => {
            const hasPip = pips.includes(index);
            return (
              <div key={index} className="flex items-center justify-center">
                {hasPip && (
                  <div
                    className={`h-4 w-4 rounded-full shadow-md transition-all ${
                      faceNumber === 1
                        ? 'bg-red-500 shadow-red-500/90 scale-125 animate-pulse'
                        : faceNumber === 6
                        ? 'bg-emerald-300 shadow-emerald-400/90 scale-110 glow-emerald'
                        : 'bg-amber-300 shadow-amber-400/90 scale-110 glow-gold'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="relative flex items-center justify-center p-6 my-2">
      {/* Ambient Neon Aura */}
      <div
        className={`absolute rounded-full transition-all duration-500 ${
          isRolling
            ? 'h-44 w-44 bg-amber-400/50 blur-3xl animate-pulse'
            : value === 1
            ? 'h-36 w-36 bg-red-500/40 blur-2xl'
            : value === 6
            ? 'h-44 w-44 bg-emerald-400/50 blur-3xl'
            : 'h-36 w-36 bg-amber-500/30 blur-2xl'
        }`}
      />

      {/* 3D Perspective Scene Container */}
      <div
        className="relative"
        style={{
          width: size,
          height: size,
          perspective: '1000px',
        }}
      >
        {/* 3D Rotating Cube */}
        <div
          className="relative h-full w-full transition-transform duration-700 ease-out"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) rotateZ(${rotation.z}deg)`,
          }}
        >
          {/* Face 1: Front */}
          {renderFace(
            1,
            'border-red-500 bg-gradient-to-br from-red-950 via-slate-900 to-black',
            `translateZ(${halfSize}px)`
          )}
          {/* Face 6: Back */}
          {renderFace(
            6,
            'border-emerald-400 bg-gradient-to-br from-emerald-950 via-slate-900 to-black',
            `rotateY(180deg) translateZ(${halfSize}px)`
          )}
          {/* Face 2: Top */}
          {renderFace(
            2,
            'border-amber-400 bg-gradient-to-br from-amber-950 via-slate-900 to-black',
            `rotateX(90deg) translateZ(${halfSize}px)`
          )}
          {/* Face 5: Bottom */}
          {renderFace(
            5,
            'border-cyan-400 bg-gradient-to-br from-cyan-950 via-slate-900 to-black',
            `rotateX(-90deg) translateZ(${halfSize}px)`
          )}
          {/* Face 3: Right */}
          {renderFace(
            3,
            'border-amber-400 bg-gradient-to-br from-amber-950 via-slate-900 to-black',
            `rotateY(90deg) translateZ(${halfSize}px)`
          )}
          {/* Face 4: Left */}
          {renderFace(
            4,
            'border-teal-400 bg-gradient-to-br from-teal-950 via-slate-900 to-black',
            `rotateY(-90deg) translateZ(${halfSize}px)`
          )}
        </div>
      </div>
    </div>
  );
};
