'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/context/StoreContext';
import { useTheme } from '@/context/ThemeContext';
import {
  Store as StoreIcon,
  Volume2,
  VolumeX,
  Clock,
  LogOut,
  Lock,
  User,
  Sun,
  Moon,
} from 'lucide-react';

export default function Header() {
  const {
    stores,
    activeStore,
    setActiveStoreId,
    userRole,
    activeUser,
    logout,
    lockTerminal,
    unpairTerminal,
    soundEnabled,
    toggleSound,
  } = useStore();

  const { theme, toggleTheme } = useTheme();
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
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/90 backdrop-blur-md text-slate-900 dark:text-white transition-colors duration-150">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
        {/* Left: Brand Logo & Active Store Branch Selector */}
        <div className="flex items-center gap-4">
          <Link
            href={activeStore?.code ? `/store/${activeStore.code.toLowerCase()}` : '/'}
            className="flex items-center gap-2 group"
          >
            {/* POS Terminal icon */}
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
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 dark:from-white dark:via-neutral-200 dark:to-neutral-400 bg-clip-text text-transparent">
                OmniPOS
              </span>
              {activeStore && pathname !== '/' && (
                <span className="hidden sm:inline-block ml-1.5 text-[10px] uppercase tracking-widest font-semibold px-1.5 py-0.5 rounded-full bg-orange-500/15 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30">
                  {activeStore.type === 'restaurant' ? 'BISTRO' : 'RETAIL'}
                </span>
              )}
            </div>
          </Link>

          {/* Active Store Indicator */}
          {showStorePicker && (
            <div className="relative flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 px-3 py-1.5 text-xs text-slate-700 dark:text-neutral-300">
              <StoreIcon className="h-4 w-4 text-orange-500 dark:text-orange-400 shrink-0" />
              <span className="font-semibold text-slate-900 dark:text-white max-w-[150px] truncate">
                {activeStore!.name}
              </span>
              <span
                className={`hidden md:inline-block text-[10px] px-1.5 py-0.5 rounded font-mono uppercase font-semibold ${
                  activeStore!.type === 'restaurant'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800'
                    : 'bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800'
                }`}
              >
                {activeStore!.type}
              </span>
            </div>
          )}
        </div>

        {/* Right: User Profile, Theme Toggle, Sound FX Toggle, Clock, Lock/Sign Out Button */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Active User Name & Role Badge */}
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 px-2.5 py-1 text-xs">
            <User className="h-3.5 w-3.5 text-slate-500 dark:text-neutral-400" />
            <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[130px]">
              {activeUser ? activeUser.name.split(' ')[0] : userRole.replace('_', ' ')}
            </span>
            <span className="rounded bg-slate-200 dark:bg-neutral-800 px-1.5 py-0.5 text-[10px] font-mono font-bold text-orange-600 dark:text-orange-400">
              {userRole}
            </span>
          </div>

          {/* Theme Mode Toggle (Light / Dark) */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-400 hover:text-orange-500 dark:hover:text-orange-400 hover:bg-slate-200 dark:hover:bg-neutral-800 transition-all"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400 transition-transform duration-200 hover:rotate-45" />
            ) : (
              <Moon className="h-4 w-4 text-indigo-600 transition-transform duration-200 hover:-rotate-12" />
            )}
          </button>

          {/* Sound FX Toggle */}
          <button
            onClick={toggleSound}
            title={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-neutral-800 transition-colors"
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
            ) : (
              <VolumeX className="h-4 w-4 text-slate-400 dark:text-neutral-500" />
            )}
          </button>

          {/* Live Clock */}
          <div className="hidden sm:flex items-center gap-1.5 font-mono text-xs text-slate-500 dark:text-neutral-400 pl-1">
            <Clock className="h-3.5 w-3.5 text-slate-400 dark:text-neutral-500" />
            <span>{currentTime || '--:--:--'}</span>
          </div>

          {/* Lock Terminal Button (Locks staff session to branch PIN screen) */}
          <button
            onClick={lockTerminal}
            id="header-lock-btn"
            title="Lock Terminal (Return to Staff PIN Gate)"
            className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-all cursor-pointer"
          >
            <Lock className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Lock</span>
          </button>

          {/* Unpair / Sign Out of Store Button */}
          <button
            onClick={unpairTerminal}
            id="header-unpair-btn"
            title="Unpair Terminal & Exit Store to Public Landing Page"
            className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Unpair</span>
          </button>
        </div>
      </div>
    </header>
  );
}
