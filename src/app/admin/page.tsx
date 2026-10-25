'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useStore } from '@/context/StoreContext';
import { soundManager } from '@/lib/audio';
import { formatCurrency } from '@/lib/currency';
import {
  Shield,
  Building2,
  DollarSign,
  TrendingUp,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Zap,
  Users,
  Layers,
  ToggleLeft,
  ToggleRight,
  Clock,
  Plus,
  X,
  KeyRound,
  Lock,
  AlertCircle,
} from 'lucide-react';

interface TenantStore {
  storeId: string;
  storeName: string;
  storeCode: string;
  storeType: string;
  ownerName: string;
  ownerEmail: string;
  planTier: 'starter' | 'growth' | 'enterprise';
  subscriptionStatus: 'active' | 'trial' | 'past_due';
  monthlyFee: number;
  totalRevenue: number;
  orderCount: number;
  createdAt: string;
}

interface SaasAnalytics {
  view: string;
  totalTenants: number;
  platformMrr: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  pastDueSubscriptions: number;
  globalRevenue: number;
  globalOrders: number;
  globalAverageTicket: number;
  stores: TenantStore[];
}

export default function SuperAdminSaasDashboard() {
  const { userRole, activeUser, isLoading: isAuthLoading, refreshStores } = useStore();

  const [analytics, setAnalytics] = useState<SaasAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'TENANTS' | 'PLANS'>('TENANTS');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);

  // Onboard New Tenant Modal State
  const [showOnboardModal, setShowOnboardModal] = useState<boolean>(false);
  const [onboardName, setOnboardName] = useState<string>('');
  const [onboardCode, setOnboardCode] = useState<string>('');
  const [onboardType, setOnboardType] = useState<'retail' | 'restaurant'>('retail');
  const [onboardAddress, setOnboardAddress] = useState<string>('');
  const [onboardTaxRate, setOnboardTaxRate] = useState<number>(8.0);
  const [onboardPlanTier, setOnboardPlanTier] = useState<'starter' | 'growth' | 'enterprise'>('growth');
  const [onboardOwnerName, setOnboardOwnerName] = useState<string>('');
  const [onboardOwnerEmail, setOnboardOwnerEmail] = useState<string>('');
  const [onboardInitialPin, setOnboardInitialPin] = useState<string>('1234');
  const [isOnboarding, setIsOnboarding] = useState<boolean>(false);
  const [onboardError, setOnboardError] = useState<string>('');

  const fetchAdminData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/analytics');
      const data = await res.json();
      if (res.ok) {
        setAnalytics(data);
      }
    } catch (err) {
      console.error('Failed to load SaaS admin data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeUser?.role === 'SUPER_ADMIN') {
      fetchAdminData();
    }
  }, [activeUser, fetchAdminData]);

  // Toggle Subscription Status for Tenant Business
  const handleToggleSubscription = async (
    storeId: string,
    currentStatus: 'active' | 'trial' | 'past_due'
  ) => {
    const nextStatus = currentStatus === 'active' ? 'past_due' : 'active';
    setIsUpdatingStatus(storeId);
    try {
      const res = await fetch('/api/stores', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: storeId, subscriptionStatus: nextStatus }),
      });
      if (res.ok) {
        soundManager.playSuccessChime();
        await fetchAdminData();
        await refreshStores();
      }
    } catch (e) {
      console.error('Failed to toggle status:', e);
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  // Handle Onboarding New Tenant Business
  const handleOnboardBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardError('');

    if (!onboardName.trim() || !onboardCode.trim() || !onboardOwnerName.trim() || !onboardOwnerEmail.trim()) {
      setOnboardError('Please fill in all required business and owner details.');
      soundManager.playErrorBuzz();
      return;
    }

    if (!/^\d{4}$/.test(onboardInitialPin)) {
      setOnboardError('Initial manager PIN must be exactly 4 digits.');
      soundManager.playErrorBuzz();
      return;
    }

    setIsOnboarding(true);

    try {
      const res = await fetch('/api/admin/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: onboardName.trim(),
          code: onboardCode.trim().toUpperCase(),
          type: onboardType,
          address: onboardAddress.trim() || 'Headquarters',
          taxRate: onboardTaxRate,
          planTier: onboardPlanTier,
          ownerName: onboardOwnerName.trim(),
          ownerEmail: onboardOwnerEmail.trim().toLowerCase(),
          initialPin: onboardInitialPin,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        soundManager.playErrorBuzz();
        setOnboardError(data.error || 'Failed to onboard business tenant');
        setIsOnboarding(false);
        return;
      }

      soundManager.playSuccessChime();
      setShowOnboardModal(false);
      // Reset form fields
      setOnboardName('');
      setOnboardCode('');
      setOnboardAddress('');
      setOnboardOwnerName('');
      setOnboardOwnerEmail('');
      setOnboardInitialPin('1234');
      setOnboardError('');

      await fetchAdminData();
      await refreshStores();
    } catch {
      soundManager.playErrorBuzz();
      setOnboardError('Network error connecting to tenant onboarding service');
    } finally {
      setIsOnboarding(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-53px)] bg-neutral-950 text-neutral-400">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-rose-500" />
          <span className="text-sm font-medium">Verifying platform credentials...</span>
        </div>
      </div>
    );
  }

  if (!activeUser || activeUser.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4 min-h-[calc(100vh-53px)] bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-white">
        <div className="p-4 rounded-2xl bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20">
          <Shield className="h-12 w-12" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Platform Owner Access Required</h2>
          <p className="text-xs text-slate-500 dark:text-neutral-400 max-w-sm">
            The SaaS Platform Owner Hub requires dedicated platform administrator credentials.
            Store-level staff credentials do not grant access to this portal.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <Link
            href="/admin/login"
            className="rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-900/30 hover:from-rose-500 hover:to-red-500 transition-all cursor-pointer"
          >
            Sign In as Platform Owner
          </Link>
          <Link
            href="/"
            className="rounded-xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 px-5 py-2.5 text-xs font-semibold text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors shadow-sm"
          >
            Return to Staff PIN Terminal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-white min-h-[calc(100vh-53px)] p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header Banner: SaaS Platform Control Center */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/20">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                SaaS Platform Owner Control Hub
              </h1>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                Executive oversight of business tenants, subscription billing, and platform-wide metrics
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab Switcher */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 p-1">
            <button
              onClick={() => setActiveTab('TENANTS')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'TENANTS'
                  ? 'bg-white dark:bg-neutral-800 text-orange-600 dark:text-orange-400 shadow-sm'
                  : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Shop Owner Accounts
            </button>
            <button
              onClick={() => setActiveTab('PLANS')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'PLANS'
                  ? 'bg-white dark:bg-neutral-800 text-orange-600 dark:text-orange-400 shadow-sm'
                  : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Subscription Tiers
            </button>
          </div>

          <button
            onClick={fetchAdminData}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white shadow-sm cursor-pointer"
            title="Refresh Platform Analytics"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setShowOnboardModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-orange-500/20 hover:from-orange-600 hover:to-amber-700 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Onboard Business</span>
          </button>
        </div>
      </div>

      {/* SAAS PLATFORM METRICS STRIP */}
      {analytics && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 p-5 space-y-1 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-neutral-400 text-xs">
              <span>Platform MRR</span>
              <DollarSign className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {formatCurrency(analytics.platformMrr)}
              <span className="text-xs font-normal text-slate-500 dark:text-neutral-400 font-sans">/mo</span>
            </p>
            <p className="text-[11px] text-slate-400 dark:text-neutral-500">From recurring subscriptions</p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 p-5 space-y-1 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-neutral-400 text-xs">
              <span>Tenant Businesses</span>
              <Building2 className="h-4 w-4 text-orange-500 dark:text-orange-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
              {analytics.totalTenants}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-neutral-500">
              {analytics.activeSubscriptions} Active • {analytics.trialSubscriptions} Trial
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 p-5 space-y-1 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-neutral-400 text-xs">
              <span>Platform Gross Volume (GMV)</span>
              <TrendingUp className="h-4 w-4 text-blue-500 dark:text-blue-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
              {formatCurrency(analytics.globalRevenue)}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-neutral-500">Processed across all tenant branches</p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 p-5 space-y-1 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-neutral-400 text-xs">
              <span>Subscription Health</span>
              <CreditCard className="h-4 w-4 text-purple-500 dark:text-purple-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-black font-mono text-purple-600 dark:text-purple-400">
              {analytics.totalTenants > 0
                ? `${Math.round((analytics.activeSubscriptions / analytics.totalTenants) * 100)}%`
                : '100%'}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-neutral-500">
              {analytics.pastDueSubscriptions > 0
                ? `${analytics.pastDueSubscriptions} Past Due Account`
                : 'All accounts in good standing'}
            </p>
          </div>
        </div>
      )}

      {/* TAB 1: SHOP OWNER ACCOUNTS DIRECTORY */}
      {activeTab === 'TENANTS' && analytics && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="h-5 w-5 text-orange-500 dark:text-orange-400" />
              Tenant Shop Owners &amp; Subscriptions
            </h2>
            <span className="text-xs text-slate-500 dark:text-neutral-400">
              Total registered businesses: {analytics.stores.length}
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950 text-slate-500 dark:text-neutral-400 uppercase font-mono tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Business / Brand</th>
                  <th className="px-4 py-3">Shop Owner</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Plan Tier</th>
                  <th className="px-4 py-3">Monthly Billing</th>
                  <th className="px-4 py-3">Subscription Status</th>
                  <th className="px-4 py-3 text-right">Subscription Toggle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/60 font-medium">
                {analytics.stores.map((tenant) => {
                  const isPastDue = tenant.subscriptionStatus === 'past_due';
                  const isTrial = tenant.subscriptionStatus === 'trial';

                  return (
                    <tr key={tenant.storeId} className="hover:bg-slate-50 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900 dark:text-white">{tenant.storeName}</p>
                        <p className="font-mono text-[10px] text-orange-500 dark:text-orange-400">{tenant.storeCode}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-800 dark:text-neutral-200">{tenant.ownerName}</p>
                        <p className="font-mono text-[10px] text-slate-500 dark:text-neutral-500">{tenant.ownerEmail}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] uppercase font-mono font-bold ${
                            tenant.storeType === 'restaurant'
                              ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                              : 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
                          }`}
                        >
                          {tenant.storeType}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] uppercase font-mono font-bold ${
                            tenant.planTier === 'enterprise'
                              ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30'
                              : tenant.planTier === 'growth'
                              ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-500/30'
                              : 'bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300'
                          }`}
                        >
                          {tenant.planTier}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(tenant.monthlyFee)}/mo
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-mono font-bold ${
                            isPastDue
                              ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30'
                              : isTrial
                              ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30'
                              : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                          }`}
                        >
                          {tenant.subscriptionStatus.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() =>
                            handleToggleSubscription(tenant.storeId, tenant.subscriptionStatus)
                          }
                          disabled={isUpdatingStatus === tenant.storeId}
                          className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                            isPastDue
                              ? 'border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
                              : 'border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 text-slate-600 dark:text-neutral-400 hover:border-red-500/40 hover:text-red-600 dark:hover:text-red-400'
                          }`}
                        >
                          {isUpdatingStatus === tenant.storeId
                            ? 'Updating...'
                            : isPastDue
                            ? 'Activate Plan'
                            : 'Set Past Due'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SAAS PRICING TIERS & PLAN MATRIX */}
      {activeTab === 'PLANS' && (
        <div className="space-y-4">
          <div className="text-center max-w-xl mx-auto space-y-2 py-4">
            <h2 className="text-2xl font-black text-white">OmniPOS SaaS Subscription Matrix</h2>
            <p className="text-xs text-neutral-400">
              Subscription tiers provisioned for retail and restaurant shop owners
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Starter Plan */}
            <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 p-6 space-y-4 flex flex-col justify-between shadow-sm">
              <div className="space-y-3">
                <span className="rounded-md bg-slate-100 dark:bg-neutral-800 px-2.5 py-1 text-xs font-mono font-bold text-slate-700 dark:text-neutral-300">
                  STARTER TIER
                </span>
                <div className="pt-2">
                  <p className="text-3xl font-black font-mono text-slate-900 dark:text-white">{formatCurrency(49, { showDecimals: false })}</p>
                  <p className="text-xs text-slate-500 dark:text-neutral-500">per business / month</p>
                </div>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Ideal for small retail boutiques, bakeries, and standalone food stalls.
                </p>
                <ul className="space-y-2 text-xs text-slate-700 dark:text-neutral-300 pt-2 border-t border-slate-200 dark:border-neutral-800">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                    <span>Single Branch Location</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                    <span>1 POS Cashier Terminal</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                    <span>Basic Inventory &amp; Z-Reports</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Growth Plan */}
            <div className="relative rounded-2xl border-2 border-orange-500 bg-white dark:bg-neutral-900 p-6 space-y-4 shadow-xl shadow-orange-500/10 flex flex-col justify-between">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-orange-500 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                Most Popular
              </span>
              <div className="space-y-3">
                <span className="rounded-md bg-orange-100 dark:bg-orange-500/20 px-2.5 py-1 text-xs font-mono font-bold text-orange-600 dark:text-orange-400">
                  GROWTH TIER
                </span>
                <div className="pt-2">
                  <p className="text-3xl font-black font-mono text-slate-900 dark:text-white">{formatCurrency(99, { showDecimals: false })}</p>
                  <p className="text-xs text-slate-500 dark:text-neutral-500">per business / month</p>
                </div>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Built for growing restaurants, bistros, and busy retail shops.
                </p>
                <ul className="space-y-2 text-xs text-slate-700 dark:text-neutral-300 pt-2 border-t border-slate-200 dark:border-neutral-800">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                    <span>Up to 3 Branch Locations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                    <span>Live Kitchen Display System (KDS)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                    <span>Staff PIN Management</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                    <span>Barcode Wedge Hardware Support</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Enterprise Plan */}
            <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 p-6 space-y-4 flex flex-col justify-between shadow-sm">
              <div className="space-y-3">
                <span className="rounded-md bg-purple-100 dark:bg-purple-500/20 px-2.5 py-1 text-xs font-mono font-bold text-purple-700 dark:text-purple-300">
                  ENTERPRISE TIER
                </span>
                <div className="pt-2">
                  <p className="text-3xl font-black font-mono text-slate-900 dark:text-white">{formatCurrency(199, { showDecimals: false })}</p>
                  <p className="text-xs text-slate-500 dark:text-neutral-500">per business / month</p>
                </div>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Full franchise management with customer self-checkout kiosks and SLA support.
                </p>
                <ul className="space-y-2 text-xs text-slate-700 dark:text-neutral-300 pt-2 border-t border-slate-200 dark:border-neutral-800">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                    <span>Unlimited Store Branches</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                    <span>Self-Checkout Kiosk Terminals</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                    <span>Multi-Branch Consolidated Reports</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                    <span>Priority 24/7 Dedicated Support</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ONBOARD NEW TENANT BUSINESS */}
      {showOnboardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 sm:p-8 space-y-6 shadow-2xl my-8 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Onboard New Business Tenant</h3>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">
                    Atomically provisions store branch, billing tier, and store manager credentials
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOnboardModal(false)}
                disabled={isOnboarding}
                className="rounded-xl p-2 text-slate-400 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {onboardError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{onboardError}</span>
              </div>
            )}

            <form onSubmit={handleOnboardBusiness} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Column 1: Store & Billing Details */}
                <div className="space-y-4">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 font-mono">
                    1. Brand &amp; Location Details
                  </h4>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">Store Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Apex Hardware &amp; Tools"
                      value={onboardName}
                      onChange={(e) => setOnboardName(e.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-600 focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">Store Code *</label>
                    <input
                      type="text"
                      placeholder="e.g. APEX-HW"
                      value={onboardCode}
                      onChange={(e) => setOnboardCode(e.target.value.toUpperCase())}
                      required
                      className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 px-3.5 py-2.5 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-600 focus:border-orange-500 focus:outline-none uppercase"
                    />
                    <p className="text-[10px] text-slate-500 dark:text-neutral-500">Unique identifier used for physical POS terminal pairing</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">Category</label>
                      <select
                        value={onboardType}
                        onChange={(e) => setOnboardType(e.target.value as 'retail' | 'restaurant')}
                        className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none"
                      >
                        <option value="retail">Retail Shop</option>
                        <option value="restaurant">Restaurant / Cafe</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">Subscription</label>
                      <select
                        value={onboardPlanTier}
                        onChange={(e) => setOnboardPlanTier(e.target.value as 'starter' | 'growth' | 'enterprise')}
                        className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none"
                      >
                        <option value="starter">Starter ({formatCurrency(49)}/mo)</option>
                        <option value="growth">Growth ({formatCurrency(99)}/mo)</option>
                        <option value="enterprise">Enterprise ({formatCurrency(199)}/mo)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">Headquarters</label>
                      <input
                        type="text"
                        placeholder="e.g. 100 Main St"
                        value={onboardAddress}
                        onChange={(e) => setOnboardAddress(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 px-3 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-600 focus:border-orange-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">Tax Rate (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={onboardTaxRate}
                        onChange={(e) => setOnboardTaxRate(parseFloat(e.target.value) || 0)}
                        className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 px-3 py-2.5 text-xs text-slate-900 dark:text-white font-mono focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Column 2: Initial Manager & Security Policy */}
                <div className="space-y-4">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 font-mono">
                    2. Store Manager Account &amp; Auth
                  </h4>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">Store Manager Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Marcus Wright"
                      value={onboardOwnerName}
                      onChange={(e) => setOnboardOwnerName(e.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-600 focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">Manager Email *</label>
                    <input
                      type="email"
                      placeholder="e.g. marcus@apexhardware.com"
                      value={onboardOwnerEmail}
                      onChange={(e) => setOnboardOwnerEmail(e.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-600 focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">Temporary 4-Digit PIN *</label>
                    <input
                      type="password"
                      maxLength={4}
                      value={onboardInitialPin}
                      onChange={(e) => setOnboardInitialPin(e.target.value.replace(/\D/g, ''))}
                      required
                      className="w-full text-center tracking-widest font-mono text-lg rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 px-3.5 py-2 text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  {/* Security Compliance Alert */}
                  <div className="rounded-xl border border-amber-500/20 bg-amber-50 dark:bg-amber-500/5 p-3 space-y-1.5 text-slate-700 dark:text-neutral-300">
                    <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-xs">
                      <Shield className="w-4 h-4 shrink-0" />
                      <span>Security Policy Enforcement</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-neutral-400 leading-relaxed">
                      Manager accounts created here are assigned <code className="text-amber-700 dark:text-amber-300 font-mono">mustChangePin: true</code>. When the manager logs in at <code className="text-slate-800 dark:text-neutral-300 font-mono">/manager</code>, access is strictly blocked until they configure a new permanent PIN.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowOnboardModal(false)}
                  disabled={isOnboarding}
                  className="rounded-xl border border-slate-200 dark:border-neutral-800 px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isOnboarding || !onboardName || !onboardCode || !onboardOwnerName || !onboardOwnerEmail || onboardInitialPin.length !== 4}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-orange-500/25 hover:from-orange-600 hover:to-amber-700 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isOnboarding ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Committing Transaction...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Provision Tenant Business</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
