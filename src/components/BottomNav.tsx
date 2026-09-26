'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Gamepad2, Plus, ArrowUpRight, Shield, User } from 'lucide-react';
import { soundManager } from '@/lib/sound';

interface BottomNavProps {
  user: any;
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ user, onOpenDeposit, onOpenWithdraw }) => {
  const pathname = usePathname();

  const currentUser = user || { name: 'Player', role: 'USER' };

  React.useEffect(() => {
    console.log('🚀 [RollDice] Bottom Navigation Bar Loaded Successfully!', { user: currentUser });
    console.warn('🚀 [RollDice] Bottom Navigation Bar is ACTIVE on this screen.');
  }, [currentUser]);

  const isActive = (path: string) => pathname === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] block md:hidden border-t border-slate-800/90 bg-slate-950/95 backdrop-blur-xl px-2 py-2 shadow-[0_-8px_25px_rgba(0,0,0,0.9)]">
      <div className="flex items-center justify-around max-w-md mx-auto">
        
        {/* Dashboard Link */}
        <Link
          href="/dashboard"
          onClick={() => soundManager.playClick()}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
            isActive('/dashboard') ? 'text-amber-400 font-black' : 'text-slate-400 hover:text-white'
          }`}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-[10px] font-bold mt-0.5">Home</span>
        </Link>

        {/* Game Arena Link */}
        <Link
          href="/play"
          onClick={() => soundManager.playClick()}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
            isActive('/play') ? 'text-cyan-400 font-black' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Gamepad2 className="h-5 w-5" />
          <span className="text-[10px] font-bold mt-0.5">Arena</span>
        </Link>

        {/* FEATURED CENTER DEPOSIT BUTTON */}
        <div className="relative -top-3">
          <button
            onClick={() => {
              soundManager.playClick();
              onOpenDeposit();
            }}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 p-0.5 shadow-xl shadow-emerald-500/40 glow-cyan scale-105 active:scale-95 transition"
          >
            <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-500 text-white font-black">
              <Plus className="h-6 w-6 stroke-[3]" />
              <span className="text-[8px] uppercase tracking-tighter -mt-1 font-black">Deposit</span>
            </div>
          </button>
        </div>

        {/* Withdraw Action */}
        <button
          onClick={() => {
            soundManager.playClick();
            onOpenWithdraw();
          }}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-slate-400 hover:text-white transition"
        >
          <ArrowUpRight className="h-5 w-5 text-emerald-400" />
          <span className="text-[10px] font-bold mt-0.5">Withdraw</span>
        </button>

        {/* Admin or Profile or Login */}
        {!user || user?.isDemo ? (
          <Link
            href="/login"
            onClick={() => soundManager.playClick()}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
              isActive('/login') ? 'text-amber-400 font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="h-5 w-5" />
            <span className="text-[10px] font-bold mt-0.5">Login</span>
          </Link>
        ) : currentUser?.role === 'ADMIN' ? (
          <Link
            href="/admin"
            onClick={() => soundManager.playClick()}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
              isActive('/admin') ? 'text-amber-300 font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="h-5 w-5 text-amber-400" />
            <span className="text-[10px] font-bold mt-0.5">Admin</span>
          </Link>
        ) : (
          <div className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-slate-400">
            <User className="h-5 w-5 text-slate-400" />
            <span className="text-[10px] font-bold mt-0.5 truncate max-w-[45px]">{currentUser?.name?.split(' ')[0] || 'User'}</span>
          </div>
        )}

      </div>
    </div>
  );
};
