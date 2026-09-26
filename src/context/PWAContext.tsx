'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface PWAContextType {
  isInstallable: boolean;
  isInstalled: boolean;
  showPrompt: boolean;
  installApp: () => Promise<void>;
  dismissPrompt: () => void;
}

const PWAContext = createContext<PWAContextType>({
  isInstallable: false,
  isInstalled: false,
  showPrompt: false,
  installApp: async () => {},
  dismissPrompt: () => {},
});

export const PWAProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  // Check if app is running in standalone mode (already installed)
  const checkIfInstalled = () => {
    if (typeof window === 'undefined') return false;
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;
    return isStandaloneMode || isIOSStandalone;
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check standalone mode on mount
    const installed = checkIfInstalled();
    setIsInstalled(installed);

    // Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('Service Worker registered:', reg.scope))
        .catch((err) => console.error('Service Worker registration failed:', err));
    }

    // Check dismissal timestamp in localStorage (14 Days HIDE duration)
    const HIDE_DURATION_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
    const dismissedUntil = localStorage.getItem('rolldice_pwa_dismissed_until');
    const isDismissed = dismissedUntil && Date.now() < Number(dismissedUntil);

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);

      if (!installed && !isDismissed) {
        setShowPrompt(true);
      }
    };

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setShowPrompt(false);
      setDeferredPrompt(null);
      localStorage.removeItem('rolldice_pwa_dismissed_until');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return;

    try {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        setShowPrompt(false);
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.error('Install prompt error:', err);
    }
  };

  const dismissPrompt = () => {
    setShowPrompt(false);
    // Hide for 14 days when user clicks "Not Now"
    const HIDE_DURATION_MS = 14 * 24 * 60 * 60 * 1000;
    const hideUntil = Date.now() + HIDE_DURATION_MS;
    localStorage.setItem('rolldice_pwa_dismissed_until', hideUntil.toString());
  };

  return (
    <PWAContext.Provider
      value={{
        isInstallable: isInstallable && !isInstalled,
        isInstalled,
        showPrompt: showPrompt && !isInstalled,
        installApp,
        dismissPrompt,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
};

export const usePWA = () => useContext(PWAContext);
