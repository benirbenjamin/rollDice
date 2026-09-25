'use client';

import React, { useState } from 'react';
import { X, CreditCard, ShieldCheck, Zap, AlertCircle, Globe } from 'lucide-react';
import { soundManager } from '@/lib/sound';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newBalance: number) => void;
  user: any;
}

export const DepositModal: React.FC<DepositModalProps> = ({ isOpen, onClose, onSuccess, user }) => {
  const [amount, setAmount] = useState<number>(1000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [currency, setCurrency] = useState<string>('RWF');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const quickAmounts = [500, 1000, 2500, 5000, 10000, 50000];
  const currencies = ['RWF', 'NGN', 'USD', 'KES', 'GHS'];

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    soundManager.playClick();
    setError(null);

    const depositVal = customAmount ? Number(customAmount) : amount;

    if (isNaN(depositVal) || depositVal < 100) {
      setError(`Minimum deposit is ${currency} 100`);
      return;
    }

    setLoading(true);

    try {
      // 1. Initiate Deposit with backend
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: depositVal, currency }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to initiate deposit');
      }

      // 2. Complete/Verify deposit
      const verifyRes = await fetch('/api/wallet/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: data.transactionId,
          isSimulated: true,
        }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        throw new Error(verifyData.error || 'Verification failed');
      }

      soundManager.playHoldScore();
      onSuccess(verifyData.newBalance);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Deposit failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Deposit Funds</h3>
              <p className="text-xs text-slate-400">Instant Flutterwave Multi-Currency Payment</p>
            </div>
          </div>

          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-950/60 p-3 text-xs text-red-300 border border-red-800/50">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleDepositSubmit} className="mt-5 space-y-5">
          
          {/* Currency Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-emerald-400" />
              Select Deposit Currency (Main: RWF)
            </label>
            <div className="flex gap-2">
              {currencies.map((curr) => (
                <button
                  key={curr}
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setCurrency(curr);
                  }}
                  className={`flex-1 rounded-xl border py-2 text-xs font-extrabold transition ${
                    currency === curr
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Select Amount ({currency})</label>
            <div className="grid grid-cols-3 gap-2">
              {quickAmounts.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setAmount(val);
                    setCustomAmount('');
                  }}
                  className={`rounded-xl border py-2.5 text-xs font-bold transition ${
                    amount === val && !customAmount
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 glow-emerald'
                      : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {currency} {val.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Amount Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Or Enter Custom Amount</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{currency}</span>
              <input
                type="number"
                min="100"
                placeholder="e.g. 15000"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-14 pr-4 text-sm font-semibold text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Deposit Button */}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-emerald-500 transition disabled:opacity-50"
          >
            {loading ? (
              <span className="animate-pulse">Processing Payment...</span>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Pay {currency} {(customAmount ? Number(customAmount) : amount).toLocaleString()} via Flutterwave
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>256-bit encrypted bank & mobile money processing</span>
          </div>
        </form>
      </div>
    </div>
  );
};
