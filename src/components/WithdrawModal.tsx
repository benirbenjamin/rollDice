'use client';

import React, { useState, useEffect } from 'react';
import { X, Building2, ShieldCheck, Zap, AlertCircle, Globe } from 'lucide-react';
import { soundManager } from '@/lib/sound';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newBalance: number) => void;
  userBalance: number;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({ isOpen, onClose, onSuccess, userBalance }) => {
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<string>('RWF');
  const [bankCode, setBankCode] = useState<string>('RWF_MTN');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');
  const [minWithdraw, setMinWithdraw] = useState<number>(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/wallet/withdraw')
        .then((res) => res.json())
        .then((data) => {
          if (data.minWithdraw !== undefined) {
            setMinWithdraw(Number(data.minWithdraw));
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currencies = ['RWF', 'NGN', 'USD', 'KES', 'GHS'];

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    soundManager.playClick();
    setError(null);

    const withdrawVal = Number(amount);

    if (isNaN(withdrawVal) || withdrawVal < minWithdraw) {
      setError(`Minimum withdrawal is ${currency} ${minWithdraw.toLocaleString()}`);
      return;
    }

    if (withdrawVal > userBalance) {
      setError(`Insufficient balance. Maximum available: ${currency} ${userBalance.toLocaleString()}`);
      return;
    }

    if (!accountNumber || accountNumber.length < 8) {
      setError('Please enter a valid account or mobile money number');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: withdrawVal,
          currency,
          account_bank: bankCode,
          account_number: accountNumber,
          account_name: accountName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Withdrawal failed');
      }

      soundManager.playHoldScore();
      onSuccess(data.newBalance);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Withdrawal request failed');
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
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Withdraw Earnings</h3>
              <p className="text-xs text-slate-400">Available Balance: {currency} {userBalance.toLocaleString()}</p>
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

        <form onSubmit={handleWithdrawSubmit} className="mt-5 space-y-4">
          
          {/* Currency Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-amber-400" />
              Payout Currency (Main: RWF)
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
                      ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Withdrawal Amount ({currency})</span>
              <span className="text-[10px] text-amber-400 font-bold">Min {currency} {minWithdraw.toLocaleString()}</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{currency}</span>
              <input
                type="number"
                min={minWithdraw}
                placeholder={`Min ${minWithdraw} ${currency}...`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-14 pr-4 text-sm font-semibold text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Bank / Mobile Money Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Payout Method</label>
            <select
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs font-semibold text-white focus:border-amber-400 focus:outline-none"
            >
              <option value="RWF_MTN">MTN Mobile Money Rwanda (RWF)</option>
              <option value="RWF_AIRTEL">Airtel Money Rwanda (RWF)</option>
              <option value="BK_RWANDA">Bank of Kigali (RWF)</option>
              <option value="EQUITY_RWANDA">Equity Bank Rwanda</option>
              <option value="NGN_BANKS">Nigerian Commercial Banks (NGN)</option>
              <option value="KES_MPESA">M-Pesa Kenya (KES)</option>
            </select>
          </div>

          {/* Account Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Account / Phone Number</label>
            <input
              type="text"
              required
              placeholder="e.g. 078XXXXXXX or Account No."
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-4 text-sm font-semibold text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
            />
          </div>

          {/* Account Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Account Holder Name</label>
            <input
              type="text"
              placeholder="Full Registered Name"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-4 text-sm font-semibold text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition disabled:opacity-50"
          >
            {loading ? (
              <span className="animate-pulse">Processing Payout...</span>
            ) : (
              <>
                <Zap className="h-4 w-4 fill-slate-950" />
                Request {currency} {amount ? Number(amount).toLocaleString() : '0'} Payout
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
            <span>Automated bank & mobile wallet transfers</span>
          </div>
        </form>
      </div>
    </div>
  );
};
