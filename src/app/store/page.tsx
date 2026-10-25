'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/context/StoreContext';
import { soundManager } from '@/lib/audio';
import {
  Store as StoreIcon,
  ShieldCheck,
  Lock,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Eye,
  EyeOff,
  Shield,
} from 'lucide-react';

export default function StoreConnectionEntryPage() {
  const router = useRouter();
  const { setActiveStore } = useStore();

  const [storeCodeInput, setStoreCodeInput] = useState('');
  const [storePasswordInput, setStorePasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = storeCodeInput.trim().toUpperCase();
    const cleanPassword = storePasswordInput.trim();

    if (!cleanCode || !cleanPassword) {
      setErrorMessage('Please enter both Store Code and Store Password');
      soundManager.playErrorBuzz();
      return;
    }

    setIsConnecting(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/stores/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeCode: cleanCode, storePassword: cleanPassword }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        soundManager.playErrorBuzz();
        setErrorMessage(data.error || 'Invalid store code or password');
        setIsConnecting(false);
        return;
      }

      // Persist active session tokens upon explicit successful authentication
      const sessionPayload = {
        code: data.store.code,
        id: data.store._id,
        name: data.store.name,
        connectedAt: new Date().toISOString(),
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem('omnipos_device_store', data.store.code.toLowerCase());
        localStorage.setItem('omnipos_store_session', JSON.stringify(sessionPayload));
        localStorage.setItem('omnipos_store_id', data.store._id);
        document.cookie = `omnipos_device_store=${data.store.code.toLowerCase()}; path=/; max-age=31536000; SameSite=Lax`;
        document.cookie = `omnipos_store_session=${data.store.code.toLowerCase()}; path=/; max-age=31536000; SameSite=Lax`;
      }

      setActiveStore(data.store);
      soundManager.playSuccessChime();

      // Forward into the authenticated store PIN terminal
      router.push(`/store/${data.store.code.toLowerCase()}`);
    } catch {
      soundManager.playErrorBuzz();
      setErrorMessage('Network error — unable to reach authentication service');
      setIsConnecting(false);
    }
  };

  const handleDemoFill = (code: string, pass: string) => {
    setStoreCodeInput(code);
    setStorePasswordInput(pass);
    setErrorMessage('');
    soundManager.playScanBeep();
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 px-4 py-12 sm:px-6">
      <div className="w-full max-w-md space-y-6">
        {/* Top return link */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white transition-colors group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Public Home</span>
          </Link>
          <span className="text-[11px] font-mono text-slate-400 dark:text-neutral-600">OmniPOS Terminal Gateway</span>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-slate-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-red-500 text-white shadow-xl shadow-orange-500/25">
              <StoreIcon className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Connect Store Terminal
            </h1>
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              Enter your branch credentials to authenticate and provision this terminal.
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3.5 py-2.5 text-xs text-red-600 dark:text-red-400 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleConnect} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-neutral-400">
                Store Code
              </label>
              <div className="relative">
                <input
                  id="connection-store-code"
                  type="text"
                  value={storeCodeInput}
                  onChange={(e) => {
                    setStoreCodeInput(e.target.value.toUpperCase());
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="e.g. DT-BISTRO"
                  autoFocus
                  required
                  className="w-full bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl px-4 py-3 text-sm font-mono uppercase tracking-wider text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-neutral-400">
                Store Connection Password
              </label>
              <div className="relative">
                <input
                  id="connection-store-password"
                  type={showPassword ? 'text' : 'password'}
                  value={storePasswordInput}
                  onChange={(e) => {
                    setStorePasswordInput(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl px-4 py-3 pr-12 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-neutral-500 hover:text-slate-700 dark:hover:text-neutral-300 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isConnecting || !storeCodeInput.trim() || !storePasswordInput.trim()}
              id="connect-terminal-submit-btn"
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm shadow-lg transition-all cursor-pointer bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>{isConnecting ? 'Verifying Credentials...' : 'Connect & Open Terminal'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Demo Quick-Fill Section */}
          <div className="pt-4 border-t border-slate-200 dark:border-neutral-800/80 space-y-2.5">
            <p className="text-[11px] font-semibold text-center text-slate-500 dark:text-neutral-400">
              Demo Test Branches (Click to auto-fill):
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { code: 'DT-BISTRO', pass: 'Bistro2026!', label: 'Bistro' },
                { code: 'OMNI-TECH', pass: 'Tech2026!', label: 'Retail' },
                { code: 'UP-BAKERY', pass: 'Bakery2026!', label: 'Bakery' },
              ].map(({ code, pass, label }) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => handleDemoFill(code, pass)}
                  className="flex flex-col items-center p-2 rounded-xl border border-slate-200 dark:border-neutral-800 hover:border-orange-500/50 hover:bg-orange-50/50 dark:hover:bg-neutral-800/50 transition-all text-center cursor-pointer group"
                >
                  <span className="font-mono text-xs font-bold text-slate-800 dark:text-neutral-200 group-hover:text-orange-500 dark:group-hover:text-orange-400">
                    {code}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-neutral-500">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom links */}
        <div className="flex flex-col items-center gap-3 text-center text-xs text-slate-500 dark:text-neutral-500">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-medium hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
          >
            <span>Need a new store? Register with a 14-day free trial</span>
          </Link>
          <Link
            href="/admin/login"
            className="inline-flex items-center gap-1.5 font-medium hover:text-slate-800 dark:hover:text-neutral-300 transition-colors"
          >
            <Shield className="w-3.5 h-3.5 text-rose-500" />
            <span>Platform Administrator Login</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
