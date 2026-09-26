'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, KeyRound, ShieldCheck, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import { soundManager } from '@/lib/sound';

export default function LoginPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'FORM' | 'OTP'>('FORM');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [devOtpNotice, setDevOtpNotice] = useState<string | null>(null);

  // Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    soundManager.playClick();
    setError(null);
    setInfoMsg(null);
    setDevOtpNotice(null);

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    if (authMode === 'REGISTER' && (!name || !name.trim())) {
      setError('Please enter your full name or display name');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, mode: authMode }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send OTP code');
      }

      setInfoMsg(data.message || 'Verification code sent! Please check your email inbox.');
      if (data.devOtp) {
        setDevOtpNotice(`Dev Mode / Sandbox OTP Code: ${data.devOtp}`);
      }
      setStep('OTP');
      soundManager.playHoldScore();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    soundManager.playClick();
    setError(null);

    if (!otpCode || otpCode.length < 4) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otpCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid verification code');
      }

      soundManager.playVictory();
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4 font-sans text-slate-100">
      
      {/* Container Card */}
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl">
        
        {/* Glow accent */}
        <div className="pointer-events-none absolute -top-20 -left-20 h-40 w-40 rounded-full bg-amber-500/20 blur-3xl" />

        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-amber-500/40 bg-slate-950 shadow-md shadow-amber-500/20">
              <Image src="/logo.png" alt="RollDice" fill className="object-cover" />
            </div>
            <span className="text-2xl font-black text-white">Benix<span className="text-amber-400">Games</span></span>
          </Link>
          <h1 className="mt-4 text-xl font-extrabold text-white">
            {step === 'FORM'
              ? authMode === 'LOGIN' ? 'Account Login' : 'Create New Account'
              : 'Enter Verification Code'}
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            {step === 'FORM'
              ? authMode === 'LOGIN'
                ? 'Enter your registered email address to sign in'
                : 'Enter your display name and email to get started'
              : `Code sent to ${email}`}
          </p>
        </div>

        {error && (
          <div className="mt-5 flex items-center gap-2 rounded-xl bg-red-950/60 p-3 text-xs text-red-300 border border-red-800/50">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {infoMsg && (
          <div className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-950/60 p-3 text-xs text-emerald-300 border border-emerald-800/50">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>{infoMsg}</span>
          </div>
        )}

        {devOtpNotice && (
          <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-2.5 text-center text-xs font-mono font-bold text-amber-300 shadow-inner">
            ⚡ {devOtpNotice}
          </div>
        )}

        {step === 'FORM' ? (
          <form onSubmit={handleSendOtp} className="mt-6 space-y-4">
            
            {/* Display Name Input (REGISTER mode ONLY) */}
            {authMode === 'REGISTER' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name / Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-4 text-sm font-medium text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>
            )}

            {/* Email Address Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="player@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-4 text-sm font-medium text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition disabled:opacity-50"
            >
              {loading ? 'Sending Code...' : (
                <>
                  <span>{authMode === 'LOGIN' ? 'Send Login Security Code' : 'Send Registration Security Code'}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            {/* Mode Switch Toggle Footer */}
            <div className="text-center pt-2">
              {authMode === 'LOGIN' ? (
                <p className="text-xs text-slate-400">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      setError(null);
                      setInfoMsg(null);
                      setAuthMode('REGISTER');
                    }}
                    className="font-bold text-amber-400 hover:underline"
                  >
                    Register here
                  </button>
                </p>
              ) : (
                <p className="text-xs text-slate-400">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      setError(null);
                      setInfoMsg(null);
                      setAuthMode('LOGIN');
                    }}
                    className="font-bold text-amber-400 hover:underline"
                  >
                    Login here
                  </button>
                </p>
              )}
            </div>

          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">6-Digit Verification Code</label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-400" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="w-full rounded-xl border border-amber-500/40 bg-slate-950 py-2.5 pl-10 pr-4 text-base tracking-widest font-mono font-bold text-white placeholder-slate-600 focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-emerald-500 transition disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify Code & Proceed'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('FORM');
                setDevOtpNotice(null);
              }}
              className="w-full text-center text-xs text-slate-400 hover:text-white"
            >
              Back to {authMode === 'LOGIN' ? 'Login' : 'Registration'}
            </button>
          </form>
        )}

        <div className="mt-6 flex items-center justify-center gap-1.5 border-t border-slate-800 pt-4 text-[11px] text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
          <span>Provably Fair RNG & Secure Encryption</span>
        </div>

      </div>

    </main>
  );
}
