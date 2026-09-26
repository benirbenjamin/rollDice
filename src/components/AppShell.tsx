'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
import { DepositModal } from '@/components/DepositModal';
import { WithdrawModal } from '@/components/WithdrawModal';
import { soundManager } from '@/lib/sound';
import { useUser } from '@/context/UserContext';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { user, updateBalance, logout } = useUser();
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

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
        onLogout={logout}
      />

      {/* Main Page Content with bottom padding on mobile for BottomNav */}
      <div className="flex-1 pb-20 md:pb-0">
        {children}
      </div>

      {/* Global Modals */}
      <DepositModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        onSuccess={updateBalance}
        user={user}
      />

      <WithdrawModal
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        onSuccess={updateBalance}
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
