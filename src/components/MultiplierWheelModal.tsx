'use client';

import React, { useState, useRef } from 'react';
import { Sparkles, Trophy, RotateCcw, Flame, Zap, HelpCircle } from 'lucide-react';
import { soundManager } from '@/lib/sound';
import confetti from 'canvas-confetti';

interface SpinWheelModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  basePayout: number;
  isDemo?: boolean;
  onBalanceUpdate: (newBalance: number) => void;
}

const WHEEL_SECTORS = [
  { label: '0x 😭', multiplier: 0, color: '#ef4444' },
  { label: '0.5x ⚡', multiplier: 0.5, color: '#f97316' },
  { label: '1.0x 🎯', multiplier: 1, color: '#eab308' },
  { label: '1.5x 🔥', multiplier: 1.5, color: '#84cc16' },
  { label: '2.0x 🚀', multiplier: 2, color: '#22c55e' },
  { label: '3.0x 🌟', multiplier: 3, color: '#06b6d4' },
  { label: '5.0x 💎', multiplier: 5, color: '#3b82f6' },
  { label: '10x 🔮', multiplier: 10, color: '#8b5cf6' },
  { label: '50x 💥', multiplier: 50, color: '#ec4899' },
  { label: '100x 🔥', multiplier: 100, color: '#f43f5e' },
  { label: '500x 🚀', multiplier: 500, color: '#a855f7' },
  { label: '1000x 👑', multiplier: 1000, color: '#f59e0b' },
];

