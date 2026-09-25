'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { DepositModal } from '@/components/DepositModal';
import { WithdrawModal } from '@/components/WithdrawModal';
import { PvEGame } from '@/components/PvEGame';
import { PvPGame } from '@/components/PvPGame';
import { soundManager } from '@/lib/sound';
import { Bot, Users, Trophy, ShieldCheck, Zap, HelpCircle, ArrowRight, PlayCircle, Sparkles } from 'lucide-react';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'PVE' | 'PVP'>('PVE');
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  // Fetch logged in user profile
  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
        setIsDemoMode(false);
      } else {
        // Default guest user to demo mode if not logged in
        setUser({
          id: 'demo_guest_' + Date.now(),
          name: 'Demo Guest',
          email: 'demo@rolldice.app',
          wallet_balance: 10000,
          isDemo: true,
        });
        setIsDemoMode(true);
      }
    } catch {
      setUser({
        id: 'demo_guest_' + Date.now(),
        name: 'Demo Guest',
        email: 'demo@rolldice.app',
        wallet_balance: 10000,
        isDemo: true,
      });
      setIsDemoMode(true);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const handleLogout = async () => {
    soundManager.playClick();
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser({
      id: 'demo_guest_' + Date.now(),
      name: 'Demo Guest',
      email: 'demo@rolldice.app',
      wallet_balance: 10000,
      isDemo: true,
    });
    setIsDemoMode(true);
  };

  const handleToggleDemo = () => {
    soundManager.playClick();
    if (isDemoMode) {
      // Switch to Real mode if user is logged in
      fetchUser();
    } else {
      // Enable Demo mode
      setIsDemoMode(true);
      setUser({
        id: 'demo_guest_' + Date.now(),
        name: 'Demo Guest',
        email: 'demo@rolldice.app',
        wallet_balance: 10000,
        isDemo: true,
      });
    }
  };

  const handleBalanceUpdate = (newBalance: number) => {
    setUser((prev: any) => (prev ? { ...prev, wallet_balance: newBalance } : null));
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] font-sans text-slate-100 flex flex-col">
      
      {/* Top Navbar */}
      <Navbar
        user={user}
        onOpenDeposit={() => {
          soundManager.playClick();
          setIsDepositOpen(true);
        }}
        onOpenWithdraw={() => {
          soundManager.playClick();
          setIsWithdrawOpen(true);
        }}
        onLogout={handleLogout}
      />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 space-y-8">
        
        {/* Demo Mode Announcement Pill */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-slate-900 to-amber-500/10 p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-white">
                  {isDemoMode ? '🎮 Practice Demo Mode Active' : '💰 Real Money Wagering Active'}
                </h4>
                {isDemoMode && (
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-400 border border-emerald-500/30">
                    FREE RWF 10,000 DEMO CREDITS
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {isDemoMode
                  ? 'Play risk-free with 10,000 free demo credits. Test roll animations & sounds!'
                  : 'Playing for real money payouts via instant Flutterwave mobile money & bank transfer.'}
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleDemo}
            className={`shrink-0 flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition shadow-md ${
              isDemoMode
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-emerald-500/20 hover:from-emerald-400 hover:to-emerald-500'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500'
            }`}
          >
            <PlayCircle className="h-4 w-4" />
            {isDemoMode ? 'Switch to Real Money Mode' : 'Try Free Demo Mode'}
          </button>
        </div>

        {/* Hero Banner with Custom Logo */}
        <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 sm:p-10 shadow-2xl">
          
          {/* Ambient Glows */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
            
            <div className="max-w-xl space-y-4 text-center md:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-bold text-amber-300">
                <Zap className="h-3.5 w-3.5" />
                <span>Real-Money Wagering & Free Demo</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Roll the Dice. Stake your Claim. <span className="text-gold-gradient">Win Real Cash!</span>
              </h1>

              <p className="text-sm text-slate-400 leading-relaxed">
                Experience high-stakes Pig Dice wagering with automated Flutterwave instant deposits & payouts and provably fair RNG.
              </p>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
                <button
                  onClick={() => {
                    soundManager.playClick();
                    setRulesOpen(!rulesOpen);
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-300 hover:border-slate-700 transition"
                >
                  <HelpCircle className="h-4 w-4 text-amber-400" />
                  How to Play Rules
                </button>

                {!user || user.isDemo ? (
                  <Link
                    href="/login"
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-xs font-extrabold text-slate-950 shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition"
                  >
                    <span>Register / Login</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : null}
              </div>
            </div>

            {/* Custom Brand Logo Artwork */}
            <div className="relative shrink-0 flex items-center justify-center">
              <div className="relative h-44 w-44 sm:h-52 sm:w-52 overflow-hidden rounded-3xl border-2 border-amber-500/30 bg-slate-900 shadow-2xl glow-gold">
                <Image
                  src="/logo.png"
                  alt="RollDice Custom Logo"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>

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
        <div className="flex items-center justify-center">
          <div className="inline-flex rounded-2xl border border-slate-800 bg-slate-900/90 p-1.5 shadow-lg">
            <button
              onClick={() => {
                soundManager.playClick();
                setActiveTab('PVE');
              }}
              className={`flex items-center gap-2 rounded-xl px-5 py-3 text-xs font-extrabold transition ${
                activeTab === 'PVE'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bot className="h-4 w-4" />
              Single Player vs AI
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                setActiveTab('PVP');
              }}
              className={`flex items-center gap-2 rounded-xl px-5 py-3 text-xs font-extrabold transition ${
                activeTab === 'PVP'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="h-4 w-4" />
              Multiplayer PvP Rooms
            </button>
          </div>
        </div>

        {/* Active Mode Arena */}
        <div className="pt-2">
          {activeTab === 'PVE' ? (
            <PvEGame
              user={user}
              onBalanceUpdate={handleBalanceUpdate}
              onOpenDeposit={() => setIsDepositOpen(true)}
            />
          ) : (
            <PvPGame
              user={user}
              onBalanceUpdate={handleBalanceUpdate}
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

      {/* Modals */}
      <DepositModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        onSuccess={handleBalanceUpdate}
        user={user}
      />

      <WithdrawModal
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        onSuccess={handleBalanceUpdate}
        userBalance={user?.wallet_balance || 0}
      />

    </div>
  );
}
