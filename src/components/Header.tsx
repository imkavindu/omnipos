'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/context/StoreContext';
import {
  Store as StoreIcon,
  Volume2,
  VolumeX,
  Clock,
  LogOut,
  User,
} from 'lucide-react';

export default function Header() {
  const {
    stores,
    activeStore,
    setActiveStoreId,
    userRole,
    activeUser,
    logout,
    soundEnabled,
    toggleSound,
  } = useStore();

  const pathname = usePathname();

  // Show the store picker only when:
  // 1. There IS an active store in context (name is available), AND
  // 2. The user is NOT SUPER_ADMIN (they have no storeId — admin portal needs no store picker), AND
  // 3. We are NOT on the root pairing/identification screen (no store selected yet)
  const showStorePicker =
    !!activeStore &&
    userRole !== 'SUPER_ADMIN' &&
    pathname !== '/';

  const [currentTime, setCurrentTime] = useState<string>('');

  // Live time ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-800 bg-neutral-950/90 backdrop-blur-md text-white transition-all">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
        {/* Left: Brand Logo & Active Store Branch Selector */}
        <div className="flex items-center gap-4">
          <Link
            href={activeStore?.code ? `/store/${activeStore.code.toLowerCase()}` : '/'}
            className="flex items-center gap-2 group"
          >
            {/* POS Terminal icon — inline SVG, no external dependency */}
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
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
            <div>
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
                OmniPOS
              </span>
              {/* BISTRO/RETAIL badge: guard with BOTH activeStore AND pathname check.
                  activeStore can be hydrated from localStorage on the root '/' screen
                  (device-pairing cookie restores it on mount), so checking activeStore
                  alone is not sufficient — the badge would leak through on '/'. */}
              {activeStore && pathname !== '/' && (
                <span className="hidden sm:inline-block ml-1.5 text-[10px] uppercase tracking-widest font-semibold px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  {activeStore.type === 'restaurant' ? 'BISTRO' : 'RETAIL'}
                </span>
              )}
            </div>
          </Link>

          {/* Active Store Indicator — only render when a store is selected and user is store-scoped */}
          {showStorePicker && (
            <div className="relative flex items-center gap-2 rounded-xl bg-neutral-900 border border-neutral-800 px-3 py-1.5 text-xs text-neutral-300">
              <StoreIcon className="h-4 w-4 text-orange-400 shrink-0" />
              <span className="font-medium text-white max-w-[150px] truncate">
                {activeStore!.name}
              </span>
              <span
                className={`hidden md:inline-block text-[10px] px-1.5 py-0.5 rounded font-mono uppercase font-semibold ${
                  activeStore!.type === 'restaurant'
                    ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                    : 'bg-blue-950/80 text-blue-300 border border-blue-800'
                }`}
              >
                {activeStore!.type}
              </span>
            </div>
          )}
        </div>

        {/* Right: User Profile & Role Badge, Sound FX Toggle, Clock, Lock/Sign Out Button */}
        <div className="flex items-center gap-2.5">
          {/* Active User Name & Role Badge */}
          <div className="flex items-center gap-1.5 rounded-xl bg-neutral-900 border border-neutral-800 px-2.5 py-1 text-xs">
            <User className="h-3.5 w-3.5 text-neutral-400" />
            <span className="font-semibold text-white truncate max-w-[130px]">
              {activeUser ? activeUser.name.split(' ')[0] : userRole.replace('_', ' ')}
            </span>
            <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] font-mono text-orange-400">
              {userRole}
            </span>
          </div>

          {/* Sound FX Toggle */}
          <button
            onClick={toggleSound}
            title={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <VolumeX className="h-4 w-4 text-neutral-500" />
            )}
          </button>

          {/* Live Clock */}
          <div className="hidden sm:flex items-center gap-1.5 font-mono text-xs text-neutral-400 pl-1">
            <Clock className="h-3.5 w-3.5 text-neutral-500" />
            <span>{currentTime || '--:--:--'}</span>
          </div>

          {/* Lock / Sign Out Button */}
          <button
            onClick={logout}
            title="Lock Terminal / Sign Out to Authentication Gate"
            className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-all"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Lock</span>
          </button>
        </div>
      </div>
    </header>
  );
}
