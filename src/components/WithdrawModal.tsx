'use client';

import React, { useState } from 'react';
import { X, ArrowUpRight, Building2, CheckCircle2, AlertCircle } from 'lucide-react';
import { soundManager } from '@/lib/sound';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newBalance: number) => void;
  userBalance: number;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  userBalance,
}) => {
  const [amount, setAmount] = useState<string>('5000');
  const [bankCode, setBankCode] = useState<string>('044'); // Access Bank default
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const popularBanks = [
    { code: '044', name: 'Access Bank' },
    { code: '058', name: 'GTBank (Guaranty Trust)' },
    { code: '057', name: 'Zenith Bank' },
    { code: '033', name: 'UBA (United Bank for Africa)' },
    { code: '011', name: 'First Bank of Nigeria' },
    { code: '50515', name: 'Moniepoint Microfinance' },
    { code: '999992', name: 'OPay Digital Services' },
    { code: '50211', name: 'Kuda Microfinance' },
  ];

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    soundManager.playClick();
    setError(null);

    const wthVal = Number(amount);

    if (isNaN(wthVal) || wthVal < 1000) {
      setError('Minimum withdrawal is ₦1,000');
      return;
    }

    if (wthVal > userBalance) {
      setError(`Insufficient balance. Available: ₦${userBalance.toLocaleString()}`);
      return;
    }

    if (!accountNumber || accountNumber.length < 10) {
      setError('Please enter a valid 10-digit account number');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: wthVal,
          account_bank: bankCode,
          account_number: accountNumber,
          account_name: accountName || 'Account Holder',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Withdrawal failed');
      }

      soundManager.playVictory();
      onSuccess(data.newBalance);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Withdrawal failed');
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
              <ArrowUpRight className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Withdraw Winnings</h3>
              <p className="text-xs text-slate-400">Instant Automated Bank & Wallet Payout</p>
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
          
          {/* Amount */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">Withdrawal Amount (NGN)</label>
              <span className="text-[11px] text-amber-400">Avail: ₦{userBalance.toLocaleString()}</span>
            </div>
            <input
              type="number"
              min="1000"
              placeholder="e.g. 5000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Select Bank */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Select Destination Bank</label>
            <select
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white focus:border-amber-500 focus:outline-none"
            >
              {popularBanks.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Account Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">10-Digit NUBAN Account Number</label>
            <input
              type="text"
              maxLength={10}
              placeholder="0123456789"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Account Holder Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Account Holder Full Name</label>
            <input
              type="text"
              placeholder="e.g. John Doe"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition disabled:opacity-50"
          >
            {loading ? (
              <span className="animate-pulse">Processing Transfer...</span>
            ) : (
              <>
                <Building2 className="h-4 w-4" />
                Transfer ₦{Number(amount || 0).toLocaleString()} to Bank
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
