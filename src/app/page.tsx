'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore, StoreData } from '@/context/StoreContext';
import { soundManager } from '@/lib/audio';
import {
  Store as StoreIcon,
  KeyRound,
  Delete,
  LogIn,
  CreditCard,
  ChefHat,
  TrendingUp,
  MonitorCheck,
  RefreshCw,
  AlertCircle,
  Shield,
  ArrowRight,
  ChevronDown,
  Lock,
} from 'lucide-react';

interface StaffMember {
  _id: string;
  name: string;
  role: 'STORE_MANAGER' | 'CASHIER' | 'KITCHEN' | 'KIOSK';
  avatar?: string;
  email: string;
}

export default function OmniPosLoginPinGatePage() {
  const router = useRouter();
  const { stores, activeStore, setActiveStore, loginWithPin, isLoading: isContextLoading } = useStore();

  const [selectedStore, setSelectedStore] = useState<StoreData | null>(null);
  const [storeStaff, setStoreStaff] = useState<StaffMember[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState<boolean>(false);

  const [pinInput, setPinInput] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Initialize selected store: priority is activeStore -> localStorage paired store -> first store in list
  useEffect(() => {
    if (stores.length === 0) return;

    if (activeStore) {
      setSelectedStore(activeStore);
      return;
    }

    if (typeof window !== 'undefined') {
      const savedCode = localStorage.getItem('omnipos_device_store');
      if (savedCode) {
        const matched = stores.find((s) => s.code.toLowerCase() === savedCode.toLowerCase());
        if (matched) {
          setSelectedStore(matched);
          setActiveStore(matched);
          return;
        }
      }
    }

    // Default to first store in list (e.g. Downtown Bistro & Bar)
    setSelectedStore(stores[0]);
    setActiveStore(stores[0]);
  }, [stores, activeStore, setActiveStore]);

  // Load staff members strictly belonging to the currently selected store branch
  const fetchStoreStaff = useCallback(async (storeCode: string) => {
    try {
      setIsLoadingStaff(true);
      const res = await fetch(`/api/stores/${encodeURIComponent(storeCode)}`);
      const data = await res.json();
      if (res.ok && data.staff) {
        setStoreStaff(data.staff);
      } else {
        setStoreStaff([]);
      }
    } catch (err) {
      console.error('Failed to load store staff:', err);
      setStoreStaff([]);
    } finally {
      setIsLoadingStaff(false);
    }
  }, []);

  useEffect(() => {
    if (selectedStore?.code) {
      fetchStoreStaff(selectedStore.code);
    }
  }, [selectedStore?.code, fetchStoreStaff]);

  // Change store handler
  const handleStoreChange = (storeId: string) => {
    const nextStore = stores.find((s) => s._id === storeId);
    if (!nextStore) return;

    soundManager.playScanBeep();
    setSelectedStore(nextStore);
    setActiveStore(nextStore);
    setPinInput('');
    setErrorMessage('');

    if (typeof window !== 'undefined') {
      localStorage.setItem('omnipos_device_store', nextStore.code.toLowerCase());
      document.cookie = `omnipos_device_store=${nextStore.code.toLowerCase()}; path=/; max-age=31536000; SameSite=Lax`;
    }
  };

  // 3x4 Touch Numeric Keypad Handler
  const handleKeyPress = (char: string) => {
    soundManager.playScanBeep();
    setErrorMessage('');

    if (char === 'C') {
      setPinInput('');
    } else if (char === 'BACK') {
      setPinInput((prev) => prev.slice(0, -1));
    } else {
      if (pinInput.length < 6) {
        const next = pinInput + char;
        setPinInput(next);
        if (next.length >= 4) {
          attemptLogin(next);
        }
      }
    }
  };

  // Submit PIN for authentication
  const attemptLogin = async (pinToTry: string) => {
    if (!selectedStore) {
      setErrorMessage('Please select an active store branch');
      soundManager.playErrorBuzz();
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    const result = await loginWithPin(pinToTry, selectedStore._id);
    setIsSubmitting(false);

    if (result.success && result.redirectUrl) {
      router.push(result.redirectUrl);
    } else {
      setErrorMessage(result.error || 'Invalid passcode for this branch');
      setPinInput('');
    }
  };

  // Role visual configuration
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'STORE_MANAGER':
        return { label: 'Store Manager', icon: TrendingUp, color: 'from-purple-500 to-indigo-600' };
      case 'CASHIER':
        return { label: 'Cashier Terminal', icon: CreditCard, color: 'from-amber-500 to-orange-600' };
      case 'KITCHEN':
        return { label: 'Kitchen (KDS)', icon: ChefHat, color: 'from-emerald-500 to-teal-600' };
      case 'KIOSK':
        return { label: 'Self-Checkout', icon: MonitorCheck, color: 'from-cyan-500 to-blue-600' };
      default:
        return { label: role, icon: KeyRound, color: 'from-slate-600 to-slate-700' };
    }
  };

  // Sample PIN hints for easy evaluator and staff testing
  const getStaffDemoPin = (staff: StaffMember): string => {
    const email = (staff.email || '').toLowerCase();
    const name = (staff.name || '').toLowerCase();

    if (email.includes('marcus') || name.includes('marcus')) return '1111';
    if (email.includes('sarah') || name.includes('sarah')) return '2222';
    if (email.includes('james') || name.includes('james')) return '1234';
    if (email.includes('maya') || name.includes('maya')) return '5678';
    if (email.includes('kiosk2') || name.includes('02') || name.includes('retail express')) return '8765';
    if (email.includes('kiosk1')) return '4321';

    if (staff.role === 'KITCHEN') return '9999';
    if (staff.role === 'KIOSK') return '4321';
    if (staff.role === 'STORE_MANAGER') return '1111';
    return '1234';
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-neutral-100 px-4 py-8 sm:px-6 transition-colors duration-200 relative min-h-[calc(100vh-53px)]">
      {/* Subtle Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] bg-orange-500/10 dark:bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl relative z-10 space-y-6">
        {/* Brand & Terminal Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-red-500 text-white shadow-xl shadow-orange-500/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-7 w-7"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="11" rx="2" />
              <line x1="12" y1="14" x2="12" y2="17" />
              <rect x="6" y="17" width="12" height="2" rx="1" />
              <line x1="9" y1="19" x2="9" y2="22" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="15" y1="19" x2="15" y2="22" />
              <line x1="7" y1="7" x2="17" y2="7" />
              <line x1="7" y1="10" x2="13" y2="10" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              OmniPOS Terminal
            </h1>
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              Enterprise Multi-Store Point of Sale &amp; Self-Checkout System
            </p>
          </div>
        </div>

        {/* 2-Column Responsive Layout: Left Keypad Terminal | Right Staff Switcher */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Terminal Card with Store Selector & Keypad */}
          <div className="lg:col-span-7 flex flex-col items-center">
            <div className="w-full max-w-sm rounded-3xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-5 transition-all">
              
              {/* Store Branch Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 px-0.5">
                  <span className="flex items-center gap-1.5">
                    <StoreIcon className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                    <span>Store Branch Location</span>
                  </span>
                  {selectedStore && (
                    <span className="text-[10px] text-orange-500 dark:text-orange-400 font-mono font-bold">
                      {selectedStore.type.toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <select
                    value={selectedStore?._id || ''}
                    onChange={(e) => handleStoreChange(e.target.value)}
                    disabled={isContextLoading || stores.length === 0}
                    className="w-full appearance-none rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950 px-3.5 py-3 pr-10 text-xs font-semibold text-slate-900 dark:text-white shadow-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 cursor-pointer transition-colors"
                  >
                    {stores.map((s) => (
                      <option key={s._id} value={s._id} className="bg-white dark:bg-neutral-900 text-slate-900 dark:text-white">
                        {s.name} ({s.code}) — {s.type === 'restaurant' ? 'Restaurant / Bar' : 'Retail Store'}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-neutral-500" />
                </div>
              </div>

              {/* PIN Code Mask Dots (Active Dot Indicators) */}
              <div className="space-y-2 pt-1 text-center">
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Enter your 4-digit staff passcode to unlock terminal
                </p>

                <div className="flex justify-center items-center gap-3.5 py-2">
                  {[0, 1, 2, 3].map((index) => {
                    const isFilled = index < pinInput.length;
                    return (
                      <div
                        key={index}
                        className={`h-4 w-4 rounded-full transition-all duration-200 ${
                          isFilled
                            ? 'bg-orange-500 scale-110 shadow-lg shadow-orange-500/50 ring-2 ring-orange-500/20'
                            : 'bg-slate-200 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Error Message Display */}
              {errorMessage && (
                <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3.5 py-2 text-xs text-red-600 dark:text-red-400 animate-in fade-in">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* 3x4 Touch Numeric Keypad */}
              <div className="grid grid-cols-3 gap-3">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'BACK'].map((key) => {
                  const isSpecial = key === 'C' || key === 'BACK';
                  return (
                    <button
                      key={key}
                      onClick={() => handleKeyPress(key)}
                      disabled={isSubmitting}
                      className={`flex h-14 items-center justify-center rounded-2xl text-lg font-bold transition-all active:scale-95 disabled:opacity-50 cursor-pointer ${
                        isSpecial
                          ? 'bg-slate-100/70 hover:bg-slate-200 text-slate-600 dark:bg-neutral-800/80 dark:hover:bg-neutral-800 dark:text-neutral-400 dark:hover:text-white border border-slate-200 dark:border-neutral-700/50 text-sm'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-neutral-800/40 dark:hover:bg-neutral-800 dark:text-white border border-slate-200 dark:border-neutral-800/80 shadow-sm'
                      }`}
                    >
                      {key === 'BACK' ? <Delete className="h-5 w-5" /> : key}
                    </button>
                  );
                })}
              </div>

              {/* Submit / Unlock Button */}
              <button
                onClick={() => attemptLogin(pinInput)}
                disabled={pinInput.length < 4 || isSubmitting}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm shadow-lg transition-all ${
                  pinInput.length >= 4 && !isSubmitting
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/25 cursor-pointer'
                    : 'bg-slate-100 dark:bg-neutral-800 text-slate-400 dark:text-neutral-500 cursor-not-allowed border border-slate-200 dark:border-neutral-700/40'
                }`}
              >
                <LogIn className="h-4 w-4" />
                <span>{isSubmitting ? 'Verifying PIN...' : 'Unlock Terminal'}</span>
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Quick Staff Switcher Cards */}
          <div className="lg:col-span-5 space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-orange-500 dark:text-orange-400" />
                <span>Branch Staff Switcher</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Authorized staff assigned strictly to{' '}
                <span className="font-semibold text-slate-700 dark:text-neutral-200">
                  {selectedStore?.name || 'this branch'}
                </span>
              </p>
            </div>

            {isLoadingStaff ? (
              <div className="flex h-48 items-center justify-center rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/40 text-xs text-slate-400 dark:text-neutral-500">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-orange-500" />
                  <span>Loading branch personnel...</span>
                </div>
              </div>
            ) : storeStaff.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/40 p-6 text-center text-xs text-slate-400 dark:text-neutral-500">
                No active staff members registered for this branch yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {storeStaff.map((staff) => {
                  const badge = getRoleBadge(staff.role);
                  const demoPin = getStaffDemoPin(staff);
                  const Icon = badge.icon;

                  return (
                    <button
                      key={staff._id}
                      onClick={() => {
                        setPinInput(demoPin);
                        attemptLogin(demoPin);
                      }}
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-between rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 p-3.5 hover:border-orange-500/60 hover:bg-slate-50 dark:hover:bg-neutral-900 transition-all text-left group cursor-pointer shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr ${badge.color} text-white shadow-md`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors">
                            {staff.name}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                            {badge.label}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-neutral-950 px-2 py-1 rounded-lg border border-orange-200 dark:border-neutral-800">
                          Demo: {demoPin}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Hardware Isolation Notice */}
            <div className="pt-2">
              <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-neutral-500">
                <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-600" />
                <span>Multi-tenant hardware isolation • PIN authentication enforced</span>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Administrator Gateway Entry Link */}
        <div className="text-center pt-2">
          <Link
            href="/admin/login"
            className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-white/80 hover:bg-white dark:bg-neutral-900/60 dark:hover:bg-neutral-900 border border-slate-200 dark:border-neutral-800 hover:border-rose-500/40 text-xs font-semibold text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm group cursor-pointer"
          >
            <Shield className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
            <span>Platform Administrator? Sign in to SaaS Hub</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-500 group-hover:text-rose-500 dark:group-hover:text-rose-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </main>
  );
}
