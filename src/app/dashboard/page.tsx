'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { DepositModal } from '@/components/DepositModal';
import { WithdrawModal } from '@/components/WithdrawModal';
import { soundManager } from '@/lib/sound';
import { Bot, Users, Trophy, Zap, TrendingUp, ShieldCheck, ArrowRight, Wallet, History, Sparkles, Play } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>({
    totalMatches: 12,
    wins: 8,
    losses: 4,
    winRate: 67,
    totalWinnings: 24500,
    totalWagered: 15000,
    balance: 48600,
  });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const userRes = await fetch('/api/auth/me');
        const userData = await userRes.json();

        if (userRes.ok && userData.user) {
          setUser(userData.user);

          const analyticsRes = await fetch('/api/user/analytics');
          const analyticsData = await analyticsRes.json();

          if (analyticsRes.ok && analyticsData.stats) {
            setStats(analyticsData.stats);
            setTransactions(analyticsData.recentTransactions || []);
            setGames(analyticsData.recentGames || []);
          }
        } else {
          // Demo Mode for Guests
          setUser({
            id: 'demo_guest',
            name: 'Demo Player',
            email: 'demo@rolldice.app',
            wallet_balance: 10000,
            isDemo: true,
          });
        }
      } catch {
        setUser({
          id: 'demo_guest',
          name: 'Demo Player',
          email: 'demo@rolldice.app',
          wallet_balance: 10000,
          isDemo: true,
        });
      }
    };

    loadDashboardData();
  }, []);

  const handleLogout = async () => {
    soundManager.playClick();
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const handleBalanceUpdate = (newBalance: number) => {
    setUser((prev: any) => (prev ? { ...prev, wallet_balance: newBalance } : null));
    setStats((prev: any) => ({ ...prev, balance: newBalance }));
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] font-sans text-slate-100 flex flex-col">
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
        
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-3xl border border-amber-500/30 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 sm:p-8 shadow-2xl">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-0.5 text-xs font-bold text-amber-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Player Dashboard & Game Analytics</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Welcome Back, <span className="text-gold-gradient">{user?.name || 'Player'}</span> 👋
            </h1>
            <p className="text-xs text-slate-400">
              Track your wager metrics, win rates, and jump directly into game matches!
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                soundManager.playClick();
                setIsDepositOpen(true);
              }}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-3 text-xs font-black text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-emerald-500 transition"
            >
              <Wallet className="h-4 w-4" />
              Deposit Funds
            </button>
          </div>
        </div>

        {/* Game Mode Launch Cards */}
        <div>
          <h3 className="text-sm font-extrabold text-amber-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4" /> Select Game Arena Mode
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* PvE AI Bot Card */}
            <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-slate-900 via-slate-950 to-amber-950/40 p-6 shadow-2xl hover:border-amber-400 transition group">
              <div className="flex items-start justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-lg glow-gold">
                  <Bot className="h-8 w-8" />
                </div>
                <span className="rounded-full bg-amber-500/20 px-3 py-1 text-[11px] font-black text-amber-300 border border-amber-500/30">
                  INSTANT PLAY
                </span>
              </div>

              <h4 className="mt-4 text-xl font-black text-white">Single Player vs AI Bot</h4>
              <p className="mt-1 text-xs text-slate-400">
                Battle the RollDice AI system bot in real-time. First to 100 points takes the wagering pot!
              </p>

              <div className="mt-6 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-bold">Stakes: From RWF 20 (Custom Allowed)</span>
                <Link
                  href="/play?mode=pve"
                  onClick={() => soundManager.playClick()}
                  className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/30 group-hover:scale-105 transition"
                >
                  <Play className="h-4 w-4 fill-slate-950" />
                  Play vs AI Bot
                </Link>
              </div>
            </div>

            {/* PvP Multiplayer Card */}
            <div className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950/40 p-6 shadow-2xl hover:border-cyan-400 transition group">
              <div className="flex items-start justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-lg glow-emerald">
                  <Users className="h-8 w-8" />
                </div>
                <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-[11px] font-black text-cyan-300 border border-cyan-500/30">
                  LIVE MULTIPLAYER
                </span>
              </div>

              <h4 className="mt-4 text-xl font-black text-white">Multiplayer PvP Rooms</h4>
              <p className="mt-1 text-xs text-slate-400">
                Create custom wagering rooms or join active match rooms to play live against real human players.
              </p>

              <div className="mt-6 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-bold">Live Room Lobby</span>
                <Link
                  href="/play?mode=pvp"
                  onClick={() => soundManager.playClick()}
                  className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 px-6 py-3 text-xs font-black text-slate-950 shadow-lg shadow-cyan-500/30 group-hover:scale-105 transition"
                >
                  <Play className="h-4 w-4 fill-slate-950" />
                  Enter PvP Lobby
                </Link>
              </div>
            </div>

          </div>
        </div>

        {/* Financial & Game Analytics Metrics */}
        <div>
          <h3 className="text-sm font-extrabold text-amber-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Performance Analytics
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
              <span className="text-xs font-bold text-slate-400">Wallet Balance</span>
              <div className="mt-2 text-2xl font-black text-emerald-400">
                RWF {Number(user?.wallet_balance || 0).toLocaleString()}
              </div>
              <span className="mt-1 block text-[10px] text-slate-500">Available for wagering</span>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
              <span className="text-xs font-bold text-slate-400">Win Rate</span>
              <div className="mt-2 text-2xl font-black text-amber-400">
                {stats.winRate}%
              </div>
              <span className="mt-1 block text-[10px] text-slate-500">{stats.wins} W / {stats.losses} L</span>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
              <span className="text-xs font-bold text-slate-400">Total Winnings</span>
              <div className="mt-2 text-2xl font-black text-cyan-400">
                RWF {Number(stats.totalWinnings || 0).toLocaleString()}
              </div>
              <span className="mt-1 block text-[10px] text-slate-500">Cumulative Match Wins</span>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
              <span className="text-xs font-bold text-slate-400">Matches Played</span>
              <div className="mt-2 text-2xl font-black text-white">
                {stats.totalMatches}
              </div>
              <span className="mt-1 block text-[10px] text-slate-500">Total wagered rounds</span>
            </div>

          </div>
        </div>

        {/* Recent Transactions & Match History */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Match Logs */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl space-y-4">
            <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-400" />
              Recent Match History
            </h4>

            {games.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No matches recorded yet. Launch a match above!</p>
            ) : (
              <div className="space-y-2.5">
                {games.map((g, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs">
                    <div>
                      <span className="font-bold text-white">
                        {g.winner_id === user?.id ? '🏆 VICTORY' : '💥 DEFEAT'}
                      </span>
                      <p className="text-[10px] text-slate-400">Room #{g.id.substring(0, 8)}</p>
                    </div>
                    <span className={`font-black ${g.winner_id === user?.id ? 'text-emerald-400' : 'text-red-400'}`}>
                      {g.winner_id === user?.id ? `+RWF ${(Number(g.stake) * 1.8).toLocaleString()}` : `-RWF ${Number(g.stake).toLocaleString()}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Transactions */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl space-y-4">
            <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
              <History className="h-4 w-4 text-emerald-400" />
              Recent Transactions
            </h4>

            {transactions.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No deposit or withdrawal history yet.</p>
            ) : (
              <div className="space-y-2.5">
                {transactions.map((tx, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs">
                    <div>
                      <span className="font-bold text-white">{tx.type}</span>
                      <p className="text-[10px] text-slate-400">{new Date(tx.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className="font-black text-emerald-400">
                      RWF {Number(tx.amount).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </main>

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