export const MultiplierWheelModal: React.FC<SpinWheelModalProps> = ({
  isOpen,
  onClose,
  roomId,
  basePayout,
  isDemo = false,
  onBalanceUpdate,
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [spinResult, setSpinResult] = useState<{
    multiplier: number;
    finalPayout: number;
    payoutDifference: number;
    label: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSpin = async () => {
    if (isSpinning || spinResult) return;

    soundManager.playClick();
    setIsSpinning(true);
    setError(null);

    try {
      let outcomeMultiplier = 1;
      let targetTierIndex = 2; // Default 1.0x
      let finalPayout = basePayout;
      let payoutDifference = 0;
      let label = '1.0x';

      if (isDemo) {
        // Local Weighted Probabilities for Demo
        const rand = Math.random() * 100;
        if (rand < 38) { outcomeMultiplier = 0; targetTierIndex = 0; label = '0x (Lose)'; }
        else if (rand < 58) { outcomeMultiplier = 0.5; targetTierIndex = 1; label = '0.5x'; }
        else if (rand < 83) { outcomeMultiplier = 1.0; targetTierIndex = 2; label = '1.0x'; }
        else if (rand < 91.5) { outcomeMultiplier = 1.5; targetTierIndex = 3; label = '1.5x'; }
        else if (rand < 96) { outcomeMultiplier = 2.0; targetTierIndex = 4; label = '2.0x'; }
        else if (rand < 98.5) { outcomeMultiplier = 3.0; targetTierIndex = 5; label = '3.0x'; }
        else if (rand < 99.5) { outcomeMultiplier = 5.0; targetTierIndex = 6; label = '5.0x'; }
        else if (rand < 99.85) { outcomeMultiplier = 10.0; targetTierIndex = 7; label = '10x'; }
        else if (rand < 99.95) { outcomeMultiplier = 50.0; targetTierIndex = 8; label = '50x'; }
        else if (rand < 99.98) { outcomeMultiplier = 100.0; targetTierIndex = 9; label = '100x 🔥'; }
        else if (rand < 99.995) { outcomeMultiplier = 500.0; targetTierIndex = 10; label = '500x 🚀'; }
        else { outcomeMultiplier = 1000.0; targetTierIndex = 11; label = '1000x 👑'; }

        finalPayout = basePayout * outcomeMultiplier;
        payoutDifference = finalPayout - basePayout;
      } else {
        // Real Backend API Call
        const res = await fetch('/api/game/bonus-spin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Spin failed');

        outcomeMultiplier = data.multiplier;
        targetTierIndex = data.tierIndex;
        finalPayout = data.finalPayout;
        payoutDifference = data.payoutDifference;
        label = data.label;
        if (data.newBalance !== undefined) {
          onBalanceUpdate(data.newBalance);
        }
      }

      // Calculate Rotation Angle to land on chosen sector
      // 12 sectors = 30 deg per sector
      const sectorAngle = 360 / WHEEL_SECTORS.length;
      const extraSpins = 360 * 6; // 6 Full rotations
      // Align top pointer (270 deg / -90 deg)
      const targetAngle = extraSpins + (360 - targetTierIndex * sectorAngle) - sectorAngle / 2;

      setRotation(targetAngle);

      // Sound ticker effect during rotation
      const tickerInterval = setInterval(() => {
        soundManager.playClick();
      }, 150);

      setTimeout(() => {
        clearInterval(tickerInterval);
        setIsSpinning(false);
        setSpinResult({
          multiplier: outcomeMultiplier,
          finalPayout,
          payoutDifference,
          label,
        });

        if (outcomeMultiplier >= 1.5) {
          soundManager.playVictory();
          confetti({ particleCount: 300, spread: 120, origin: { y: 0.5 } });
        } else if (outcomeMultiplier === 0) {
          soundManager.playBustOne();
        } else {
          soundManager.playHoldScore();
        }
      }, 4500);

    } catch (err: any) {
      setIsSpinning(false);
      setError(err.message || 'Bonus spin failed');
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border-2 border-amber-400 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 p-5 sm:p-7 text-center shadow-2xl glow-gold">
        
        {/* Header Title */}
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="h-6 w-6 text-amber-400 animate-pulse" />
          <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider">
            BONUS MULTIPLIER WHEEL 🎰
          </h2>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Gamble your base win (RWF {basePayout.toLocaleString()}) to win up to <span className="text-amber-400 font-extrabold">1000x JACKPOT!</span>
        </p>

        {error && (
          <div className="mt-3 rounded-xl bg-red-950/80 p-2.5 text-xs text-red-300 border border-red-800">
            {error}
          </div>
        )}

        {/* Wheel Visual Canvas Container */}
        <div className="relative mx-auto my-6 flex h-64 w-64 sm:h-72 sm:w-72 items-center justify-center">
          
          {/* Top Pointer Indicator */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20">
            <div className="h-6 w-6 rotate-180 border-x-8 border-b-[14px] border-x-transparent border-b-amber-400 filter drop-shadow-[0_2px_8px_rgba(245,158,11,0.8)]" />
          </div>

          {/* SVG Rotating Wheel */}
          <svg
            className="h-full w-full transform transition-transform duration-[4500ms] cubic-bezier(0.15, 0.9, 0.2, 1)"
            style={{ transform: `rotate(${rotation}deg)` }}
            viewBox="0 0 200 200"
          >
            <g transform="translate(100,100)">
              {WHEEL_SECTORS.map((sector, index) => {
                const angle = 360 / WHEEL_SECTORS.length;
                const startAngle = (index * angle * Math.PI) / 180;
                const endAngle = ((index + 1) * angle * Math.PI) / 180;

                const x1 = 95 * Math.cos(startAngle);
                const y1 = 95 * Math.sin(startAngle);
                const x2 = 95 * Math.cos(endAngle);
                const y2 = 95 * Math.sin(endAngle);

                const textAngle = index * angle + angle / 2;
                const textRad = (textAngle * Math.PI) / 180;
                const tx = 62 * Math.cos(textRad);
                const ty = 62 * Math.sin(textRad);

                return (
                  <g key={index}>
                    <path
                      d={`M 0 0 L ${x1} ${y1} A 95 95 0 0 1 ${x2} ${y2} Z`}
                      fill={sector.color}
                      stroke="#0f172a"
                      strokeWidth="1.5"
                    />
                    <text
                      x={tx}
                      y={ty}
                      fill="#ffffff"
                      fontSize="7.5"
                      fontWeight="900"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${textAngle + 90}, ${tx}, ${ty})`}
                      className="select-none font-sans drop-shadow-md"
                    >
                      {sector.label}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Center Hub Badge */}
          <div className="absolute h-14 w-14 rounded-full bg-slate-950 border-4 border-amber-400 flex items-center justify-center shadow-2xl z-10">
            <Flame className="h-7 w-7 text-amber-400 animate-pulse" />
          </div>
        </div>

        {/* Spin Outcome Card */}
        {spinResult ? (
          <div className="space-y-4 animate-in zoom-in-95 duration-300">
            <div className={`rounded-2xl border p-4 shadow-xl ${
              spinResult.multiplier >= 1.5
                ? 'border-emerald-400 bg-emerald-950/60 text-emerald-300'
                : spinResult.multiplier === 0
                ? 'border-red-500 bg-red-950/60 text-red-300'
                : 'border-amber-400 bg-amber-950/60 text-amber-300'
            }`}>
              <div className="text-xs uppercase font-extrabold tracking-widest">
                {spinResult.multiplier >= 1.5 ? '🎉 BIG WINNER!' : spinResult.multiplier === 0 ? '💥 BUSTED!' : '🎯 MULTIPLIER LANDED'}
              </div>
              <div className="text-3xl font-black mt-1">
                {spinResult.label} Multiplier
              </div>
              <div className="text-xl font-bold mt-1 text-white">
                Final Payout: RWF {spinResult.finalPayout.toLocaleString()}
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 py-3.5 text-sm font-black text-slate-950 shadow-lg hover:from-amber-400 hover:to-amber-500 transition"
            >
              Collect Winnings & Continue
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={handleSpin}
              disabled={isSpinning}
              className="w-full rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 py-4 text-base font-black text-slate-950 shadow-xl shadow-amber-500/30 hover:from-amber-400 hover:to-amber-500 transition disabled:opacity-50 scale-100 hover:scale-[1.01]"
            >
              {isSpinning ? 'SPINNING WHEEL...' : `SPIN WHEEL NOW (RWF ${basePayout.toLocaleString()})`}
            </button>

            <button
              onClick={onClose}
              disabled={isSpinning}
              className="w-full text-xs font-bold text-slate-400 hover:text-white py-1 transition"
            >
              Skip & Collect Standard Payout (RWF {basePayout.toLocaleString()})
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
