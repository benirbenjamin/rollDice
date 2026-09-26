'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { soundManager } from '@/lib/sound';

interface UserContextType {
  user: any;
  loading: boolean;
  fetchUser: () => Promise<void>;
  updateBalance: (newBalance: number) => void;
  setDemoMode: (isDemo: boolean) => void;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const getDemoBalance = () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('rolldice_demo_balance');
      if (saved !== null) {
        const parsed = Number(saved);
        if (!isNaN(parsed)) return parsed;
      }
    }
    return 10000;
  };

  const setDemoBalance = (bal: number) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('rolldice_demo_balance', bal.toString());
    }
  };

  const fetchUser = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (res.ok && data.user) {
        setUser({ ...data.user, isDemo: false });
      } else {
        const demoBal = getDemoBalance();
        setUser({
          id: 'demo_guest',
          name: 'Demo Guest',
          email: 'demo@rolldice.app',
          wallet_balance: demoBal,
          isDemo: true,
        });
      }
    } catch {
      const demoBal = getDemoBalance();
      setUser({
        id: 'demo_guest',
        name: 'Demo Guest',
        email: 'demo@rolldice.app',
        wallet_balance: demoBal,
        isDemo: true,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const updateBalance = (newBalance: number) => {
    const validBalance = Number(newBalance) || 0;
    setUser((prev: any) => {
      if (!prev) return null;
      if (prev.isDemo) {
        setDemoBalance(validBalance);
      }
      return { ...prev, wallet_balance: validBalance };
    });
  };

  const setDemoMode = (enableDemo: boolean) => {
    if (enableDemo) {
      const demoBal = getDemoBalance();
      setUser({
        id: 'demo_guest',
        name: 'Demo Guest',
        email: 'demo@rolldice.app',
        wallet_balance: demoBal,
        isDemo: true,
      });
    } else {
      fetchUser();
    }
  };

  const logout = async () => {
    soundManager.playClick();
    await fetch('/api/auth/logout', { method: 'POST' });
    const demoBal = getDemoBalance();
    setUser({
      id: 'demo_guest',
      name: 'Demo Guest',
      email: 'demo@rolldice.app',
      wallet_balance: demoBal,
      isDemo: true,
    });
  };

  return (
    <UserContext.Provider value={{ user, loading, fetchUser, updateBalance, setDemoMode, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
