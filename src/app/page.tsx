'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { soundManager } from '@/lib/audio';
import {
  // Sparkles removed — replaced with inline POS terminal SVG below
  Store as StoreIcon,
  ArrowRight,
  Shield,
  Search,
  AlertCircle,
  Building2,
  Lock,
  RefreshCw,
} from 'lucide-react';

export default function StoreIdentificationPage() {
  const router = useRouter();
  const [storeCodeInput, setStoreCodeInput] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isCheckingDevice, setIsCheckingDevice] = useState<boolean>(true);

  // 1. Device-Based Terminal Provisioning: Auto-bypass if device is already paired
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pairedStore = localStorage.getItem('omnipos_device_store');
      if (pairedStore) {
        router.replace(`/store/${pairedStore.toLowerCase()}`);
        return;
      }
    }
    setIsCheckingDevice(false);
  }, [router]);

  const handleLookupStore = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = storeCodeInput.trim().toUpperCase();

    if (!cleanCode) {
      setErrorMessage('Please enter your store branch code');
      soundManager.playErrorBuzz();
      return;
    }

    setIsSearching(true);
    setErrorMessage('');

    try {
      const res = await fetch(`/api/stores/${encodeURIComponent(cleanCode)}`);
      const data = await res.json();

      if (!res.ok || !data.store) {
        soundManager.playErrorBuzz();
        setErrorMessage('Store not found — check your store code');
        setIsSearching(false);
        return;
      }

      // Provision this device to the store branch permanently
      if (typeof window !== 'undefined') {
        localStorage.setItem('omnipos_device_store', cleanCode.toLowerCase());
        document.cookie = `omnipos_device_store=${cleanCode.toLowerCase()}; path=/; max-age=31536000; SameSite=Lax`;
      }

      soundManager.playScanBeep();
      router.push(`/store/${cleanCode.toLowerCase()}`);
    } catch {
      soundManager.playErrorBuzz();
      setErrorMessage('Unable to connect to branch directory service');
      setIsSearching(false);
    }
  };

  if (isCheckingDevice) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-53px)] bg-neutral-950 text-neutral-400">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-orange-500" />
          <span className="text-sm font-medium">Loading provisioned terminal...</span>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 px-4 py-12 relative overflow-hidden">
      {/* Subtle Ambient Lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-8">
        {/* Brand & Heading */}
        <div className="text-center space-y-3">
          {/* POS Terminal splash icon — inline SVG, visually matches header logo */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-red-500 text-white shadow-xl shadow-orange-500/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-8 w-8"
              aria-hidden="true"
            >
              {/* Screen */}
              <rect x="3" y="3" width="18" height="11" rx="2" />
              {/* Stand/base neck */}
              <line x1="12" y1="14" x2="12" y2="17" />
              {/* Base */}
              <rect x="6" y="17" width="12" height="2" rx="1" />
              {/* Receipt strip */}
              <line x1="9" y1="19" x2="9" y2="22" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="15" y1="19" x2="15" y2="22" />
              {/* Screen content lines */}
              <line x1="7" y1="7" x2="17" y2="7" />
              <line x1="7" y1="10" x2="13" y2="10" />
            </svg>
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-white">OmniPOS Terminal</h1>
            <p className="text-xs text-neutral-400">
              Enterprise Multi-Store Point of Sale & Self-Checkout System
            </p>
          </div>
        </div>

        {/* Store Code Identification Card */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="space-y-1 text-center">
            <h2 className="text-base font-bold text-white flex items-center justify-center gap-2">
              <StoreIcon className="w-4 h-4 text-orange-400" />
              <span>Connect to Store Branch</span>
            </h2>
            <p className="text-xs text-neutral-400">
              Enter your assigned store branch code to provision this terminal
            </p>
          </div>

          {/* Inline Error Display */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Search-Only Input Form */}
          <form onSubmit={handleLookupStore} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                Store Branch Code
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={storeCodeInput}
                  onChange={(e) => {
                    setStoreCodeInput(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="e.g. DT-BISTRO or OMNI-TECH"
                  className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl pl-11 pr-4 py-3.5 text-sm font-mono uppercase tracking-wider text-white placeholder-neutral-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSearching || !storeCodeInput.trim()}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 font-bold text-sm text-white shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSearching ? (
                <span>Provisioning Terminal...</span>
              ) : (
                <>
                  <span>Pair & Open Store Terminal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Notice: Multi-Tenant Isolation */}
          <div className="pt-4 border-t border-neutral-800/80 text-center">
            <div className="inline-flex items-center gap-1.5 text-[11px] text-neutral-500">
              <Lock className="w-3 h-3 text-neutral-600" />
              <span>One-time device pairing with hardware branch isolation</span>
            </div>
          </div>
        </div>

        {/* Platform Administrator Gateway Entry Link */}
        <div className="text-center pt-2">
          <Link
            href="/admin/login"
            className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800 hover:border-rose-500/40 text-xs font-semibold text-neutral-400 hover:text-white transition-all shadow-lg group cursor-pointer"
          >
            <Shield className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
            <span>Platform Administrator? Sign in to SaaS Hub</span>
            <ArrowRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-rose-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </main>
  );
}
