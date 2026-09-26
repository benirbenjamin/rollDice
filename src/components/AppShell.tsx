'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
import { DepositModal } from '@/components/DepositModal';
import { WithdrawModal } from '@/components/WithdrawModal';
import { soundManager } from '@/lib/sound';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
      } else {
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

  useEffect(() => {
    fetchUser();
  }, []);

  const handleLogout = async () => {
    soundManager.playClick();
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser({
      id: 'demo_guest',
      name: 'Demo Player',
      email: 'demo@rolldice.app',
      wallet_balance: 10000,
      isDemo: true,
    });
  };

  const handleBalanceUpdate = (newBalance: number) => {
    setUser((prev: any) => (prev ? { ...prev, wallet_balance: newBalance } : null));
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] font-sans text-slate-100 flex flex-col">
      {/* Global Top Navbar */}
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

      {/* Main Page Content with bottom padding on mobile for BottomNav */}
      <div className="flex-1 pb-20 md:pb-0">
        {children}
      </div>

      {/* Global Modals */}
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

      {/* Global Mobile Bottom Navigation Bar */}
      <BottomNav
        user={user}
        onOpenDeposit={() => {
          soundManager.playClick();
          setIsDepositOpen(true);
        }}
        onOpenWithdraw={() => {
          soundManager.playClick();
          setIsWithdrawOpen(true);
        }}
      />
    </div>
  );
};
