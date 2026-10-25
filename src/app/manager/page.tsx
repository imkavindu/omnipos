'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useStore } from '@/context/StoreContext';
import { soundManager } from '@/lib/audio';
import { formatCurrency } from '@/lib/currency';
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
  UtensilsCrossed,
  Edit,
  Trash2,
  Search,
  Filter,
  Tag,
  Package,
  Layers,
  ArrowUpDown,
  X,
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
    split: number;
  };
  topItems: Array<{
    name: string;
    qty: number;
    revenue: number;
  }>;
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
  image?: string;
  description?: string;
  stockQuantity: number;
  lowStockThreshold: number;
  kitchenCategory?: 'GRILL' | 'BAR' | 'BAKERY' | 'DELI' | 'RETAIL';
  isTaxable?: boolean;
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

type TabType = 'ZREPORT' | 'MENU' | 'INVENTORY' | 'STAFF' | 'BRANCHES';

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
  const [activeTab, setActiveTab] = useState<TabType>('ZREPORT');

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

  // Modal 4: Item & Menu CRUD Modal
  const [showItemModal, setShowItemModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<ProductItem | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('');
  const [formPrice, setFormPrice] = useState<string>('');
  const [formCostPrice, setFormCostPrice] = useState<string>('');
  const [formSku, setFormSku] = useState<string>('');
  const [formBarcode, setFormBarcode] = useState<string>('');
  const [formImage, setFormImage] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formStockQuantity, setFormStockQuantity] = useState<string>('50');
  const [formLowStockThreshold, setFormLowStockThreshold] = useState<string>('5');
  const [formKitchenCategory, setFormKitchenCategory] = useState<'GRILL' | 'BAR' | 'BAKERY' | 'DELI' | 'RETAIL'>('RETAIL');
  const [isSavingItem, setIsSavingItem] = useState<boolean>(false);
  const [itemError, setItemError] = useState<string>('');
  const [itemSearchQuery, setItemSearchQuery] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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
      if (productsRes.ok) setProducts(productsData);
      if (usersRes.ok) setStaffUsers(usersData);
    } catch (err) {
      console.error('Error fetching manager data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeStore]);

  useEffect(() => {
    fetchManagerData();
  }, [fetchManagerData]);

  // Handle Quick Stock Adjust
  const handleStockUpdate = async (productId: string, delta: number) => {
    try {
      setIsUpdatingStock(true);
      const res = await fetch(`/api/products/${productId}?storeId=${activeStore?._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deltaStock: delta, storeId: activeStore?._id }),
      });

      if (res.ok) {
        soundManager.playBeep();
        await fetchManagerData();
        setSelectedProduct(null);
      }
    } catch (err) {
      console.error('Failed to update stock:', err);
    } finally {
      setIsUpdatingStock(false);
    }
  };

  // Open Add Item Modal
  const openCreateItemModal = () => {
    const isRestaurant = activeStore?.type === 'restaurant';
    setEditingItem(null);
    setFormName('');
    setFormCategory(isRestaurant ? 'Main Course' : 'General');
    setFormPrice('');
    setFormCostPrice('0');
    setFormSku('');
    setFormBarcode(`89${Math.floor(100000 + Math.random() * 900000)}`);
    setFormImage('');
    setFormDescription('');
    setFormStockQuantity(isRestaurant ? '100' : '50');
    setFormLowStockThreshold('10');
    setFormKitchenCategory(isRestaurant ? 'GRILL' : 'RETAIL');
    setItemError('');
    setShowItemModal(true);
  };

  // Open Edit Item Modal
  const openEditItemModal = (item: ProductItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormPrice(item.price.toString());
    setFormCostPrice(item.costPrice?.toString() || '0');
    setFormSku(item.sku || '');
    setFormBarcode(item.barcode || '');
    setFormImage(item.image || '');
    setFormDescription(item.description || '');
    setFormStockQuantity(item.stockQuantity.toString());
    setFormLowStockThreshold(item.lowStockThreshold?.toString() || '5');
    setFormKitchenCategory(item.kitchenCategory || (activeStore?.type === 'restaurant' ? 'GRILL' : 'RETAIL'));
    setItemError('');
    setShowItemModal(true);
  };

  // Save Item (Create or Update)
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStore) return;
    if (!formName.trim() || !formPrice) {
      setItemError('Item name and price are required.');
      soundManager.playErrorBuzz();
      return;
    }

    const priceNum = parseFloat(formPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      setItemError('Please enter a valid price.');
      soundManager.playErrorBuzz();
      return;
    }

    try {
      setIsSavingItem(true);
      setItemError('');

      const payload = {
        storeId: activeStore._id,
        name: formName.trim(),
        category: formCategory.trim() || 'General',
        price: priceNum,
        costPrice: parseFloat(formCostPrice) || 0,
        sku: formSku.trim(),
        barcode: formBarcode.trim(),
        image: formImage.trim(),
        description: formDescription.trim(),
        stockQuantity: parseInt(formStockQuantity, 10) || 0,
        lowStockThreshold: parseInt(formLowStockThreshold, 10) || 5,
        kitchenCategory: formKitchenCategory,
      };

      let res: Response;
      if (editingItem) {
        res = await fetch(`/api/products/${editingItem._id}?storeId=${activeStore._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        soundManager.playErrorBuzz();
        setItemError(data.error || 'Failed to save item');
        return;
      }

      soundManager.playSuccessChime();
      setShowItemModal(false);
      await fetchManagerData();
    } catch {
      soundManager.playErrorBuzz();
      setItemError('Network error connecting to products service');
    } finally {
      setIsSavingItem(false);
    }
  };

  // Delete Item
  const handleDeleteItem = async (productId: string) => {
    if (!activeStore) return;
    try {
      const res = await fetch(`/api/products/${productId}?storeId=${activeStore._id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        soundManager.playBeep();
        setDeleteConfirmId(null);
        await fetchManagerData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to archive item');
      }
    } catch (err) {
      console.error('Delete item error:', err);
    }
  };

  // Handle Staff Creation
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStore) return;
    if (!staffName || !staffEmail || !staffPin) {
      setStaffError('All fields are required');
      soundManager.playErrorBuzz();
      return;
    }
    if (!/^\d{4}$/.test(staffPin)) {
      setStaffError('PIN must be exactly 4 numeric digits');
      soundManager.playErrorBuzz();
      return;
    }

    try {
      setIsCreatingStaff(true);
      setStaffError('');
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: staffName,
          email: staffEmail,
          pinCode: staffPin,
          role: staffRole,
          storeId: activeStore._id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        soundManager.playErrorBuzz();
        setStaffError(data.error || 'Failed to create staff member');
        return;
      }

      soundManager.playSuccessChime();
      setShowAddStaffModal(false);
      setStaffName('');
      setStaffEmail('');
      setStaffPin('');
      fetchManagerData();
    } catch {
      soundManager.playErrorBuzz();
      setStaffError('Network error creating staff');
    } finally {
      setIsCreatingStaff(false);
    }
  };

  // Handle Branch Creation
  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchCode || !branchName) return;

    try {
      setIsCreatingBranch(true);
      const res = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: branchCode,
          name: branchName,
          type: branchType,
          address: branchAddress,
          taxRate: branchTaxRate,
          currency: 'LKR',
          currencySymbol: 'Rs.',
        }),
      });

      if (res.ok) {
        soundManager.playSuccessChime();
        setShowAddBranchModal(false);
        setBranchCode('');
        setBranchName('');
        setBranchAddress('');
        await refreshStores();
        fetchManagerData();
      }
    } catch (err) {
      console.error('Error creating branch:', err);
    } finally {
      setIsCreatingBranch(false);
    }
  };

  // Handle Forced PIN Change
  const handleUpdateInitialPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser) return;
    if (!/^\d{4}$/.test(newPin)) {
      setPinChangeError('PIN must be exactly 4 digits');
      soundManager.playErrorBuzz();
      return;
    }
    if (newPin !== confirmPin) {
      setPinChangeError('PIN confirmation does not match');
      soundManager.playErrorBuzz();
      return;
    }

    try {
      setIsUpdatingPin(true);
      setPinChangeError('');
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: activeUser.id,
          newPin,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setPinChangeError(data.error || 'Failed to update PIN');
        soundManager.playErrorBuzz();
        return;
      }

      soundManager.playSuccessChime();
      setActiveUser({
        ...activeUser,
        mustChangePin: false,
      });
    } catch {
      setPinChangeError('Network error updating PIN');
      soundManager.playErrorBuzz();
    } finally {
      setIsUpdatingPin(false);
    }
  };

  // Filtered menu/product items
  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  const filteredItems = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory =
        selectedCategoryFilter === 'ALL' || p.category === selectedCategoryFilter;
      const matchesSearch =
        !itemSearchQuery.trim() ||
        p.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
        p.barcode.includes(itemSearchQuery) ||
        p.sku.toLowerCase().includes(itemSearchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategoryFilter, itemSearchQuery]);

  // Loading Screen
  if (isContextLoading || (isLoading && !analytics)) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-53px)] bg-slate-50 dark:bg-neutral-950 text-slate-500 dark:text-neutral-400">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-orange-500" />
          <span className="text-sm font-medium">Loading store management hub...</span>
        </div>
      </div>
    );
  }

  // Mandatory Initial PIN Change Gate
  if (activeUser?.mustChangePin) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 min-h-[calc(100vh-53px)] bg-slate-50 dark:bg-neutral-950">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 sm:p-8 shadow-2xl text-slate-900 dark:text-white space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Set Your Secure PIN</h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Security requirement: You must change your temporary PIN.
              </p>
            </div>
          </div>

          <form onSubmit={handleUpdateInitialPin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">New 4-Digit PIN</label>
              <input
                type="password"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 px-4 py-2.5 text-center text-xl font-mono tracking-widest text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none"
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">Confirm 4-Digit PIN</label>
              <input
                type="password"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 px-4 py-2.5 text-center text-xl font-mono tracking-widest text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none"
              />
            </div>

            {pinChangeError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{pinChangeError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isUpdatingPin || newPin.length !== 4 || confirmPin.length !== 4}
              className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/25 hover:opacity-95 disabled:opacity-50"
            >
              {isUpdatingPin ? 'Saving PIN...' : 'Activate Store Manager Terminal'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const isRestaurant = activeStore?.type === 'restaurant';

  return (
    <div className="flex-1 bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-white p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full transition-colors duration-150">
      {/* Top Banner: Store Branch Header & Navigation Tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {activeStore?.name || 'Store Management Hub'}
            </h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase ${
                isRestaurant
                  ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800'
                  : 'bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800'
              }`}
            >
              {activeStore?.type || 'STORE'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
            Store Code: <span className="font-mono font-bold text-orange-600 dark:text-orange-400">{activeStore?.code}</span> • Tax Rate: {activeStore?.taxRate}% • Currency: LKR ({activeStore?.currencySymbol || 'Rs.'})
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Navigation Tabs */}
          <div className="flex rounded-xl bg-slate-200/80 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 p-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('ZREPORT')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'ZREPORT'
                  ? 'bg-white dark:bg-neutral-800 text-orange-600 dark:text-orange-400 shadow-sm'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Daily Z-Report
            </button>
            <button
              onClick={() => setActiveTab('MENU')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'MENU'
                  ? 'bg-white dark:bg-neutral-800 text-orange-600 dark:text-orange-400 shadow-sm'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isRestaurant ? <UtensilsCrossed className="w-3.5 h-3.5" /> : <Package className="w-3.5 h-3.5" />}
              <span>{isRestaurant ? 'Menu Management' : 'Item Catalog'}</span>
            </button>
            <button
              onClick={() => setActiveTab('INVENTORY')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'INVENTORY'
                  ? 'bg-white dark:bg-neutral-800 text-orange-600 dark:text-orange-400 shadow-sm'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Inventory
            </button>
            <button
              onClick={() => setActiveTab('STAFF')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'STAFF'
                  ? 'bg-white dark:bg-neutral-800 text-orange-600 dark:text-orange-400 shadow-sm'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Staff &amp; PINs
            </button>
            <button
              onClick={() => setActiveTab('BRANCHES')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'BRANCHES'
                  ? 'bg-white dark:bg-neutral-800 text-orange-600 dark:text-orange-400 shadow-sm'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Branches
            </button>
          </div>

          <button
            onClick={fetchManagerData}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white shrink-0 shadow-sm"
            title="Refresh Store Data"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* TAB 1: DAILY Z-REPORT & FINANCIAL AUDIT */}
      {activeTab === 'ZREPORT' && analytics && (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 p-5 space-y-1 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 dark:text-neutral-400 text-xs">
                <span>Today Gross Sales</span>
                <DollarSign className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {formatCurrency(analytics.summary.totalSales)}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-neutral-500">
                Net Subtotal: {formatCurrency(analytics.summary.subtotal)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 p-5 space-y-1 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 dark:text-neutral-400 text-xs">
                <span>Tax Collected ({analytics.store.taxRate}%)</span>
                <span className="font-mono text-xs text-orange-600 dark:text-orange-400">STATE</span>
              </div>
              <p className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
                {formatCurrency(analytics.summary.totalTax)}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-neutral-500">Sales tax automated accrual</p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 p-5 space-y-1 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 dark:text-neutral-400 text-xs">
                <span>Transactions Today</span>
                <ShoppingBag className="h-4 w-4 text-blue-500 dark:text-blue-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
                {analytics.summary.orderCount}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-neutral-500">
                Avg Ticket: {formatCurrency(analytics.summary.averageTicket)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 p-5 space-y-1 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 dark:text-neutral-400 text-xs">
                <span>Low-Stock Warnings</span>
                <AlertCircle className="h-4 w-4 text-amber-500 dark:text-amber-400" />
              </div>
              <p
                className={`text-2xl sm:text-3xl font-black font-mono ${
                  analytics.lowStockCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-neutral-400'
                }`}
              >
                {analytics.lowStockCount}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-neutral-500">Below reorder threshold</p>
            </div>
          </div>

          {/* Payment Tender Breakdown & Top Items */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-orange-500 dark:text-orange-400" />
                  Daily Register Tender Breakdown
                </h3>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Report</span>
                </button>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800">
                  <div className="flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                    <span className="text-xs font-semibold">Cash Drawer</span>
                  </div>
                  <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                    {formatCurrency(analytics.payments.cash)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                    <span className="text-xs font-semibold">Card Terminal</span>
                  </div>
                  <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                    {formatCurrency(analytics.payments.card)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                    <span className="text-xs font-semibold">Self-Checkout Kiosk</span>
                  </div>
                  <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                    {formatCurrency(analytics.payments.kiosk)}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 p-5 space-y-4 shadow-sm">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                Top 5 Best-Selling Items
              </h3>

              {analytics.topItems.length === 0 ? (
                <div className="text-center py-8 text-slate-400 dark:text-neutral-500 text-xs">
                  No orders recorded yet today.
                </div>
              ) : (
                <div className="space-y-2">
                  {analytics.topItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 dark:bg-neutral-800 font-mono text-[10px] font-bold text-slate-600 dark:text-neutral-400">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white">{item.name}</span>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-slate-500 dark:text-neutral-400">{item.qty} sold • </span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(item.revenue)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MENU & ITEM MANAGEMENT (NEW CRUD FEATURE) */}
      {activeTab === 'MENU' && (
        <div className="space-y-5">
          {/* Action Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {isRestaurant ? (
                  <UtensilsCrossed className="h-5 w-5 text-orange-500" />
                ) : (
                  <Package className="h-5 w-5 text-orange-500" />
                )}
                <span>{isRestaurant ? 'Restaurant Food & Drink Menu Catalog' : 'Retail Product & Item Catalog'}</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                {isRestaurant
                  ? 'Add chef recipes, configure kitchen routing stations (Grill/Bar/Bakery), and set menu prices'
                  : 'Manage retail inventory items, barcodes, supplier costs, and retail sale prices'}
              </p>
            </div>

            <button
              onClick={openCreateItemModal}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-orange-500/25 hover:opacity-95 transition-all self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              <span>{isRestaurant ? 'Add Food / Drink Item' : 'Add New Retail Product'}</span>
            </button>
          </div>

          {/* Search & Category Filter Pills */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white dark:bg-neutral-900/60 p-3 rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-neutral-500" />
              <input
                type="text"
                value={itemSearchQuery}
                onChange={(e) => setItemSearchQuery(e.target.value)}
                placeholder={isRestaurant ? 'Search dishes, drinks, ingredients...' : 'Search product name, SKU, or barcode...'}
                className="w-full rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950 pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:border-orange-500 focus:outline-none"
              />
              {itemSearchQuery && (
                <button
                  onClick={() => setItemSearchQuery('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setSelectedCategoryFilter('ALL')}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategoryFilter === 'ALL'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All Items ({products.length})
              </button>
              {uniqueCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategoryFilter === cat
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Item Catalog Grid */}
          {filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-neutral-800 p-12 text-center space-y-3 bg-white/50 dark:bg-neutral-900/30">
              <Package className="h-10 w-10 text-slate-400 dark:text-neutral-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-neutral-300">No items found</p>
              <p className="text-xs text-slate-500 dark:text-neutral-500">
                {itemSearchQuery || selectedCategoryFilter !== 'ALL'
                  ? 'Try clearing your search query or category filter.'
                  : 'Get started by creating your first catalog item above.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => {
                const isOutOfStock = item.stockQuantity <= 0;
                const isLowStock = item.stockQuantity <= item.lowStockThreshold;

                return (
                  <div
                    key={item._id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 p-4 shadow-sm hover:border-orange-500/50 transition-all group"
                  >
                    <div className="space-y-3">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-md bg-slate-100 dark:bg-neutral-800 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-600 dark:text-neutral-300">
                          {item.category}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {/* Kitchen Station Badge for Restaurants */}
                          {isRestaurant && item.kitchenCategory && (
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase ${
                                item.kitchenCategory === 'GRILL'
                                  ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                                  : item.kitchenCategory === 'BAR'
                                  ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                                  : item.kitchenCategory === 'BAKERY'
                                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              }`}
                            >
                              KDS: {item.kitchenCategory}
                            </span>
                          )}

                          {/* Stock status pill */}
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[9px] font-mono font-bold ${
                              isOutOfStock
                                ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                                : isLowStock
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            }`}
                          >
                            {isOutOfStock ? 'OUT' : `${item.stockQuantity} in stock`}
                          </span>
                        </div>
                      </div>

                      {/* Item Details */}
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1 group-hover:text-orange-500 transition-colors">
                          {item.name}
                        </h4>
                        {item.description && (
                          <p className="text-[11px] text-slate-500 dark:text-neutral-400 line-clamp-2 mt-1">
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* Price & SKU row */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-neutral-800 text-xs">
                        <div>
                          <span className="font-mono text-base font-extrabold text-orange-600 dark:text-orange-400">
                            {formatCurrency(item.price)}
                          </span>
                          {item.costPrice > 0 && (
                            <span className="text-[10px] text-slate-400 dark:text-neutral-500 block font-mono">
                              Cost: {formatCurrency(item.costPrice)}
                            </span>
                          )}
                        </div>

                        <div className="text-right text-[10px] font-mono text-slate-500 dark:text-neutral-400">
                          <p>SKU: {item.sku}</p>
                          <p className="flex items-center gap-1 justify-end text-slate-400 dark:text-neutral-500">
                            <Barcode className="w-3 h-3" />
                            {item.barcode}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-neutral-800">
                      {/* Quick stock adjustment buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStockUpdate(item._id, -5)}
                          title="Reduce stock by 5"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 text-xs font-mono font-bold"
                        >
                          -5
                        </button>
                        <button
                          onClick={() => handleStockUpdate(item._id, 10)}
                          title="Add 10 units to stock"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 text-xs font-mono font-bold"
                        >
                          +10
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEditItemModal(item)}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-neutral-300 hover:text-orange-500 dark:hover:text-orange-400 hover:border-orange-500/30 transition-all"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </button>

                        {deleteConfirmId === item._id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDeleteItem(item._id)}
                              className="rounded-lg bg-red-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-red-700"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="rounded-lg bg-slate-200 dark:bg-neutral-800 px-2 py-1 text-[10px] font-bold text-slate-700 dark:text-neutral-300"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(item._id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 dark:text-neutral-500 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                            title="Archive / Remove Item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: INVENTORY TRACKING & STOCK RECONCILIATION */}
      {activeTab === 'INVENTORY' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Boxes className="h-5 w-5 text-orange-500" />
                Branch Inventory Ledger
              </h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Track stock quantities, barcodes, and trigger quick restocks
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950 text-slate-600 dark:text-neutral-400 uppercase font-mono tracking-wider text-[11px]">
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
              <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/60 font-medium text-slate-800 dark:text-neutral-300">
                {products.map((p) => {
                  const isLow = p.stockQuantity <= p.lowStockThreshold;
                  const isOut = p.stockQuantity <= 0;

                  return (
                    <tr key={p._id} className="hover:bg-slate-50 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{p.name}</td>
                      <td className="px-4 py-3 font-mono text-slate-500 dark:text-neutral-400">{p.sku}</td>
                      <td className="px-4 py-3 font-mono text-orange-600 dark:text-orange-400 flex items-center gap-1">
                        <Barcode className="h-3 w-3" />
                        <span>{p.barcode}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-900 dark:text-white">{formatCurrency(p.price)}</td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                        {p.stockQuantity} units
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold font-mono ${
                            isOut
                              ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                              : isLow
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {isOut ? 'OUT OF STOCK' : isLow ? 'LOW STOCK' : 'IN STOCK'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedProduct(p)}
                          className="rounded-lg border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-neutral-300 hover:border-orange-500 hover:text-orange-500 transition-colors"
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

      {/* TAB 4: STAFF PIN & ROLE MANAGEMENT */}
      {activeTab === 'STAFF' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-orange-500" />
                Staff Terminals &amp; PIN Authentication
              </h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Grant staff terminal access via 4-digit bcrypt-hashed PIN codes
              </p>
            </div>
            <button
              onClick={() => setShowAddStaffModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Staff Member</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {staffUsers.map((user) => {
              const roleColors = {
                STORE_MANAGER: 'border-orange-500/40 text-orange-600 dark:text-orange-400',
                CASHIER: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
                KITCHEN: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
                KIOSK: 'border-purple-500/40 text-purple-600 dark:text-purple-400',
              };

              return (
                <div
                  key={user._id}
                  className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 p-4 space-y-3 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-mono font-bold uppercase border ${
                        roleColors[user.role] || 'border-slate-300 dark:border-neutral-700 text-slate-600 dark:text-neutral-300'
                      }`}
                    >
                      {user.role.replace('_', ' ')}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                      <Shield className="h-3 w-3" />
                      PIN Active
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{user.name}</h4>
                    <p className="text-xs text-slate-500 dark:text-neutral-400 truncate">{user.email}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: BRANCHES */}
      {activeTab === 'BRANCHES' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="h-5 w-5 text-orange-500" />
                Branch Locations
              </h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Multi-branch directory and location provisioning
              </p>
            </div>
            <button
              onClick={() => setShowAddBranchModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Provision New Branch</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map((store) => (
              <div
                key={store._id}
                className={`rounded-2xl border p-5 space-y-3 shadow-sm ${
                  store._id === activeStore?._id
                    ? 'border-orange-500 bg-orange-500/5 dark:bg-orange-500/10'
                    : 'border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-orange-600 dark:text-orange-400">
                    {store.code}
                  </span>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] uppercase font-mono font-bold ${
                      store.type === 'restaurant'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400'
                    }`}
                  >
                    {store.type}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{store.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 truncate">{store.address}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-neutral-800 text-[11px] text-slate-500 dark:text-neutral-400">
                  <span>Tax: {store.taxRate}%</span>
                  <span>Currency: {store.currencySymbol}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT ITEM & MENU MODAL */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-2xl text-slate-900 dark:text-white space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                {isRestaurant ? (
                  <UtensilsCrossed className="h-5 w-5 text-orange-500" />
                ) : (
                  <Package className="h-5 w-5 text-orange-500" />
                )}
                <div>
                  <h3 className="font-bold text-base">
                    {editingItem
                      ? isRestaurant
                        ? 'Edit Menu Dish / Drink'
                        : 'Edit Retail Product'
                      : isRestaurant
                      ? 'Add New Food / Drink Item'
                      : 'Add New Retail Product'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">
                    Store: <span className="text-orange-500 font-semibold">{activeStore?.name}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowItemModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              {/* Item Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                  {isRestaurant ? 'Dish / Beverage Name *' : 'Product Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={isRestaurant ? 'e.g. Truffle Mushroom Risotto' : 'e.g. Wireless Ergonomic Mouse'}
                  className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              {/* Category & Kitchen Station / Barcode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">Category *</label>
                  <input
                    type="text"
                    required
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder={isRestaurant ? 'e.g. Main Course, Drinks' : 'e.g. Electronics, Audio'}
                    className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>

                {isRestaurant ? (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                      Kitchen Station (KDS Routing)
                    </label>
                    <select
                      value={formKitchenCategory}
                      onChange={(e) =>
                        setFormKitchenCategory(
                          e.target.value as 'GRILL' | 'BAR' | 'BAKERY' | 'DELI' | 'RETAIL'
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none font-mono"
                    >
                      <option value="GRILL">GRILL (Hot Kitchen / Burgers / Steaks)</option>
                      <option value="BAR">BAR (Cocktails / Wine / Coffees)</option>
                      <option value="BAKERY">BAKERY (Pastries / Breads / Desserts)</option>
                      <option value="DELI">DELI (Salads / Cold Sandwiches)</option>
                      <option value="RETAIL">RETAIL (Packaged Goods)</option>
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">SKU Code</label>
                    <input
                      type="text"
                      value={formSku}
                      onChange={(e) => setFormSku(e.target.value.toUpperCase())}
                      placeholder="e.g. TECH-MOU-01"
                      className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Pricing Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                    Retail Selling Price (Rs.) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="e.g. 1500.00"
                    className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 px-3 py-2 text-xs font-mono font-bold text-orange-600 dark:text-orange-400 focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                    Cost / Prep Price (Rs.)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formCostPrice}
                    onChange={(e) => setFormCostPrice(e.target.value)}
                    placeholder="e.g. 850.00"
                    className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Barcode & Stock */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">Barcode</label>
                    <button
                      type="button"
                      onClick={() => setFormBarcode(`89${Math.floor(100000 + Math.random() * 900000)}`)}
                      className="text-[10px] text-orange-500 hover:underline"
                    >
                      Regenerate
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    placeholder="e.g. 8901234"
                    className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                    {isRestaurant ? 'Daily Available Servings' : 'Initial Stock Quantity'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formStockQuantity}
                    onChange={(e) => setFormStockQuantity(e.target.value)}
                    placeholder="50"
                    className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                  {isRestaurant ? 'Dish Description & Allergens' : 'Product Description'}
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder={isRestaurant ? 'e.g. Fresh organic mushrooms with shaved black truffle and aged parmesan.' : 'e.g. Multi-device Bluetooth mouse with ergonomic silent clicks.'}
                  className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 p-2.5 text-xs text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none resize-none"
                />
              </div>

              {/* Image URL */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">Photo Image URL (Optional)</label>
                <input
                  type="url"
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              {itemError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{itemError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSavingItem}
                className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-3 text-xs font-bold text-white shadow-lg shadow-orange-500/25 hover:opacity-95 disabled:opacity-50"
              >
                {isSavingItem ? 'Saving to Catalog...' : editingItem ? 'Save Item Changes' : 'Create & Publish to POS'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADJUST STOCK */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-2xl text-slate-900 dark:text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-neutral-800">
              <h3 className="font-bold text-sm">Quick Restock / Stock Adjust</h3>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <p className="font-bold text-sm">{selectedProduct.name}</p>
              <p className="text-xs text-slate-500 dark:text-neutral-400 font-mono">
                Current Stock: <span className="text-orange-500 font-bold">{selectedProduct.stockQuantity} units</span>
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[-10, -1, 1, 5, 10, 50].map((delta) => (
                <button
                  key={delta}
                  disabled={isUpdatingStock}
                  onClick={() => handleStockUpdate(selectedProduct._id, delta)}
                  className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                    delta > 0
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                      : 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20'
                  }`}
                >
                  {delta > 0 ? `+${delta}` : delta}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD STAFF MEMBER */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-2xl text-slate-900 dark:text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-neutral-800">
              <h3 className="font-bold text-sm">Provision Staff PIN Terminal</h3>
              <button
                onClick={() => setShowAddStaffModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">Staff Full Name</label>
                <input
                  type="text"
                  required
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder="e.g. David Silva"
                  className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">Corporate Email</label>
                <input
                  type="email"
                  required
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  placeholder="e.g. david.silva@omnipos.com"
                  className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">Assigned Role</label>
                <select
                  value={staffRole}
                  onChange={(e) =>
                    setStaffRole(e.target.value as 'CASHIER' | 'KITCHEN' | 'KIOSK' | 'STORE_MANAGER')
                  }
                  className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none"
                >
                  <option value="CASHIER">CASHIER (POS Register)</option>
                  <option value="KITCHEN">KITCHEN (Kitchen KDS Display)</option>
                  <option value="KIOSK">KIOSK (Self-Serve Terminal)</option>
                  <option value="STORE_MANAGER">STORE MANAGER (Branch Command)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">Initial 4-Digit PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  value={staffPin}
                  onChange={(e) => setStaffPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 px-3 py-2 text-center text-lg font-mono tracking-widest text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              {staffError && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
                  {staffError}
                </div>
              )}

              <button
                type="submit"
                disabled={isCreatingStaff || staffPin.length !== 4}
                className="w-full rounded-xl bg-orange-500 py-2.5 text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-50 shadow-md"
              >
                {isCreatingStaff ? 'Creating...' : 'Issue PIN & Authorize'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: ADD BRANCH LOCATION */}
      {showAddBranchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-2xl text-slate-900 dark:text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-neutral-800">
              <h3 className="font-bold text-sm">Provision Store Branch</h3>
              <button
                onClick={() => setShowAddBranchModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBranch} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">Branch Code (Unique)</label>
                <input
                  type="text"
                  required
                  value={branchCode}
                  onChange={(e) => setBranchCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SOUTH-HUB"
                  className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">Branch Name</label>
                <input
                  type="text"
                  required
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="e.g. Uptown Bistro & Cafe"
                  className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">Store Type</label>
                  <select
                    value={branchType}
                    onChange={(e) => setBranchType(e.target.value as 'restaurant' | 'retail')}
                    className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 px-2 py-2 text-xs text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none"
                  >
                    <option value="restaurant">Restaurant</option>
                    <option value="retail">Retail</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">Tax Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={branchTaxRate}
                    onChange={(e) => setBranchTaxRate(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">Street Address</label>
                <input
                  type="text"
                  value={branchAddress}
                  onChange={(e) => setBranchAddress(e.target.value)}
                  placeholder="e.g. 104 Main Street"
                  className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isCreatingBranch}
                className="w-full rounded-xl bg-orange-500 py-2.5 text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-50 shadow-md"
              >
                {isCreatingBranch ? 'Provisioning...' : 'Deploy Branch Location'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
