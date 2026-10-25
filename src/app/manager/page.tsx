'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useStore } from '@/context/StoreContext';
import { soundManager } from '@/lib/audio';
import {
  TrendingUp,
  Boxes,
  Users,
  Building2,
  AlertCircle,
  Plus,
  Printer,
  CheckCircle2,
  RefreshCw,
  ShoppingBag,
  DollarSign,
  CreditCard,
  Banknote,
  Barcode,
  KeyRound,
  Shield,
  ChefHat,
  MonitorCheck,
  Lock,
} from 'lucide-react';

interface ManagerAnalytics {
  view: string;
  store: {
    id: string;
    name: string;
    code: string;
    currencySymbol: string;
    taxRate: number;
  };
  summary: {
    totalSales: number;
    subtotal: number;
    totalTax: number;
    totalDiscount: number;
    orderCount: number;
    averageTicket: number;
    pendingKdsCount: number;
  };
  payments: {
    cash: number;
    card: number;
    kiosk: number;
  };
  topItems: Array<{ name: string; qty: number; revenue: number }>;
  lowStockCount: number;
  lowStockProducts: Array<{
    _id: string;
    name: string;
    sku: string;
    stockQuantity: number;
    lowStockThreshold: number;
  }>;
}

interface ProductItem {
  _id: string;
  name: string;
  category: string;
  price: number;
  costPrice: number;
  sku: string;
  barcode: string;
  stockQuantity: number;
  lowStockThreshold: number;
}

interface StaffUser {
  _id: string;
  name: string;
  email: string;
  pinCode: string;
  role: 'STORE_MANAGER' | 'CASHIER' | 'KITCHEN' | 'KIOSK';
  storeId?: string;
  isActive: boolean;
}

