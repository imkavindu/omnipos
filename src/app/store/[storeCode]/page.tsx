'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore, StoreData } from '@/context/StoreContext';
import { soundManager } from '@/lib/audio';
import {
  Store as StoreIcon,
  KeyRound,
  ArrowLeft,
  AlertCircle,
  Delete,
  LogIn,
  CreditCard,
  ChefHat,
  TrendingUp,
  MonitorCheck,
  RefreshCw,
  Lock,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react';

interface StaffMember {
  _id: string;
  name: string;
  role: 'STORE_MANAGER' | 'CASHIER' | 'KITCHEN' | 'KIOSK';
  avatar?: string;
  email: string;
}

type Stage = 'connect' | 'pin';

export default function StorePinTerminalPage({
  params,
}: {
  params: Promise<{ storeCode: string }>;
}) {
  const router = useRouter();
  const { storeCode } = use(params);
  const { setActiveStore, loginWithPin, userRole, activeUser } = useStore();

  const [currentStore, setCurrentStore] = useState<StoreData | null>(null);
  const [storeStaff, setStoreStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);

  // Two-stage auth: 'connect' = store password gate, 'pin' = staff PIN pad
  const [stage, setStage] = useState<Stage>('connect');
  const [storePasswordInput, setStorePasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [connectError, setConnectError] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  const [pinInput, setPinInput] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Manager Authentication Unpair Modal
  const [showUnpairModal, setShowUnpairModal] = useState<boolean>(false);
  const [unpairManagerPin, setUnpairManagerPin] = useState<string>('');
  const [unpairError, setUnpairError] = useState<string>('');
  const [isUnpairing, setIsUnpairing] = useState<boolean>(false);

  useEffect(() => {
    async function loadStore() {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/stores/${encodeURIComponent(storeCode)}`);
        const data = await res.json();

        if (!res.ok || !data.store) {
          setNotFound(true);
          return;
        }

        setCurrentStore(data.store);
        setStoreStaff(data.staff || []);

        // Session check: If device has an active paired store session, unlock PIN pad directly
        if (typeof window !== 'undefined') {
          const pairedStore = localStorage.getItem('omnipos_device_store');
          const storeSessionStr = localStorage.getItem('omnipos_store_session');
          let hasSessionMatch = false;

          if (pairedStore && pairedStore.toLowerCase() === storeCode.toLowerCase()) {
            hasSessionMatch = true;
          } else if (storeSessionStr) {
            try {
              const sessionObj = JSON.parse(storeSessionStr);
              if (sessionObj?.code?.toLowerCase() === storeCode.toLowerCase()) {
                hasSessionMatch = true;
              }
            } catch (_) {
              if (storeSessionStr.toLowerCase().includes(storeCode.toLowerCase())) {
                hasSessionMatch = true;
              }
            }
          }

          if (hasSessionMatch) {
            setActiveStore(data.store);
            setStage('pin');
          } else {
            setStage('connect');
          }
        }
      } catch (err) {
        console.error('Failed to load store terminal:', err);
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    }

    if (storeCode) {
      loadStore();
    }
  }, [storeCode, setActiveStore]);

  // Stage 1: validate the store password via /api/stores/connect
  const handleConnectStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storePasswordInput.trim()) {
      setConnectError('Please enter the store password');
      return;
    }

    setIsConnecting(true);
    setConnectError('');

    try {
      const res = await fetch('/api/stores/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeCode, storePassword: storePasswordInput }),
      });

      const data = await res.json();
      if (!res.ok) {
        soundManager.playErrorBuzz();
        setConnectError(data.error || 'Invalid store code or password');
        setIsConnecting(false);
        return;
      }

      // Provision device to this branch and persist full session tokens
      soundManager.playSuccessChime();
      setActiveStore(data.store);
      if (typeof window !== 'undefined') {
        const sessionPayload = {
          code: data.store.code,
          id: data.store._id,
          name: data.store.name,
          connectedAt: new Date().toISOString(),
        };
        localStorage.setItem('omnipos_device_store', data.store.code.toLowerCase());
        localStorage.setItem('omnipos_store_session', JSON.stringify(sessionPayload));
        localStorage.setItem('omnipos_store_id', data.store._id);
        document.cookie = `omnipos_device_store=${data.store.code.toLowerCase()}; path=/; max-age=31536000; SameSite=Lax`;
        document.cookie = `omnipos_store_session=${data.store.code.toLowerCase()}; path=/; max-age=31536000; SameSite=Lax`;
      }
      setStage('pin');
    } catch {
      soundManager.playErrorBuzz();
      setConnectError('Network error — could not reach the authentication service');
    } finally {
      setIsConnecting(false);
    }
  };

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

  const attemptLogin = async (pinToTry: string) => {
    if (!currentStore) return;
    setIsSubmitting(true);
    setErrorMessage('');
    const result = await loginWithPin(pinToTry, currentStore._id);
    setIsSubmitting(false);

    if (result.success && result.redirectUrl) {
      router.push(result.redirectUrl);
    } else {
      setErrorMessage(result.error || 'Invalid passcode for this branch');
      setPinInput('');
    }
  };

  const hasManagerSession = userRole === 'STORE_MANAGER' || userRole === 'SUPER_ADMIN';

  // Full reset / unpair helper: completely purges omnipos_store_session, omnipos_device_store, omnipos_store_id, cookies, and context
  const fullUnpairTerminal = async () => {
    setIsUnpairing(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      await fetch('/api/terminal/unpair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeCode, managerPin: unpairManagerPin || undefined }),
      });
    } catch (err) {
      console.error('Unpair cleanup error:', err);
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('omnipos_store_session');
        localStorage.removeItem('omnipos_device_store');
        localStorage.removeItem('omnipos_store_id');
        document.cookie = 'omnipos_store_session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax;';
        document.cookie = 'omnipos_device_store=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax;';
        document.cookie = 'omnipos_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax;';
      }
      setActiveStore(null);
      soundManager.playSuccessChime();
      router.push('/store');
    }
  };

  const handleUnpairSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasManagerSession && (!unpairManagerPin || unpairManagerPin.length !== 4)) {
      setUnpairError('Please enter a 4-digit Manager PIN');
      soundManager.playErrorBuzz();
      return;
    }

    setIsUnpairing(true);
    setUnpairError('');

    try {
      const res = await fetch('/api/terminal/unpair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeCode, managerPin: unpairManagerPin || undefined }),
      });

      const data = await res.json();
      if (!res.ok) {
        soundManager.playErrorBuzz();
        setUnpairError(data.error || 'Manager authorization failed');
        setIsUnpairing(false);
        return;
      }

      await fullUnpairTerminal();
    } catch {
      soundManager.playErrorBuzz();
      setUnpairError('Network error connecting to unpair service');
      setIsUnpairing(false);
    }
  };

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
        return { label: role, icon: KeyRound, color: 'from-neutral-600 to-neutral-700' };
    }
  };

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

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-53px)] bg-slate-50 dark:bg-neutral-950 text-slate-500 dark:text-neutral-400">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-orange-500" />
          <span className="text-sm font-medium">Loading branch terminal...</span>
        </div>
      </div>
    );
  }

  if (notFound || !currentStore) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4 min-h-[calc(100vh-53px)] bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-white">
        <div className="p-4 rounded-2xl bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20">
          <AlertCircle className="h-12 w-12" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Store Branch Not Found</h2>
          <p className="text-xs text-slate-500 dark:text-neutral-400 max-w-sm">
            No registered store branch matches the identifier &ldquo;<span className="font-mono text-rose-500 dark:text-rose-400">{storeCode}</span>&rdquo;.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Home
        </Link>
      </div>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 px-4 py-8 sm:px-6">
      <div className="w-full max-w-4xl space-y-6">
        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              if (stage === 'connect') {
                fullUnpairTerminal();
              } else {
                setUnpairError('');
                setUnpairManagerPin('');
                setShowUnpairModal(true);
              }
            }}
            id="terminal-unpair-nav-btn"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white transition-colors group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>{stage === 'connect' ? 'Change Store / Return Home' : 'Unpair Terminal / Re-provision'}</span>
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-neutral-400 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 px-3 py-1.5 rounded-xl shadow-sm">
            <span className={`w-2 h-2 rounded-full ${stage === 'pin' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="font-mono uppercase font-bold text-slate-800 dark:text-neutral-200">{currentStore.code}</span>
            <span className="text-slate-400 dark:text-neutral-500">•</span>
            <span className="uppercase text-[10px] tracking-wider text-orange-500 dark:text-orange-400 font-semibold">{currentStore.type}</span>
          </div>
        </div>

        {/* ─── STAGE 1: Store Password Gate ─── */}
        {stage === 'connect' && (
          <div className="flex flex-col items-center">
            <div className="w-full max-w-sm rounded-3xl border border-slate-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
              {/* Store Branding */}
              <div className="text-center space-y-2">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-red-500 text-white shadow-xl shadow-orange-500/25">
                  <Lock className="h-7 w-7" />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {currentStore.name}
                </h1>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Enter the store connection password to unlock this terminal
                </p>
              </div>

              {connectError && (
                <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3.5 py-2.5 text-xs text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{connectError}</span>
                </div>
              )}

              <form onSubmit={handleConnectStore} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                    Store Password
                  </label>
                  <div className="relative">
                    <input
                      id="store-password-input"
                      type={showPassword ? 'text' : 'password'}
                      value={storePasswordInput}
                      onChange={(e) => {
                        setStorePasswordInput(e.target.value);
                        if (connectError) setConnectError('');
                      }}
                      placeholder="Enter store password"
                      autoFocus
                      autoComplete="current-password"
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
                  disabled={isConnecting || !storePasswordInput.trim()}
                  id="connect-store-btn"
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm shadow-lg transition-all cursor-pointer bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>{isConnecting ? 'Verifying...' : 'Connect to Store'}</span>
                </button>
              </form>

              {/* Demo hint */}
              <p className="text-center text-[11px] text-slate-400 dark:text-neutral-600">
                Demo passwords:{' '}
                <span className="font-mono font-semibold text-orange-500 dark:text-orange-400">
                  Bistro2026! · Tech2026! · Bakery2026!
                </span>
              </p>
            </div>
          </div>
        )}

        {/* ─── STAGE 2: Staff PIN Pad ─── */}
        {stage === 'pin' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT COLUMN: Terminal Keypad */}
            <div className="lg:col-span-7 flex flex-col items-center">
              <div className="w-full max-w-sm rounded-3xl border border-slate-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
                {/* Store Branding */}
                <div className="text-center space-y-2">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-red-500 text-white shadow-xl shadow-orange-500/25">
                    <StoreIcon className="h-7 w-7" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white line-clamp-1">
                      {currentStore.name}
                    </h1>
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Store Connected & Verified</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">
                    Enter your 4-digit staff passcode to unlock terminal
                  </p>
                </div>

                {/* PIN Code Mask Dots */}
                <div className="flex justify-center items-center gap-3 py-3">
                  {[0, 1, 2, 3].map((index) => {
                    const isFilled = index < pinInput.length;
                    return (
                      <div
                        key={index}
                        className={`h-4 w-4 rounded-full transition-all duration-200 ${
                          isFilled
                            ? 'bg-orange-500 scale-110 shadow-lg shadow-orange-500/50'
                            : 'bg-slate-200 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700'
                        }`}
                      />
                    );
                  })}
                </div>

                {/* Error Message */}
                {errorMessage && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3.5 py-2 text-xs text-red-600 dark:text-red-400">
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
                            ? 'bg-slate-100 dark:bg-neutral-800/80 text-slate-600 dark:text-neutral-400 hover:bg-slate-200 dark:hover:bg-neutral-800 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-neutral-700/50 text-sm'
                            : 'bg-slate-50 dark:bg-neutral-800/40 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800/80 shadow-sm'
                        }`}
                      >
                        {key === 'BACK' ? <Delete className="h-5 w-5" /> : key}
                      </button>
                    );
                  })}
                </div>

                {/* Submit Button */}
                <button
                  onClick={() => attemptLogin(pinInput)}
                  disabled={pinInput.length < 4 || isSubmitting}
                  className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm shadow-lg transition-all cursor-pointer ${
                    pinInput.length >= 4 && !isSubmitting
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/25'
                      : 'bg-slate-100 dark:bg-neutral-800 text-slate-400 dark:text-neutral-500 cursor-not-allowed border border-slate-200 dark:border-neutral-700/40'
                  }`}
                >
                  <LogIn className="h-4 w-4" />
                  <span>{isSubmitting ? 'Verifying PIN...' : 'Unlock Terminal'}</span>
                </button>

                {/* Secondary paired status & unpair action */}
                <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-neutral-400">
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" /> Paired Branch
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setUnpairError('');
                      setUnpairManagerPin('');
                      setShowUnpairModal(true);
                    }}
                    id="terminal-unpair-link"
                    className="text-slate-400 dark:text-neutral-500 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer underline underline-offset-2"
                  >
                    Unpair Terminal
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Branch-Scoped Staff Directory */}
            <div className="lg:col-span-5 space-y-4">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-orange-500 dark:text-orange-400" />
                  Branch Staff Switcher
                </h2>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Authorized personnel assigned strictly to {currentStore.name}
                </p>
              </div>

              {storeStaff.length === 0 ? (
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
                        className="w-full flex items-center justify-between rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/60 p-3.5 hover:border-orange-500/60 hover:bg-slate-50 dark:hover:bg-neutral-900 transition-all text-left group cursor-pointer shadow-sm"
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
            </div>
          </div>
        )}
      </div>

      {/* Manager Authentication Unpair Modal */}
      {showUnpairModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Unpair Terminal</h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Store Manager authorization is required to unpair this terminal from{' '}
                <span className="text-slate-900 dark:text-white font-semibold">{currentStore.name}</span>.
              </p>
            </div>

            {unpairError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{unpairError}</span>
              </div>
            )}

            <form onSubmit={handleUnpairSubmit} className="space-y-4">
              {hasManagerSession ? (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs">
                  <p className="font-semibold">Authenticated Manager Session Verified</p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400/80 mt-0.5">
                    Signed in as {activeUser?.name || 'Manager'} ({userRole}). Your session credentials will be verified server-side.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-neutral-400 mb-2">
                    Manager 4-Digit Passcode
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={unpairManagerPin}
                    onChange={(e) => {
                      setUnpairManagerPin(e.target.value.replace(/\D/g, ''));
                      if (unpairError) setUnpairError('');
                    }}
                    placeholder="••••"
                    autoFocus
                    required
                    className="w-full text-center tracking-widest font-mono text-xl bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-700 focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-neutral-500 mt-1 text-center">
                    Requires PIN of an active Store Manager for this branch
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isUnpairing || (!hasManagerSession && unpairManagerPin.length !== 4)}
                  id="authorize-unpair-submit-btn"
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-xs font-bold text-black transition-colors cursor-pointer"
                >
                  {isUnpairing ? 'Verifying...' : 'Authorize Manager & Unpair'}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowUnpairModal(false)}
                    disabled={isUnpairing}
                    className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 text-xs font-semibold text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => fullUnpairTerminal()}
                    disabled={isUnpairing}
                    id="force-disconnect-btn"
                    className="flex-1 py-2 rounded-xl border border-red-500/30 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                  >
                    Force Disconnect
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
