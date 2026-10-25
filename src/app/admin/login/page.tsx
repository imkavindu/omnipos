'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/context/StoreContext';
import { soundManager } from '@/lib/audio';
import {
  ShieldAlert,
  Lock,
  Mail,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const { loginAdmin } = useStore();

  const [email, setEmail] = useState('admin@omnipos.io');
  const [password, setPassword] = useState('OmniAdmin2026!');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please provide both email and password');
      soundManager.playErrorBuzz();
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    const res = await loginAdmin({ email, password });
    setIsLoading(false);

    if (res.success && res.redirectUrl) {
      router.push(res.redirectUrl);
    } else {
      setErrorMessage(res.error || 'Authentication failed');
    }
  };

  const handleDemoFill = () => {
    setEmail('admin@omnipos.io');
    setPassword('OmniAdmin2026!');
    setErrorMessage('');
    soundManager.playScanBeep();
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Dynamic Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Store Staff Terminal
          </Link>
        </div>

        {/* Card Container */}
        <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-red-700 text-white shadow-lg shadow-rose-900/30 mb-4 ring-4 ring-rose-500/10">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">Platform Owner Access</h1>
            <p className="text-xs text-neutral-400 mt-1">
              SaaS Multi-Tenant Operations & Subscription Governance
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                Administrator Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@omnipos.io"
                  required
                  className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                Secure Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 font-bold text-sm text-white shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <span>Verifying Credentials...</span>
              ) : (
                <>
                  <span>Sign In to Platform Admin</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill Badge */}
          <div className="mt-8 pt-6 border-t border-neutral-800/80 text-center">
            <p className="text-[11px] text-neutral-500 mb-2">Evaluation & Testing Credentials</p>
            <button
              type="button"
              onClick={handleDemoFill}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/60 text-neutral-300 text-xs transition-colors cursor-pointer"
            >
              <span>Fill Eleanor Vance (Platform Owner)</span>
            </button>
            <div className="text-[10px] text-neutral-500 mt-2 font-mono">
              admin@omnipos.io • OmniAdmin2026!
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center text-xs text-neutral-500 flex items-center justify-center gap-2">
          <KeyRound className="w-3.5 h-3.5 text-neutral-500" />
          <span>Encrypted with bcrypt (cost: 10) & httpOnly JWT session cookies</span>
        </div>
      </div>
    </div>
  );
}