export default function ManagerPortal() {
  const {
    activeStore,
    stores,
    refreshStores,
    userRole,
    activeUser,
    setActiveUser,
    logout,
    isLoading: isContextLoading,
  } = useStore();

  const [analytics, setAnalytics] = useState<ManagerAnalytics | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'ZREPORT' | 'INVENTORY' | 'STAFF' | 'BRANCHES'>('ZREPORT');

  // Security Gate: Forced PIN Change for provisioned managers
  const [newPin, setNewPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [pinChangeError, setPinChangeError] = useState<string>('');
  const [isUpdatingPin, setIsUpdatingPin] = useState<boolean>(false);

  // Modal 1: Stock Adjustment
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [isUpdatingStock, setIsUpdatingStock] = useState<boolean>(false);

  // Modal 2: Add Staff Member
  const [showAddStaffModal, setShowAddStaffModal] = useState<boolean>(false);
  const [staffName, setStaffName] = useState<string>('');
  const [staffEmail, setStaffEmail] = useState<string>('');
  const [staffRole, setStaffRole] = useState<'CASHIER' | 'KITCHEN' | 'KIOSK' | 'STORE_MANAGER'>('CASHIER');
  const [staffPin, setStaffPin] = useState<string>('');
  const [staffError, setStaffError] = useState<string>('');
  const [isCreatingStaff, setIsCreatingStaff] = useState<boolean>(false);

  // Modal 3: Add Branch Location
  const [showAddBranchModal, setShowAddBranchModal] = useState<boolean>(false);
  const [branchCode, setBranchCode] = useState<string>('');
  const [branchName, setBranchName] = useState<string>('');
  const [branchType, setBranchType] = useState<'restaurant' | 'retail'>('restaurant');
  const [branchAddress, setBranchAddress] = useState<string>('');
  const [branchTaxRate, setBranchTaxRate] = useState<number>(8.0);
  const [isCreatingBranch, setIsCreatingBranch] = useState<boolean>(false);

  const fetchManagerData = useCallback(async () => {
    if (!activeStore) return;
    try {
      setIsLoading(true);
      const [analyticsRes, productsRes, usersRes] = await Promise.all([
        fetch(`/api/analytics?storeId=${activeStore._id}`),
        fetch(`/api/products?storeId=${activeStore._id}`),
        fetch(`/api/users?storeId=${activeStore._id}`),
      ]);

      const analyticsData = await analyticsRes.json();
      const productsData = await productsRes.json();
      const usersData = await usersRes.json();

      if (analyticsRes.ok) setAnalytics(analyticsData);
      if (productsRes.ok && Array.isArray(productsData)) setProducts(productsData);
      if (usersRes.ok && Array.isArray(usersData)) setStaffUsers(usersData);
    } catch (err) {
      console.error('Failed to load manager portal data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeStore]);

  useEffect(() => {
    fetchManagerData();
  }, [fetchManagerData]);

  // Handle Stock adjustment
  const handleStockAdjustment = async (delta: number) => {
    if (!selectedProduct) return;
    setIsUpdatingStock(true);
    try {
      const res = await fetch(`/api/products/${selectedProduct._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deltaStock: delta }),
      });
      const updated = await res.json();
      if (res.ok) {
        soundManager.playSuccessChime();
        setSelectedProduct(null);
        fetchManagerData();
      } else {
        alert(updated.error || 'Failed to adjust stock');
      }
    } catch {
      alert('Error updating stock');
    } finally {
      setIsUpdatingStock(false);
    }
  };

  // Handle Add Staff Member
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStore) return;
    setStaffError('');
    setIsCreatingStaff(true);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name: staffName,
          email: staffEmail,
          role: staffRole,
          pinCode: staffPin,
          storeId: activeStore._id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStaffError(data.error || 'Failed to create staff member');
      } else {
        soundManager.playSuccessChime();
        setShowAddStaffModal(false);
        setStaffName('');
        setStaffEmail('');
        setStaffPin('');
        fetchManagerData();
      }
    } catch {
      setStaffError('Network error adding staff member');
    } finally {
      setIsCreatingStaff(false);
    }
  };

  // Handle Add Branch Location
  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingBranch(true);
    try {
      const res = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: branchCode,
          name: branchName,
          type: branchType,
          address: branchAddress,
          taxRate: branchTaxRate,
          currency: 'USD',
          currencySymbol: '$',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        soundManager.playSuccessChime();
        setShowAddBranchModal(false);
        setBranchCode('');
        setBranchName('');
        setBranchAddress('');
        await refreshStores();
        fetchManagerData();
      } else {
        alert(data.error || 'Failed to create branch');
      }
    } catch {
      alert('Error creating branch');
    } finally {
      setIsCreatingBranch(false);
    }
  };

  // Handler: Forced PIN Change for newly onboarded managers
  const handleForcePinChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser) return;

    if (newPin.length !== 4) {
      setPinChangeError('New PIN must be exactly 4 digits');
      soundManager.playErrorBuzz();
      return;
    }

    if (!/^\d{4}$/.test(newPin)) {
      setPinChangeError('PIN must contain only numbers');
      soundManager.playErrorBuzz();
      return;
    }

    if (newPin !== confirmPin) {
      setPinChangeError('Passcode confirmation does not match');
      soundManager.playErrorBuzz();
      return;
    }

    setIsUpdatingPin(true);
    setPinChangeError('');

    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeUser.id,
          pinCode: newPin,
          mustChangePin: false,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        soundManager.playErrorBuzz();
        setPinChangeError(data.error || 'Failed to update passcode');
        setIsUpdatingPin(false);
        return;
      }

      soundManager.playSuccessChime();
      setActiveUser({
        ...activeUser,
        mustChangePin: false,
      });
      setNewPin('');
      setConfirmPin('');
    } catch {
      soundManager.playErrorBuzz();
      setPinChangeError('Network error updating security PIN');
    } finally {
      setIsUpdatingPin(false);
    }
  };

  if (isContextLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-53px)] bg-neutral-950 text-neutral-400">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-orange-500" />
          <span className="text-sm font-medium">Verifying manager credentials...</span>
        </div>
      </div>
    );
  }

  if (userRole !== 'STORE_MANAGER' && userRole !== 'SUPER_ADMIN') {
    let returnUrl = '/pos';
    if (userRole === 'KITCHEN') returnUrl = '/kds';
    else if (userRole === 'KIOSK') returnUrl = '/kiosk';

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4 min-h-[calc(100vh-53px)] bg-neutral-950 text-white">
        <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <Lock className="h-12 w-12" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white">Management Access Restricted</h2>
          <p className="text-xs text-neutral-400 max-w-sm">
            Branch financials, staff PIN configuration, and inventory controls are restricted to Store Managers and Shop Owners.
          </p>
        </div>
        <Link
          href={returnUrl}
          className="rounded-xl bg-orange-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-colors"
        >
          Return to Assigned Terminal
        </Link>
      </div>
    );
  }

  // MANDATORY SECURITY GATE: If manager has mustChangePin === true, block all manager access
  if (activeUser?.mustChangePin) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-[calc(100vh-53px)] bg-neutral-950 text-white">
        <div className="w-full max-w-md rounded-3xl border border-amber-500/30 bg-neutral-900/90 p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-md">
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <KeyRound className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">
              Security Compliance: Set Your New PIN
            </h2>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              Your store manager account was provisioned with a temporary passcode. For security compliance, you must set a permanent 4-digit PIN before you can access branch management, inventory, or financials.
            </p>
          </div>

          {pinChangeError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{pinChangeError}</span>
            </div>
          )}

          <form onSubmit={handleForcePinChange} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                New 4-Digit Passcode
              </label>
              <input
                type="password"
                maxLength={4}
                value={newPin}
                onChange={(e) => {
                  setNewPin(e.target.value.replace(/\D/g, ''));
                  if (pinChangeError) setPinChangeError('');
                }}
                placeholder="••••"
                autoFocus
                required
                className="w-full text-center tracking-widest font-mono text-2xl bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-700 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Confirm New Passcode
              </label>
              <input
                type="password"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => {
                  setConfirmPin(e.target.value.replace(/\D/g, ''));
                  if (pinChangeError) setPinChangeError('');
                }}
                placeholder="••••"
                required
                className="w-full text-center tracking-widest font-mono text-2xl bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-700 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isUpdatingPin || newPin.length !== 4 || confirmPin.length !== 4}
              className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-xs font-black text-black shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isUpdatingPin ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Updating Security Credentials...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Update PIN &amp; Unlock Manager Portal</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-neutral-800 text-center">
            <button
              type="button"
              onClick={() => logout()}
              className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
            >
              Sign out of this session
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-neutral-950 text-white min-h-[calc(100vh-53px)] p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header: Store Manager / Shop Owner Command Center */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-orange-500/20 px-2 py-0.5 font-mono text-xs font-bold text-orange-400">
              {activeStore?.code}
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              {activeStore ? activeStore.name : 'Store Manager Portal'}
            </h1>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Shop Owner Command: Branch financials, staff PIN management, inventory, and locations
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* 4 Tabs: Z-Report, Inventory, Staff & PINs, Branches */}
          <div className="flex rounded-xl bg-neutral-900 border border-neutral-800 p-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('ZREPORT')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'ZREPORT'
                  ? 'bg-neutral-800 text-orange-400 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Daily Z-Report
            </button>
            <button
              onClick={() => setActiveTab('INVENTORY')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'INVENTORY'
                  ? 'bg-neutral-800 text-orange-400 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Inventory Tracking
            </button>
            <button
              onClick={() => setActiveTab('STAFF')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'STAFF'
                  ? 'bg-neutral-800 text-orange-400 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Staff &amp; PINs
            </button>
            <button
              onClick={() => setActiveTab('BRANCHES')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'BRANCHES'
                  ? 'bg-neutral-800 text-orange-400 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Branches
            </button>
          </div>

          <button
            onClick={fetchManagerData}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white shrink-0"
            title="Refresh Store Data"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* TAB 1: DAILY Z-REPORT & FINANCIALS */}
      {activeTab === 'ZREPORT' && analytics && (
        <div className="space-y-6">
          {/* Financial Summary Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-1">
              <div className="flex items-center justify-between text-neutral-400 text-xs">
                <span>Today Gross Sales</span>
                <DollarSign className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
                ${analytics.summary.totalSales.toFixed(2)}
              </p>
              <p className="text-[11px] text-neutral-500">
                Net Subtotal: ${analytics.summary.subtotal.toFixed(2)}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-1">
              <div className="flex items-center justify-between text-neutral-400 text-xs">
                <span>Tax Collected ({analytics.store.taxRate}%)</span>
                <span className="font-mono text-xs text-orange-400">STATE</span>
              </div>
              <p className="text-2xl sm:text-3xl font-black font-mono text-white">
                ${analytics.summary.totalTax.toFixed(2)}
              </p>
              <p className="text-[11px] text-neutral-500">Sales tax automated accrual</p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-1">
              <div className="flex items-center justify-between text-neutral-400 text-xs">
                <span>Transactions Today</span>
                <ShoppingBag className="h-4 w-4 text-blue-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-black font-mono text-white">
                {analytics.summary.orderCount}
              </p>
              <p className="text-[11px] text-neutral-500">
                Avg Ticket: ${analytics.summary.averageTicket.toFixed(2)}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-1">
              <div className="flex items-center justify-between text-neutral-400 text-xs">
                <span>Low-Stock Warnings</span>
                <AlertCircle className="h-4 w-4 text-amber-400" />
              </div>
              <p
                className={`text-2xl sm:text-3xl font-black font-mono ${
                  analytics.lowStockCount > 0 ? 'text-amber-400' : 'text-neutral-400'
                }`}
              >
                {analytics.lowStockCount}
              </p>
              <p className="text-[11px] text-neutral-500">Below reorder threshold</p>
            </div>
          </div>

          {/* Payment Tender Breakdown & Top Items */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-orange-400" />
                  Daily Register Tender Breakdown
                </h3>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-950 px-2.5 py-1 text-xs font-bold text-neutral-300 hover:text-white"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Report</span>
                </button>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-semibold">Cash Drawer</span>
                  </div>
                  <span className="font-mono text-sm font-bold text-white">
                    ${analytics.payments.cash.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-blue-400" />
                    <span className="text-xs font-semibold">Card Terminal</span>
                  </div>
                  <span className="font-mono text-sm font-bold text-white">
                    ${analytics.payments.card.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-purple-400" />
                    <span className="text-xs font-semibold">Self-Checkout Kiosk</span>
                  </div>
                  <span className="font-mono text-sm font-bold text-white">
                    ${analytics.payments.kiosk.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                Top 5 Best-Selling Items
              </h3>

              {analytics.topItems.length === 0 ? (
                <p className="text-xs text-neutral-500 py-6 text-center">No sales recorded today</p>
              ) : (
                <div className="space-y-2">
                  {analytics.topItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-800 font-mono text-[10px] font-bold text-neutral-400">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-white">{item.name}</span>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-neutral-400">{item.qty} sold • </span>
                        <span className="font-bold text-emerald-400">${item.revenue.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INVENTORY TRACKING & STOCK RECONCILIATION */}
      {activeTab === 'INVENTORY' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Boxes className="h-5 w-5 text-orange-400" />
                Branch Inventory Ledger
              </h2>
              <p className="text-xs text-neutral-400">
                Track stock quantities, barcodes, and trigger quick restocks
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-900/60 shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-neutral-800 bg-neutral-950 text-neutral-400 uppercase font-mono tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Barcode</th>
                  <th className="px-4 py-3">Unit Price</th>
                  <th className="px-4 py-3">In Stock</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 font-medium">
                {products.map((p) => {
                  const isLow = p.stockQuantity <= p.lowStockThreshold;
                  const isOut = p.stockQuantity <= 0;

                  return (
                    <tr key={p._id} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="px-4 py-3 font-bold text-white">{p.name}</td>
                      <td className="px-4 py-3 font-mono text-neutral-400">{p.sku}</td>
                      <td className="px-4 py-3 font-mono text-orange-400 flex items-center gap-1">
                        <Barcode className="h-3 w-3" />
                        <span>{p.barcode}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-white">${p.price.toFixed(2)}</td>
                      <td className="px-4 py-3 font-mono font-bold text-white">
                        {p.stockQuantity} units
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold font-mono ${
                            isOut
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : isLow
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {isOut ? 'OUT OF STOCK' : isLow ? 'LOW STOCK' : 'IN STOCK'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedProduct(p)}
                          className="rounded-lg border border-neutral-700 bg-neutral-950 px-2.5 py-1 text-[11px] font-bold text-orange-400 hover:border-orange-500 hover:bg-neutral-900 transition-colors"
                        >
                          Adjust Stock
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

      {/* TAB 3: STAFF & PIN ADMINISTRATION */}
      {activeTab === 'STAFF' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-orange-400" />
                Staff Members &amp; Terminal PIN Codes
              </h2>
              <p className="text-xs text-neutral-400">
                Provision cashiers, kitchen staff, and kiosks with dedicated 4-digit PINs for {activeStore?.name}
              </p>
            </div>

            <button
              onClick={() => setShowAddStaffModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:opacity-95"
            >
              <Plus className="h-4 w-4" />
              <span>Add Staff Member</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-900/60 shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-neutral-800 bg-neutral-950 text-neutral-400 uppercase font-mono tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Staff Name</th>
                  <th className="px-4 py-3">Email Address</th>
                  <th className="px-4 py-3">Operational Role</th>
                  <th className="px-4 py-3">Assigned 4-Digit PIN</th>
                  <th className="px-4 py-3">Assigned Workspace</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 font-medium">
                {staffUsers.map((u) => {
                  let workspaceName = '/pos (Cashier Terminal)';
                  if (u.role === 'KITCHEN') workspaceName = '/kds (Kitchen Display)';
                  else if (u.role === 'KIOSK') workspaceName = '/kiosk (Self-Checkout)';
                  else if (u.role === 'STORE_MANAGER') workspaceName = '/manager (Management)';

                  return (
                    <tr key={u._id} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="px-4 py-3 font-bold text-white">{u.name}</td>
                      <td className="px-4 py-3 font-mono text-neutral-400">{u.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-mono font-bold ${
                            u.role === 'STORE_MANAGER'
                              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                              : u.role === 'CASHIER'
                              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                              : u.role === 'KITCHEN'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-black text-orange-400 flex items-center gap-1.5">
                        <KeyRound className="h-3.5 w-3.5 text-orange-400" />
                        <span>{u.pinCode}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-neutral-400">
                        {workspaceName}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="rounded-md bg-emerald-500/10 text-emerald-400 px-2 py-0.5 text-[10px] font-bold font-mono">
                          ACTIVE
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: BRANCH LOCATIONS MANAGEMENT */}
      {activeTab === 'BRANCHES' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="h-5 w-5 text-orange-400" />
                Store Branches &amp; Franchise Locations
              </h2>
              <p className="text-xs text-neutral-400">
                Shop owners can provision and oversee multiple retail or restaurant branches
              </p>
            </div>

            <button
              onClick={() => setShowAddBranchModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:opacity-95"
            >
              <Plus className="h-4 w-4" />
              <span>Add Store Location</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {stores.map((branch) => (
              <div
                key={branch._id}
                className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-orange-400">{branch.code}</span>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] uppercase font-mono font-bold ${
                      branch.type === 'restaurant'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-blue-500/20 text-blue-300'
                    }`}
                  >
                    {branch.type}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-sm text-white">{branch.name}</h3>
                  <p className="text-xs text-neutral-400 mt-0.5">{branch.address || 'Address on file'}</p>
                </div>

                <div className="pt-2 border-t border-neutral-800 text-xs text-neutral-400 flex justify-between">
                  <span>State Tax Rate:</span>
                  <span className="font-mono font-bold text-white">{branch.taxRate}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: STOCK ADJUSTMENT */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div>
                <h3 className="font-bold text-sm">Adjust Stock Level</h3>
                <p className="text-xs text-neutral-400">{selectedProduct.name}</p>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-neutral-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-neutral-950 p-3 font-mono text-xs">
              <span className="text-neutral-400">Current On Hand:</span>
              <span className="text-base font-bold text-white">
                {selectedProduct.stockQuantity} units
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-400">Quick Increment (+ / -):</label>
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 25, 50].map((val) => (
                  <button
                    key={val}
                    onClick={() => handleStockAdjustment(val)}
                    disabled={isUpdatingStock}
                    className="rounded-xl border border-neutral-800 bg-neutral-950 py-2 font-mono text-xs font-bold text-emerald-400 hover:border-emerald-500 hover:bg-neutral-900"
                  >
                    +{val}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[-1, -5, -10].map((val) => (
                  <button
                    key={val}
                    onClick={() => handleStockAdjustment(val)}
                    disabled={isUpdatingStock}
                    className="rounded-xl border border-neutral-800 bg-neutral-950 py-2 font-mono text-xs font-bold text-red-400 hover:border-red-500 hover:bg-neutral-900"
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD STAFF MEMBER & PIN */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-orange-400" />
                <h3 className="font-bold text-sm">Add Staff Member &amp; PIN</h3>
              </div>
              <button
                onClick={() => setShowAddStaffModal(false)}
                className="text-neutral-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-3">
              {staffError && (
                <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-xs text-red-300">
                  {staffError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-400">Full Name:</label>
                <input
                  type="text"
                  placeholder="e.g. Alex Rivera"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-400">Email Address:</label>
                <input
                  type="email"
                  placeholder="e.g. alex.cashier@business.com"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-400">Role &amp; Terminal:</label>
                <select
                  value={staffRole}
                  onChange={(e) =>
                    setStaffRole(
                      e.target.value as 'CASHIER' | 'KITCHEN' | 'KIOSK' | 'STORE_MANAGER'
                    )
                  }
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
                >
                  <option value="CASHIER">Cashier (Registers &amp; POS Sales)</option>
                  <option value="KITCHEN">Kitchen Staff (Kitchen Display KDS)</option>
                  <option value="KIOSK">Kiosk User (Customer Self-Checkout)</option>
                  <option value="STORE_MANAGER">Assistant Manager (Z-Reports &amp; Stock)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-400">
                  4-Digit Terminal PIN Passcode:
                </label>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="e.g. 5555"
                  value={staffPin}
                  onChange={(e) => setStaffPin(e.target.value)}
                  required
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-base text-white font-mono tracking-widest text-center focus:border-orange-500 focus:outline-none"
                />
                <p className="text-[10px] text-neutral-500 text-center">
                  This PIN unlocks the terminal for this staff member
                </p>
              </div>

              <button
                type="submit"
                disabled={isCreatingStaff || staffPin.length < 4}
                className={`w-full rounded-xl py-3 text-xs font-bold text-white shadow-lg transition-all mt-4 ${
                  staffPin.length >= 4 && !isCreatingStaff
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 shadow-orange-500/25 hover:opacity-95'
                    : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                }`}
              >
                {isCreatingStaff ? 'Creating Staff Member...' : 'Create & Assign PIN'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD BRANCH LOCATION */}
      {showAddBranchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-orange-400" />
                <h3 className="font-bold text-sm">Add Store Branch Location</h3>
              </div>
              <button
                onClick={() => setShowAddBranchModal(false)}
                className="text-neutral-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBranch} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-400">Branch Identifier Code:</label>
                <input
                  type="text"
                  placeholder="e.g. WEST-BISTRO"
                  value={branchCode}
                  onChange={(e) => setBranchCode(e.target.value.toUpperCase())}
                  required
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-xs text-white font-mono uppercase focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-400">Store Branch Name:</label>
                <input
                  type="text"
                  placeholder="e.g. Westside Cafe &amp; Deli"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-400">Branch Type:</label>
                <select
                  value={branchType}
                  onChange={(e) => setBranchType(e.target.value as 'restaurant' | 'retail')}
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
                >
                  <option value="restaurant">Restaurant (with Kitchen Display System)</option>
                  <option value="retail">Retail Shop (with Barcode Scanner)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-400">Location Address:</label>
                <input
                  type="text"
                  placeholder="e.g. 500 Sunset Blvd, West District"
                  value={branchAddress}
                  onChange={(e) => setBranchAddress(e.target.value)}
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-400">State Tax Rate (%):</label>
                <input
                  type="number"
                  step="0.01"
                  value={branchTaxRate}
                  onChange={(e) => setBranchTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-xs text-white font-mono focus:border-orange-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isCreatingBranch}
                className="w-full rounded-xl bg-orange-500 py-3 text-xs font-bold text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600 transition-all mt-4"
              >
                {isCreatingBranch ? 'Provisioning Location...' : 'Provision Branch Location'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
