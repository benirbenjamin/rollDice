'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Shield,
  TrendingUp,
  Users,
  DollarSign,
  Gamepad2,
  Settings,
  UserCheck,
  Ban,
  PlusCircle,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Check,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  CreditCard,
} from 'lucide-react';
import { soundManager } from '@/lib/sound';

export default function AdminPage() {
  const [data, setData] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [withdrawalsList, setWithdrawalsList] = useState<any[]>([]);
  const [withdrawFilter, setWithdrawFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED' | 'REJECTED'>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Settings form state
  const [rakePercent, setRakePercent] = useState<string>('10');
  const [minStake, setMinStake] = useState<string>('20');
  const [maxStake, setMaxStake] = useState<string>('100000');
  const [minWithdraw, setMinWithdraw] = useState<string>('10');
  const [targetScore, setTargetScore] = useState<string>('100');

  // Balance adjustment modal state
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [adjAmount, setAdjAmount] = useState<string>('');

  // Rejection Modal State
  const [rejectTx, setRejectTx] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const statsRes = await fetch('/api/admin/stats');
      const statsData = await statsRes.json();

      if (!statsRes.ok) {
        throw new Error(statsData.error || 'Failed to load admin stats');
      }

      setData(statsData);

      if (statsData.stats?.settings) {
        setRakePercent(statsData.stats.settings.house_rake_percent || '10');
        setMinStake(statsData.stats.settings.min_stake || '20');
        setMaxStake(statsData.stats.settings.max_stake || '100000');
        setMinWithdraw(statsData.stats.settings.min_withdraw || '10');
        setTargetScore(statsData.stats.settings.target_score || '100');
      }

      // Fetch users list
      const usersRes = await fetch('/api/admin/users');
      const usersData = await usersRes.json();
      if (usersRes.ok) {
        setUsersList(usersData.users || []);
      }

      // Fetch withdrawals list
      const wthRes = await fetch('/api/admin/withdrawals');
      const wthData = await wthRes.json();
      if (wthRes.ok) {
        setWithdrawalsList(wthData.withdrawals || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Update Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    soundManager.playClick();
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          house_rake_percent: rakePercent,
          min_stake: minStake,
          max_stake: maxStake,
          min_withdraw: minWithdraw,
          target_score: targetScore,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to update settings');

      soundManager.playHoldScore();
      setSuccessMsg('Platform settings updated successfully!');
      fetchAdminData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // User Actions: Balance adjust, ban/unban, change role
  const handleUserAction = async (action: string, payload: any) => {
    soundManager.playClick();
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser?.id || payload.userId,
          action,
          ...payload,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'User action failed');

      soundManager.playVictory();
      setSuccessMsg('User record updated!');
      setSelectedUser(null);
      setAdjAmount('');
      fetchAdminData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Handle Withdrawal Approval or Rejection
  const handleWithdrawalAction = async (transactionId: string, action: 'APPROVE' | 'REJECT', reason?: string) => {
    soundManager.playClick();
    setError(null);
    setSuccessMsg(null);
    setActionLoading(true);

    try {
      const res = await fetch('/api/admin/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId,
          action,
          reason,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Withdrawal action failed');

      soundManager.playVictory();
      setSuccessMsg(resData.message || 'Withdrawal action processed successfully!');
      setRejectTx(null);
      setRejectReason('');
      fetchAdminData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-6 w-6 animate-spin text-amber-400" />
          <span className="text-sm font-semibold">Loading Master Admin Dashboard...</span>
        </div>
      </main>
    );
  }

  // Filtered withdrawals
  const filteredWithdrawals = withdrawalsList.filter((w) => {
    if (withdrawFilter === 'ALL') return true;
    if (withdrawFilter === 'PENDING') return w.status === 'PENDING';
    if (withdrawFilter === 'COMPLETED') return w.status === 'COMPLETED' || w.status === 'APPROVED';
    if (withdrawFilter === 'REJECTED') return w.status === 'REJECTED';
    return true;
  });

  const pendingWithdrawalsCount = withdrawalsList.filter((w) => w.status === 'PENDING').length;

  return (
    <main className="min-h-screen bg-slate-950 font-sans text-slate-100 pb-16">
      
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 py-4 px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Return to Platform
            </Link>
            <div className="h-4 w-px bg-slate-800" />
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-400" />
              <h1 className="text-lg font-black text-white">Master Admin Control Panel</h1>
            </div>
          </div>

          <button
            onClick={() => {
              soundManager.playClick();
              fetchAdminData();
            }}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-bold text-slate-300 hover:border-slate-700"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 mt-8 space-y-8">
        
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-950/60 p-4 text-sm text-red-300 border border-red-800/50">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-950/60 p-4 text-sm text-emerald-300 border border-emerald-800/50">
            <Check className="h-5 w-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total House Profit */}
          <div className="rounded-2xl border border-amber-500/30 bg-slate-900/90 p-5 shadow-xl glow-gold">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Total House Rake Revenue</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-extrabold text-amber-400">
              RWF {Number(data?.stats?.houseRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Net platform earnings retained</p>
          </div>

          {/* Card 2: Total Wager Volume */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Total Wager Volume</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-extrabold text-emerald-400">
              RWF {Number(data?.stats?.totalWagerVolume || 0).toLocaleString()}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Cumulative player stakes</p>
          </div>

          {/* Card 3: Pending Withdrawals Alert Card */}
          <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-br from-slate-900 to-amber-950/30 p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300">Pending Withdrawal Requests</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                <ArrowUpRight className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-extrabold text-amber-400">
              {pendingWithdrawalsCount} Pending
            </div>
            <p className="mt-1 text-[11px] text-slate-400">Requires Admin review & approval</p>
          </div>

          {/* Card 4: Total Registered Players */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Registered Players</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-extrabold text-white">
              {data?.stats?.totalUsers || 0}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Active platform user accounts</p>
          </div>

        </div>

        {/* SECTION 1: WITHDRAWAL REQUESTS APPROVAL & REJECTION MANAGEMENT */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-amber-400" />
              <h3 className="text-base font-extrabold text-white">Withdrawal Approval & Payout Queue</h3>
              {pendingWithdrawalsCount > 0 && (
                <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-black text-amber-300 border border-amber-500/30 animate-pulse">
                  {pendingWithdrawalsCount} Pending
                </span>
              )}
            </div>

            {/* Filter controls */}
            <div className="flex items-center gap-1.5">
              {(['ALL', 'PENDING', 'COMPLETED', 'REJECTED'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => {
                    soundManager.playClick();
                    setWithdrawFilter(filter);
                  }}
                  className={`rounded-xl px-3 py-1 text-xs font-bold transition ${
                    withdrawFilter === filter
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {filteredWithdrawals.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No withdrawal requests matching the selected filter ({withdrawFilter}).
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-slate-950 text-slate-400">
                  <tr>
                    <th className="p-3">Player Info</th>
                    <th className="p-3">Payout Method & Account</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Reference / Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredWithdrawals.map((w) => {
                    let meta: any = {};
                    try {
                      meta = JSON.parse(w.metadata || '{}');
                    } catch {}

                    const amount = Number(w.amount || 0);
                    const currency = meta.currency || 'RWF';

                    return (
                      <tr key={w.id} className="hover:bg-slate-800/30">
                        <td className="p-3 font-semibold text-white">
                          <div>{w.user_name || 'Player'}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{w.user_email}</div>
                          <div className="text-[10px] text-emerald-400">Current Bal: RWF {Number(w.user_current_balance || 0).toLocaleString()}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-amber-300">{w.payment_method || meta.account_bank || 'Mobile Money'}</div>
                          <div className="text-[11px] font-mono text-slate-200">{meta.account_number || 'N/A'}</div>
                          {meta.account_name && <div className="text-[10px] text-slate-400">Name: {meta.account_name}</div>}
                        </td>
                        <td className="p-3 font-mono font-black text-amber-400">
                          {currency} {amount.toLocaleString()}
                        </td>
                        <td className="p-3 font-mono text-slate-400 text-[11px]">
                          <div>{w.flutterwave_ref || w.id}</div>
                          <div className="text-[10px] text-slate-500">{new Date(w.created_at).toLocaleString()}</div>
                        </td>
                        <td className="p-3">
                          {w.status === 'PENDING' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-300 border border-amber-500/30 animate-pulse">
                              <Clock className="h-3 w-3" />
                              PENDING
                            </span>
                          ) : w.status === 'COMPLETED' || w.status === 'APPROVED' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="h-3 w-3" />
                              APPROVED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2.5 py-0.5 text-[11px] font-bold text-red-400 border border-red-500/30">
                              <XCircle className="h-3 w-3" />
                              REJECTED
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right space-x-2">
                          {w.status === 'PENDING' ? (
                            <>
                              <button
                                disabled={actionLoading}
                                onClick={() => handleWithdrawalAction(w.id, 'APPROVE')}
                                className="rounded bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-500 shadow-md transition disabled:opacity-50"
                              >
                                Approve Payout
                              </button>
                              <button
                                disabled={actionLoading}
                                onClick={() => setRejectTx(w)}
                                className="rounded bg-red-600/30 border border-red-800/60 px-2.5 py-1 text-[11px] font-bold text-red-300 hover:bg-red-600/50 transition disabled:opacity-50"
                              >
                                Reject & Refund
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-500 italic">No actions needed</span>
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

        {/* SECTION 2: SYSTEM SETTINGS & REVENUE MANAGEMENT */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
            <Settings className="h-5 w-5 text-amber-400" />
            <h3 className="text-base font-extrabold text-white">Dynamic Platform Configurations</h3>
          </div>

          <form onSubmit={handleSaveSettings} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">House Rake % (Edge)</label>
              <input
                type="number"
                min="0"
                max="50"
                value={rakePercent}
                onChange={(e) => setRakePercent(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm font-bold text-amber-400 focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Minimum Stake (RWF)</label>
              <input
                type="number"
                min="1"
                value={minStake}
                onChange={(e) => setMinStake(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm font-bold text-white focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Maximum Stake (RWF)</label>
              <input
                type="number"
                min="1000"
                value={maxStake}
                onChange={(e) => setMaxStake(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm font-bold text-white focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Min Withdrawal (RWF)</label>
              <input
                type="number"
                min="1"
                value={minWithdraw}
                onChange={(e) => setMinWithdraw(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm font-bold text-emerald-400 focus:border-emerald-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Target Winning Score</label>
              <input
                type="number"
                min="50"
                max="500"
                value={targetScore}
                onChange={(e) => setTargetScore(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm font-bold text-white focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2 md:col-span-5 flex justify-end">
              <button
                type="submit"
                className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition"
              >
                Save Configuration Updates
              </button>
            </div>
          </form>
        </div>

        {/* SECTION 3: USER MANAGEMENT & WALLET CONTROLS */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-cyan-400" />
              <h3 className="text-base font-extrabold text-white">Player Accounts & Wallet Controls</h3>
            </div>
            <span className="text-xs text-slate-400">{usersList.length} Total Users</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950 text-slate-400">
                <tr>
                  <th className="p-3">Player Name & Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Wallet Balance</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/30">
                    <td className="p-3 font-semibold text-white">
                      <div>{u.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{u.email}</div>
                    </td>
                    <td className="p-3">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        u.role === 'ADMIN' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-bold text-emerald-400">
                      RWF {Number(u.wallet_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                    </td>
                    <td className="p-3">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        u.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => setSelectedUser(u)}
                        className="rounded bg-emerald-600/30 px-2 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-600/50"
                      >
                        Adjust Wallet
                      </button>
                      <button
                        onClick={() =>
                          handleUserAction('SET_STATUS', {
                            userId: u.id,
                            newStatus: u.status === 'ACTIVE' ? 'BANNED' : 'ACTIVE',
                          })
                        }
                        className={`rounded px-2 py-1 text-[11px] font-bold ${
                          u.status === 'ACTIVE'
                            ? 'bg-red-600/20 text-red-400 hover:bg-red-600/40'
                            : 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40'
                        }`}
                      >
                        {u.status === 'ACTIVE' ? 'Ban' : 'Unban'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Rejection Reason Prompt */}
        {rejectTx && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl border border-red-800/80 bg-slate-900 p-6 shadow-2xl space-y-4">
              <h4 className="text-base font-extrabold text-red-400 flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                Reject Withdrawal Request
              </h4>
              <p className="text-xs text-slate-300">
                Rejecting withdrawal of <strong>RWF {Number(rejectTx.amount || 0).toLocaleString()}</strong> requested by <strong>{rejectTx.user_name}</strong>.
                This will refund the full amount back to the user&apos;s wallet.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Reason for Rejection</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Invalid account details, suspicious activity..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-white placeholder-slate-500 focus:border-red-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  disabled={actionLoading}
                  onClick={() => handleWithdrawalAction(rejectTx.id, 'REJECT', rejectReason)}
                  className="flex-1 rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-50"
                >
                  {actionLoading ? 'Processing...' : 'Confirm Rejection'}
                </button>

                <button
                  onClick={() => {
                    setRejectTx(null);
                    setRejectReason('');
                  }}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Manual Balance Adjustment */}
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
              <h4 className="text-sm font-bold text-white mb-2">
                Adjust Balance for {selectedUser.name}
              </h4>
              <p className="text-xs text-slate-400 mb-4">
                Current: RWF {Number(selectedUser.wallet_balance || 0).toLocaleString()}
              </p>
              <div className="space-y-4">
                <input
                  type="number"
                  placeholder="Enter amount e.g. 5000 or -2000"
                  value={adjAmount}
                  onChange={(e) => setAdjAmount(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm font-bold text-white focus:border-amber-400 focus:outline-none"
                />

                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      handleUserAction('ADJUST_BALANCE', {
                        userId: selectedUser.id,
                        amount: adjAmount,
                      })
                    }
                    className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-500"
                  >
                    Confirm Adjustment
                  </button>

                  <button
                    onClick={() => setSelectedUser(null)}
                    className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs font-semibold text-slate-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
