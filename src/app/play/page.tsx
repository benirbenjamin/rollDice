'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PvEGame } from '@/components/PvEGame';
import { PvPGame } from '@/components/PvPGame';
import { soundManager } from '@/lib/sound';
import { Bot, Users, ArrowLeft, ShieldCheck, Sparkles } from 'lucide-react';

function PlayArenaContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialMode = searchParams.get('mode') === 'pvp' ? 'PVP' : 'PVE';

  const [activeTab, setActiveTab] = useState<'PVE' | 'PVP'>(initialMode);
  const [user, setUser] = useState<any>(null);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (res.ok && data.user) {
          setUser(data.user);
        } else {
          setUser({
            id: 'demo_guest_' + Date.now(),
            name: 'Demo Guest',
            email: 'demo@rolldice.app',
            wallet_balance: 10000,
            isDemo: true,
          });
        }
      } catch {
        setUser({
          id: 'demo_guest_' + Date.now(),
          name: 'Demo Guest',
          email: 'demo@rolldice.app',
          wallet_balance: 10000,
          isDemo: true,
        });
      }
    };

    fetchUser();
  }, []);

  const handleLogout = async () => {
    soundManager.playClick();
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const handleBalanceUpdate = (newBalance: number) => {
    setUser((prev: any) => (prev ? { ...prev, wallet_balance: newBalance } : null));
  };

  return (
    <div className="w-full flex flex-col">
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        
        {/* Top Arena Navigation Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl">
          
          <button
            onClick={() => {
              soundManager.playClick();
              router.push('/dashboard');
            }}
            className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-bold text-slate-300 hover:border-slate-700 transition"
          >
            <ArrowLeft className="h-4 w-4 text-amber-400" />
            <span>Back to Dashboard</span>
          </button>

          {/* Mode Switcher Tabs */}
          <div className="flex w-full sm:w-auto rounded-xl border border-slate-800 bg-slate-950 p-1 shadow-inner">
            <button
              onClick={() => {
                soundManager.playClick();
                setActiveTab('PVE');
              }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg px-3 sm:px-4 py-2 text-[11px] sm:text-xs font-extrabold transition ${
                activeTab === 'PVE'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
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
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg px-3 sm:px-4 py-2 text-[11px] sm:text-xs font-extrabold transition ${
                activeTab === 'PVP'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="h-4 w-4 shrink-0" />
              <span>Multiplayer PvP Rooms</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
            <ShieldCheck className="h-4 w-4" />
            <span>Provably Fair Casino RNG</span>
          </div>

        </div>

        {/* Active Game Component */}
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
    </div>
  );
}

export default function PlayArenaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0b0f19] text-white flex items-center justify-center">Loading Game Arena...</div>}>
      <PlayArenaContent />
    </Suspense>
  );
}
