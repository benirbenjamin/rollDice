'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Volume2, VolumeX, Wallet, Plus, ArrowUpRight, Shield, LogOut, User as UserIcon, LayoutDashboard, Gamepad2, Menu, X } from 'lucide-react';
import { soundManager } from '@/lib/sound';

interface NavbarProps {
  user: any;
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onOpenDeposit, onOpenWithdraw, onLogout }) => {
  const [isMuted, setIsMuted] = useState(soundManager.getMuted());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleToggleMute = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2.5 sm:px-6">
        
        {/* Brand Logo & Desktop Nav */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2.5 transition hover:opacity-90 shrink-0">
            <div className="relative h-9 w-9 sm:h-10 sm:w-10 overflow-hidden rounded-xl border border-amber-500/30 bg-slate-900 shadow-md">
              <Image
                src="/logo.png"
                alt="RollDice Logo"
                fill
                className="object-cover"
                priority
              />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-lg sm:text-xl font-extrabold tracking-tight text-white">Roll<span className="text-amber-400">Dice</span></span>
                <span className="rounded bg-amber-500/20 px-1 py-0.5 text-[9px] font-bold text-amber-300 border border-amber-500/30">PRO</span>
              </div>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold text-slate-300 hover:bg-slate-900 hover:text-white transition"
            >
              <LayoutDashboard className="h-4 w-4 text-amber-400" />
              <span>Dashboard</span>
            </Link>

            <Link
              href="/play"
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold text-slate-300 hover:bg-slate-900 hover:text-white transition"
            >
              <Gamepad2 className="h-4 w-4 text-cyan-400" />
              <span>Game Arena</span>
            </Link>
          </nav>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Mute Button */}
          <button
            onClick={handleToggleMute}
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:text-white transition"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4 text-amber-400" />}
          </button>

          {user ? (
            <>
              {/* Compact Wallet Pill */}
              <div className="flex items-center rounded-xl border border-amber-500/30 bg-slate-900/90 px-2.5 py-1.5 shadow-md">
                <div className="flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-xs font-black text-emerald-400">
                    RWF {Number(user.wallet_balance || 0).toLocaleString('en-US')}
                  </span>
                </div>
              </div>

              {/* Desktop User Info & Logout */}
              <div className="hidden lg:flex items-center gap-2">
                {user.role === 'ADMIN' && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition"
                  >
                    <Shield className="h-3.5 w-3.5" />
                    <span>Admin</span>
                  </Link>
                )}

                <button
                  onClick={onLogout}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:border-red-900/50 hover:bg-red-950/40 hover:text-red-400 transition"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>

              {/* Mobile Hamburger Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="flex lg:hidden h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300"
              >
                {mobileMenuOpen ? <X className="h-4 w-4 text-amber-400" /> : <Menu className="h-4 w-4" />}
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-1.5 text-xs font-bold text-slate-950 shadow-md transition"
            >
              <UserIcon className="h-3.5 w-3.5" />
              <span>Login</span>
            </Link>
          )}

        </div>
      </div>

      {/* Mobile Collapsible Navigation Drawer */}
      {mobileMenuOpen && user && (
        <div className="lg:hidden border-t border-slate-800 bg-slate-950 p-4 space-y-3 shadow-2xl animate-in slide-in-from-top duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <p className="text-xs font-bold text-white">{user.name}</p>
              <p className="text-[10px] text-slate-400">{user.email}</p>
            </div>
            {user.role === 'ADMIN' && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md bg-amber-500/20 px-2 py-1 text-[10px] font-bold text-amber-300 border border-amber-500/30"
              >
                Admin Panel
              </Link>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs font-bold text-slate-200"
            >
              <LayoutDashboard className="h-4 w-4 text-amber-400" />
              Dashboard
            </Link>

            <Link
              href="/play"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs font-bold text-slate-200"
            >
              <Gamepad2 className="h-4 w-4 text-cyan-400" />
              Game Arena
            </Link>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenWithdraw();
              }}
              className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-300"
            >
              <ArrowUpRight className="h-4 w-4 text-emerald-400" />
              Withdraw Funds
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onLogout();
              }}
              className="flex items-center gap-1.5 rounded-xl bg-red-950/60 border border-red-800/60 px-3 py-2 text-xs font-bold text-red-300"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
