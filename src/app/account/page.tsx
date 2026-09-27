'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Wallet,
  ArrowUpRight,
  Plus,
  History,
  ShieldCheck,
  TrendingUp,
  Gamepad2,
  Trophy,
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Building2,
  AlertCircle,
  UserCheck,
  CreditCard,
  ArrowDownLeft,
} from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { soundManager } from '@/lib/sound';

export default function AccountPage() {
  const router = useRouter();
  const { user: authUser, loading: authLoading } = useUser();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'DEPOSITS' | 'WITHDRAWALS' | 'TRANSACTIONS' | 'GAMES'>('DEPOSITS');

  const fetchAccountData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/analytics');
      const resData = await res.json();
      if (res.ok) {
        setData(resData);
      }
    } catch (err) {
      console.error('Failed to load account details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !authUser) {
      router.replace('/login');
      return;
    }
    if (authUser) {
      fetchAccountData();
    }
  }, [authUser, authLoading, router]);

  if (authLoading || (loading && !data)) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-950 text-slate-300">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-6 w-6 animate-spin text-amber-400" />
          <span className="text-sm font-semibold">Loading Account & Wallet...</span>
        </div>
      </div>
    );
  }

  const user = data?.user || authUser;
  const stats = data?.stats || {};
  const transactions: any[] = data?.recentTransactions || [];
  const games: any[] = data?.recentGames || [];

  // Categorize transaction types
  const deposits = transactions.filter((t) => t.type === 'DEPOSIT');
  const withdrawals = transactions.filter((t) => t.type === 'WITHDRAWAL');

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-300 border border-amber-500/30 animate-pulse">
            <Clock className="h-3 w-3" />
            Pending Verification
          </span>
        );
      case 'REJECTED':
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2.5 py-0.5 text-[11px] font-bold text-red-400 border border-red-500/30">
            <XCircle className="h-3 w-3" />
            Failed / Cancelled
          </span>
        );
      default:
        return (
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-bold text-slate-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 pb-16">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 space-y-6">
        
        {/* Navigation back bar */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              onClick={() => soundManager.playClick()}
              className="flex items-center gap-1.5 text-xs font-extrabold text-slate-400 hover:text-white transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </div>

          <button
            onClick={() => {
              soundManager.playClick();
              fetchAccountData();
            }}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-300 hover:border-slate-700 hover:text-white transition"
          >
            <RefreshCw className="h-3.5 w-3.5 text-amber-400" />
            Refresh Wallet
          </button>
        </div>

        {/* Profile Header & Balance Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 p-6 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            
            {/* User Profile Info */}
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-inner">
                <UserCheck className="h-8 w-8" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-extrabold text-white">{user?.name}</h1>
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                    VERIFIED PLAYER
                  </span>
                </div>
                <p className="text-xs text-slate-400">{user?.email}</p>

                {/* Last saved withdrawal info badge */}
                {user?.last_withdraw_account && (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-300 font-semibold bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>Saved Payout Account: {user.last_withdraw_method || 'Mobile Money'} ({user.last_withdraw_account})</span>
                  </div>
                )}
              </div>
            </div>

            {/* Wallet Balance Display */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Wallet Balance</span>
                <div className="text-2xl font-black text-emerald-400">
                  RWF {Number(stats.balance || user?.wallet_balance || 0).toLocaleString('en-US')}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Stats Grid Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-bold">Total Deposited</span>
              <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-lg font-black text-emerald-400">
              RWF {Number(stats.totalDeposited || 0).toLocaleString()}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-bold">Total Withdrawn</span>
              <ArrowUpRight className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-lg font-black text-amber-400">
              RWF {Number(stats.totalWithdrawn || 0).toLocaleString()}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-bold">Matches Played</span>
              <Gamepad2 className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="text-lg font-black text-white">
              {stats.totalMatches || 0} ({stats.wins || 0} Wins)
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-bold">Win Rate %</span>
              <Trophy className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-lg font-black text-emerald-400">
              {stats.winRate || 0}%
            </div>
          </div>

        </div>

        {/* History Tabs Section */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl space-y-4">
          
          {/* Tab Selection */}
          <div className="flex items-center border-b border-slate-800 pb-3 gap-2 overflow-x-auto">
            <button
              onClick={() => {
                soundManager.playClick();
                setActiveTab('DEPOSITS');
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'DEPOSITS'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
              Deposit History ({deposits.length})
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                setActiveTab('WITHDRAWALS');
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'WITHDRAWALS'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <ArrowUpRight className="h-4 w-4 text-amber-400" />
              Withdrawal History ({withdrawals.length})
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                setActiveTab('TRANSACTIONS');
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'TRANSACTIONS'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <History className="h-4 w-4 text-cyan-400" />
              All Activity ({transactions.length})
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                setActiveTab('GAMES');
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'GAMES'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Gamepad2 className="h-4 w-4 text-purple-400" />
              Game History ({games.length})
            </button>
          </div>

          {/* TAB 1: DEPOSIT HISTORY */}
          {activeTab === 'DEPOSITS' && (
            <div>
              {deposits.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  <ArrowDownLeft className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                  No deposit history found. Click "Deposit" in top navigation to add funds.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-800 bg-slate-950 text-slate-400">
                      <tr>
                        <th className="p-3">Reference / Date</th>
                        <th className="p-3">Payment Method</th>
                        <th className="p-3">Amount Credited</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {deposits.map((tx) => {
                        let meta: any = {};
                        try {
                          meta = JSON.parse(tx.metadata || '{}');
                        } catch {}

                        return (
                          <tr key={tx.id} className="hover:bg-slate-800/30">
                            <td className="p-3 font-mono text-slate-300">
                              <div className="font-bold text-emerald-300">{tx.flutterwave_ref || tx.id}</div>
                              <div className="text-[10px] text-slate-500">{new Date(tx.created_at).toLocaleString()}</div>
                            </td>
                            <td className="p-3 text-slate-200 font-semibold">
                              {tx.payment_method || 'Flutterwave Mobile Money'}
                            </td>
                            <td className="p-3 font-mono font-black text-emerald-400 text-sm">
                              + RWF {Number(tx.amount).toLocaleString()}
                            </td>
                            <td className="p-3">
                              {renderStatusBadge(tx.status)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: WITHDRAWAL HISTORY */}
          {activeTab === 'WITHDRAWALS' && (
            <div>
              {withdrawals.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  <Building2 className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                  No withdrawal history found. Click "Withdraw" to request payouts.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-800 bg-slate-950 text-slate-400">
                      <tr>
                        <th className="p-3">Reference / Date</th>
                        <th className="p-3">Payout Method & Account</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {withdrawals.map((tx) => {
                        let meta: any = {};
                        try {
                          meta = JSON.parse(tx.metadata || '{}');
                        } catch {}

                        return (
                          <tr key={tx.id} className="hover:bg-slate-800/30">
                            <td className="p-3 font-mono text-slate-300">
                              <div className="font-bold text-amber-300">{tx.flutterwave_ref || tx.id}</div>
                              <div className="text-[10px] text-slate-500">{new Date(tx.created_at).toLocaleString()}</div>
                            </td>
                            <td className="p-3 text-slate-200">
                              <div className="font-semibold">{tx.payment_method || meta.account_bank || 'Mobile Money'}</div>
                              <div className="text-[11px] text-slate-400 font-mono">{meta.account_number || 'N/A'}</div>
                            </td>
                            <td className="p-3 font-mono font-black text-amber-400">
                              RWF {Number(tx.amount).toLocaleString()}
                            </td>
                            <td className="p-3">
                              {renderStatusBadge(tx.status)}
                            </td>
                            <td className="p-3 text-slate-400 text-[11px]">
                              {meta.admin_reason ? (
                                <span className="text-red-400 font-semibold">{meta.admin_reason}</span>
                              ) : (
                                <span>{tx.status === 'PENDING' ? 'Under Review' : 'Processed'}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ALL TRANSACTIONS */}
          {activeTab === 'TRANSACTIONS' && (
            <div>
              {transactions.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No transaction activity logged yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-800 bg-slate-950 text-slate-400">
                      <tr>
                        <th className="p-3">Type</th>
                        <th className="p-3">Reference / ID</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-800/30">
                          <td className="p-3 font-bold text-white">
                            <span className={`rounded px-2 py-0.5 text-[10px] ${
                              tx.type === 'DEPOSIT'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : tx.type === 'WITHDRAWAL'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-cyan-500/20 text-cyan-400'
                            }`}>
                              {tx.type}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-slate-400 text-[11px]">
                            {tx.flutterwave_ref || tx.id}
                          </td>
                          <td className={`p-3 font-mono font-bold ${
                            tx.type === 'DEPOSIT' ? 'text-emerald-400' : 'text-slate-200'
                          }`}>
                            RWF {Number(tx.amount).toLocaleString()}
                          </td>
                          <td className="p-3">
                            {renderStatusBadge(tx.status)}
                          </td>
                          <td className="p-3 text-slate-400 text-[11px]">
                            {new Date(tx.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: GAME HISTORY */}
          {activeTab === 'GAMES' && (
            <div>
              {games.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No completed matches recorded yet. Play games in the Arena!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-800 bg-slate-950 text-slate-400">
                      <tr>
                        <th className="p-3">Mode</th>
                        <th className="p-3">Stake</th>
                        <th className="p-3">Result</th>
                        <th className="p-3">Score</th>
                        <th className="p-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {games.map((g) => {
                        const isWinner = g.winner_id === user?.id;
                        return (
                          <tr key={g.id} className="hover:bg-slate-800/30">
                            <td className="p-3 font-bold text-white uppercase">{g.mode}</td>
                            <td className="p-3 font-mono font-semibold text-slate-300">
                              RWF {Number(g.stake || 0).toLocaleString()}
                            </td>
                            <td className="p-3">
                              {isWinner ? (
                                <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                                  VICTORY
                                </span>
                              ) : (
                                <span className="rounded bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400 border border-red-500/30">
                                  DEFEAT
                                </span>
                              )}
                            </td>
                            <td className="p-3 font-mono text-slate-300">
                              {g.p1_score} - {g.p2_score}
                            </td>
                            <td className="p-3 text-slate-400 text-[11px]">
                              {new Date(g.created_at).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
