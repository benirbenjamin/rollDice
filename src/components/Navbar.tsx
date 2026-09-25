'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Volume2, VolumeX, Wallet, Plus, ArrowUpRight, Shield, LogOut, User as UserIcon } from 'lucide-react';
import { soundManager } from '@/lib/sound';

interface NavbarProps {
  user: any;
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onOpenDeposit, onOpenWithdraw, onLogout }) => {
  const [isMuted, setIsMuted] = useState(soundManager.getMuted());

  const handleToggleMute = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        
        {/* Brand Logo & Name */}
        <Link href="/" className="flex items-center gap-3 transition hover:opacity-90">
          <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-amber-500/30 bg-slate-900 shadow-md shadow-amber-500/10">
            <Image
              src="/logo.png"
              alt="RollDice Logo"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-extrabold tracking-tight text-white">Roll<span className="text-amber-400">Dice</span></span>
              <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">PRO</span>
            </div>
            <p className="text-[10px] text-slate-400">Real Money Wagering</p>
          </div>
        </Link>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          
          {/* Mute/Unmute sound */}
          <button
            onClick={handleToggleMute}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:text-white transition"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4 text-amber-400" />}
          </button>

          {user ? (
            <div className="flex items-center gap-3">
              {/* Wallet Pill */}
              <div className="flex items-center rounded-xl border border-amber-500/30 bg-slate-900/90 p-1 pl-3 shadow-lg shadow-amber-500/5">
                <div className="flex items-center gap-2 mr-3">
                  <Wallet className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-medium text-slate-400">Balance:</span>
                  <span className="text-sm font-bold text-emerald-400">
                    RWF {Number(user.wallet_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                  </span>
                </div>
                
                <button
                  onClick={onOpenDeposit}
                  className="flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1.5 text-xs font-bold text-white shadow-sm transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Deposit
                </button>

                <button
                  onClick={onOpenWithdraw}
                  className="ml-1 flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 px-2 py-1.5 text-xs font-semibold text-slate-300 transition"
                  title="Withdraw Funds"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Admin Portal Link */}
              {user.role === 'ADMIN' && (
                <Link
                  href="/admin"
                  className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition"
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </Link>
              )}

              {/* User Dropdown / Logout */}
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-200">{user.name}</span>
                  <span className="text-[10px] text-slate-400">{user.email}</span>
                </div>

                <button
                  onClick={onLogout}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:border-red-900/50 hover:bg-red-950/40 hover:text-red-400 transition"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition"
            >
              <UserIcon className="h-4 w-4" />
              Login / Sign Up
            </Link>
          )}

        </div>
      </div>
    </header>
  );
};
