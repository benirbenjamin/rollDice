'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PvEGame } from '@/components/PvEGame';
import { PvPGame } from '@/components/PvPGame';
import { soundManager } from '@/lib/sound';
import { Bot, Users, ShieldCheck, HelpCircle, ArrowRight, PlayCircle, Sparkles, Flame } from 'lucide-react';

import { useUser } from '@/context/UserContext';

export default function Home() {
  const { user, updateBalance, setDemoMode } = useUser();
  const isDemoMode = !!user?.isDemo;
  const [activeTab, setActiveTab] = useState<'PVE' | 'PVP'>('PVE');
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  const handleToggleDemo = () => {
    soundManager.playClick();
    setDemoMode(!isDemoMode);
  };

  return (
    <div className="w-full flex flex-col">
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        
        {/* Mode Selector & Quick Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl">
          
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-white">
                  {isDemoMode ? '🎮 Practice Demo Mode' : '💰 Real Money Wagering'}
                </h4>
                {isDemoMode && (
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-400 border border-emerald-500/30">
                    FREE RWF 10,000 CREDITS
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {isDemoMode
                  ? 'Play risk-free with 10,000 demo credits. 3D Dice physics & sounds active!'
                  : 'Playing for real money payouts via instant Flutterwave mobile money & bank transfer.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                soundManager.playClick();
                setRulesOpen(!rulesOpen);
              }}
              className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs font-bold text-slate-300 hover:border-slate-700 transition"
            >
              <HelpCircle className="h-4 w-4 text-amber-400" />
              <span>Rules</span>
            </button>

            <button
              onClick={handleToggleDemo}
              className={`shrink-0 flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition shadow-md ${
                isDemoMode
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-emerald-500/20 hover:from-emerald-400 hover:to-emerald-500'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500'
              }`}
            >
              <PlayCircle className="h-4 w-4" />
              {isDemoMode ? 'Real Money Mode' : 'Free Demo Mode'}
            </button>

            {(!user || user.isDemo) && (
              <Link
                href="/login"
                className="hidden md:flex items-center gap-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3.5 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition"
              >
                <span>Login</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>

        {/* How to Play Drawer */}
        {rulesOpen && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 text-xs text-slate-300 space-y-3 shadow-xl">
            <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Game Rules & Wagering Mechanics
            </h3>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
              <li>
                <strong className="text-white">Objective:</strong> Be the first player to reach 100 points by accumulating dice rolls.
              </li>
              <li>
                <strong className="text-white">Rolling:</strong> Roll 2 through 6 to add points to your current turn score. Roll a <span className="text-red-400 font-bold">1</span> and you BUST (lose all un-held turn points) and turn passes to opponent.
              </li>
              <li>
                <strong className="text-white">Holding:</strong> Click HOLD to save your current turn score into your permanent total score.
              </li>
              <li>
                <strong className="text-white">Winning:</strong> The first player to reach or exceed the target score wins the match pot!
              </li>
            </ul>
          </div>
        )}

        {/* Mode Selector Tabs */}
        <div className="flex w-full sm:w-auto items-center justify-center">
          <div className="flex w-full sm:w-auto rounded-2xl border border-slate-800 bg-slate-900/90 p-1.5 shadow-lg">
            <button
              onClick={() => {
                soundManager.playClick();
                setActiveTab('PVE');
              }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-6 py-2.5 sm:py-3 text-[11px] sm:text-xs font-extrabold transition ${
                activeTab === 'PVE'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bot className="h-4 w-4 shrink-0" />
              <span>Single Player vs AI</span>
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                setActiveTab('PVP');
              }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-6 py-2.5 sm:py-3 text-[11px] sm:text-xs font-extrabold transition ${
                activeTab === 'PVP'
                  ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="h-4 w-4 shrink-0" />
              <span>Multiplayer PvP Rooms</span>
            </button>
          </div>
        </div>

        {/* Active Game Arena */}
        <div className="pt-1">
          {activeTab === 'PVE' ? (
            <PvEGame
              user={user}
              onBalanceUpdate={updateBalance}
              onOpenDeposit={() => setIsDepositOpen(true)}
            />
          ) : (
            <PvPGame
              user={user}
              onBalanceUpdate={updateBalance}
              onOpenDeposit={() => setIsDepositOpen(true)}
            />
          )}
        </div>

      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400">RollDice</span>
            <span>&copy; 2026. All Rights Reserved.</span>
          </div>
          <p className="text-[11px] text-slate-600">
            Automated Flutterwave Deposit & Withdrawal Gateway &bull; Provably Fair RNG
          </p>
        </div>
      </footer>
    </div>
  );
}
