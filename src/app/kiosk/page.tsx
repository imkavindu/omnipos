'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useStore } from '@/context/StoreContext';
import { soundManager } from '@/lib/audio';
import { formatCurrency } from '@/lib/currency';
import confetti from 'canvas-confetti';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Utensils,
  ShoppingBag as BagIcon,
  CreditCard,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Clock,
  Wifi,
} from 'lucide-react';

interface ProductItem {
  _id: string;
  storeId: string;
  name: string;
  category: string;
  price: number;
  image: string;
  description?: string;
  stockQuantity: number;
  kitchenCategory: 'GRILL' | 'BAR' | 'BAKERY' | 'DELI' | 'RETAIL';
}

interface KioskCartItem {
  product: ProductItem;
  quantity: number;
  notes?: string;
}

export default function KioskMode() {
  const { activeStore } = useStore();

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<string[]>(['ALL']);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [cart, setCart] = useState<KioskCartItem[]>([]);

  // Modals & Steps
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [customizationNotes, setCustomizationNotes] = useState<string>('');
  const [checkoutStep, setCheckoutStep] = useState<'BROWSE' | 'REVIEW' | 'DINING' | 'PAYMENT' | 'SUCCESS'>('BROWSE');
  const [diningOption, setDiningOption] = useState<'DINE_IN' | 'TAKEAWAY'>('DINE_IN');
  const [tableNumber, setTableNumber] = useState<string>('');
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [confirmedOrderNumber, setConfirmedOrderNumber] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(10);

  // Fetch products for current store
  const fetchProducts = useCallback(async () => {
    if (!activeStore) return;
    try {
      const res = await fetch(`/api/products?storeId=${activeStore._id}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setProducts(data);
        const uniqueCats = ['ALL', ...Array.from(new Set(data.map((p: ProductItem) => p.category)))];
        setCategories(uniqueCats);
      }
    } catch (err) {
      console.error('Failed to load kiosk catalog:', err);
    }
  }, [activeStore]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Cart operations
  const addToCart = (product: ProductItem, notes: string = '') => {
    soundManager.playScanBeep();
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.product._id === product._id && item.notes === notes
      );
      if (existingIndex > -1) {
        const copy = [...prev];
        copy[existingIndex].quantity += 1;
        return copy;
      }
      return [...prev, { product, quantity: 1, notes }];
    });
    setSelectedProduct(null);
    setCustomizationNotes('');
  };

  const updateQuantity = (index: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item, i) => {
          if (i === index) {
            const next = item.quantity + delta;
            return next > 0 ? { ...item, quantity: next } : null;
          }
          return item;
        })
        .filter(Boolean) as KioskCartItem[]
    );
  };

  const removeCartItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const resetKiosk = () => {
    setCart([]);
    setCheckoutStep('BROWSE');
    setDiningOption('DINE_IN');
    setTableNumber('');
    setConfirmedOrderNumber('');
    setCountdown(10);
  };

  // Subtotal and tax
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }, [cart]);

  const taxRate = activeStore ? activeStore.taxRate : 8.0;
  const tax = (subtotal * taxRate) / 100;
  const grandTotal = subtotal + tax;
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Filter products by category
  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'ALL') return products;
    return products.filter((p) => p.category === selectedCategory);
  }, [products, selectedCategory]);

  // Handle Mock Contactless / Card Payment
  const handleCompleteKioskPayment = async () => {
    if (!activeStore || cart.length === 0) return;
    setIsProcessingPayment(true);

    try {
      const payload = {
        storeId: activeStore._id,
        orderType: 'KIOSK_SELF',
        items: cart.map((item) => ({
          productId: item.product._id,
          name: item.product.name,
          sku: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
          kitchenCategory: item.product.kitchenCategory,
          notes: item.notes || '',
        })),
        subtotal: Number(subtotal.toFixed(2)),
        discount: 0,
        discountType: 'FIXED',
        tax: Number(tax.toFixed(2)),
        total: Number(grandTotal.toFixed(2)),
        paymentMethod: 'KIOSK_DIGITAL',
        paymentStatus: 'PAID',
        customerName: 'Self-Serve Kiosk Guest',
        tableNumber: diningOption === 'DINE_IN' ? tableNumber || 'Dine-In' : 'Takeaway',
        cashierName: 'Self-Checkout Kiosk 01',
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        soundManager.playErrorBuzz();
        alert(data.error || 'Payment failed');
        setIsProcessingPayment(false);
        return;
      }

      // Success
      soundManager.playSuccessChime();
      confetti({
        particleCount: 120,
        spread: 100,
        origin: { y: 0.5 },
      });

      setConfirmedOrderNumber(data.orderNumber || 'K-101');
      setCheckoutStep('SUCCESS');
      setIsProcessingPayment(false);
    } catch (err) {
      console.error('Kiosk order failed:', err);
      soundManager.playErrorBuzz();
      setIsProcessingPayment(false);
    }
  };

  // Countdown timer on success screen
  useEffect(() => {
    if (checkoutStep === 'SUCCESS') {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            resetKiosk();
            return 10;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [checkoutStep]);

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-white min-h-[calc(100vh-53px)] select-none transition-colors duration-150">
      {/* KIOSK HEADER HUD */}
      <div className="border-b border-slate-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/90 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/30">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {activeStore ? activeStore.name : 'Self-Checkout Kiosk'}
            </h1>
            <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">Touch to customize and order your meal</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 px-3 py-1.5 text-xs text-slate-600 dark:text-neutral-400">
            <Wifi className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
            <span>Kiosk Terminal #01 Online</span>
          </div>
          <button
            onClick={resetKiosk}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-100 dark:bg-neutral-950 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Kiosk</span>
          </button>
        </div>
      </div>

      {/* STEP 1: BROWSE CATALOG */}
      {checkoutStep === 'BROWSE' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Category Filter Cards */}
          <div className="p-4 border-b border-slate-200 dark:border-neutral-800/80 bg-slate-100/70 dark:bg-neutral-900/40">
            <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex items-center gap-2 rounded-2xl px-5 py-3.5 text-sm sm:text-base font-extrabold tracking-wide transition-all ${
                    selectedCategory === cat
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 scale-105'
                      : 'bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-neutral-800 shadow-sm'
                  }`}
                >
                  <Utensils className="h-4 w-4" />
                  <span>{cat}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Large Touch Product Cards Grid */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-28">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((p) => {
                const isOutOfStock = p.stockQuantity <= 0;
                return (
                  <button
                    key={p._id}
                    onClick={() => setSelectedProduct(p)}
                    disabled={isOutOfStock}
                    className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl border p-4 text-left transition-all active:scale-95 shadow-sm ${
                      isOutOfStock
                        ? 'border-red-950/20 bg-slate-100/50 dark:bg-neutral-950 opacity-50 cursor-not-allowed'
                        : 'border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 hover:border-orange-500 hover:shadow-2xl hover:shadow-orange-500/10'
                    }`}
                  >
                    {/* Big Image */}
                    <div className="relative mb-3 h-40 sm:h-48 w-full overflow-hidden rounded-2xl bg-slate-100 dark:bg-neutral-950">
                      {p.image ? (
                        <Image
                          src={p.image}
                          alt={p.name}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-400 dark:text-neutral-700">
                          <ShoppingBag className="h-12 w-12" />
                        </div>
                      )}
                      <span className="absolute top-2 right-2 rounded-lg bg-white/90 dark:bg-neutral-950/80 px-2.5 py-1 text-xs font-mono font-bold text-slate-800 dark:text-white shadow-sm backdrop-blur-md">
                        {p.category}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white group-hover:text-orange-500 transition-colors line-clamp-1">
                        {p.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-neutral-400 line-clamp-2">
                        {p.description || 'Delicious freshly prepared item.'}
                      </p>
                    </div>

                    {/* Price and Big Tap Button */}
                    <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100 dark:border-neutral-800">
                      <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                        {formatCurrency(p.price)}
                      </span>
                      <div className="flex items-center gap-1 rounded-xl bg-orange-500 px-3.5 py-2 text-xs font-black text-white shadow-md shadow-orange-500/20 group-hover:bg-orange-600">
                        <Plus className="h-4 w-4" />
                        <span>Add</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sticky Bottom Cart Bar */}
          {totalItemCount > 0 && (
            <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-neutral-800 bg-neutral-950/95 p-4 backdrop-blur-xl shadow-2xl">
              <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white font-black text-lg shadow-lg shadow-orange-500/30">
                    {totalItemCount}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">
                      Your Order Total
                    </p>
                    <p className="text-2xl font-black text-white font-mono">
                      {formatCurrency(grandTotal)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setCheckoutStep('REVIEW')}
                  className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-8 py-4 text-base font-black text-white shadow-xl shadow-orange-500/30 hover:opacity-95 active:scale-98 transition-all"
                >
                  <span>Review Order</span>
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: REVIEW ORDER */}
      {checkoutStep === 'REVIEW' && (
        <div className="flex-1 max-w-3xl mx-auto w-full p-4 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCheckoutStep('BROWSE')}
              className="flex items-center gap-2 text-sm font-bold text-neutral-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Menu</span>
            </button>
            <h2 className="text-2xl font-black text-white">Review Your Selection</h2>
            <div className="w-16" />
          </div>

          <div className="space-y-3">
            {cart.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-900 p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-neutral-950 shrink-0">
                    {item.product.image && (
                      <Image
                        src={item.product.image}
                        alt={item.product.name}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">{item.product.name}</h4>
                    {item.notes && <p className="text-xs text-orange-400">Note: {item.notes}</p>}
                    <p className="text-sm font-mono font-extrabold text-neutral-300">
                      {formatCurrency(item.product.price)} each
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => updateQuantity(index, -1)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-800 text-white hover:bg-neutral-700 text-lg font-bold"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center text-lg font-black font-mono">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(index, 1)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-800 text-white hover:bg-neutral-700 text-lg font-bold"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => removeCartItem(index)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-neutral-500 hover:text-red-400 hover:bg-neutral-800 ml-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pricing summary */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 space-y-2 text-sm">
            <div className="flex justify-between text-neutral-400">
              <span>Subtotal:</span>
              <span className="font-mono text-white font-bold">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-neutral-400">
              <span>Tax ({taxRate}%):</span>
              <span className="font-mono text-white font-bold">{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between text-xl font-black text-white pt-3 border-t border-neutral-800">
              <span>Total:</span>
              <span className="font-mono text-orange-400">{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          <button
            onClick={() => setCheckoutStep('DINING')}
            className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 py-4 text-lg font-black text-white shadow-xl shadow-orange-500/25 hover:opacity-95"
          >
            {activeStore?.type === 'restaurant' ? 'Select Dining Option →' : 'Continue to Packaging & Payment →'}
          </button>
        </div>
      )}

      {/* STEP 3: DINING / PACKAGING PREFERENCE */}
      {checkoutStep === 'DINING' && (
        <div className="flex-1 max-w-xl mx-auto w-full p-4 sm:p-8 flex flex-col justify-center space-y-6">
          {activeStore?.type === 'restaurant' ? (
            <>
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-black text-white">Where will you be eating?</h2>
                <p className="text-sm text-neutral-400">Select your dining preference below</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setDiningOption('DINE_IN')}
                  className={`flex flex-col items-center gap-3 rounded-3xl border-2 p-6 transition-all ${
                    diningOption === 'DINE_IN'
                      ? 'border-orange-500 bg-orange-500/10 text-orange-400 shadow-xl shadow-orange-500/10'
                      : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white'
                  }`}
                >
                  <Utensils className="h-12 w-12" />
                  <span className="text-lg font-black">Eat In</span>
                  <span className="text-xs text-neutral-500">Serve on tray/table</span>
                </button>

                <button
                  onClick={() => setDiningOption('TAKEAWAY')}
                  className={`flex flex-col items-center gap-3 rounded-3xl border-2 p-6 transition-all ${
                    diningOption === 'TAKEAWAY'
                      ? 'border-orange-500 bg-orange-500/10 text-orange-400 shadow-xl shadow-orange-500/10'
                      : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white'
                  }`}
                >
                  <BagIcon className="h-12 w-12" />
                  <span className="text-lg font-black">Take Away</span>
                  <span className="text-xs text-neutral-500">Packed to go</span>
                </button>
              </div>

              {diningOption === 'DINE_IN' && (
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 space-y-2">
                  <label className="text-xs font-semibold text-neutral-400">
                    Table or Puck Number (Optional):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Table 12"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-base text-white font-mono focus:border-orange-500 focus:outline-none"
                  />
                </div>
              )}
            </>
          ) : (
            <>
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-black text-white">Bagging Preference</h2>
                <p className="text-sm text-neutral-400">Select packaging option for your items</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setDiningOption('TAKEAWAY')}
                  className={`flex flex-col items-center gap-3 rounded-3xl border-2 p-6 transition-all ${
                    diningOption === 'TAKEAWAY'
                      ? 'border-blue-500 bg-blue-500/10 text-blue-400 shadow-xl shadow-blue-500/10'
                      : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white'
                  }`}
                >
                  <BagIcon className="h-12 w-12" />
                  <span className="text-lg font-black">Store Paper Bag</span>
                  <span className="text-xs text-neutral-500">Includes shopping bag</span>
                </button>

                <button
                  onClick={() => setDiningOption('DINE_IN')}
                  className={`flex flex-col items-center gap-3 rounded-3xl border-2 p-6 transition-all ${
                    diningOption === 'DINE_IN'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-xl shadow-emerald-500/10'
                      : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white'
                  }`}
                >
                  <ShoppingBag className="h-12 w-12" />
                  <span className="text-lg font-black">No Bag / Own Bag</span>
                  <span className="text-xs text-neutral-500">Eco-friendly carry out</span>
                </button>
              </div>
            </>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setCheckoutStep('REVIEW')}
              className="flex-1 rounded-2xl border border-neutral-800 bg-neutral-900 py-4 font-bold text-neutral-400 hover:text-white"
            >
              Back
            </button>
            <button
              onClick={() => setCheckoutStep('PAYMENT')}
              className="flex-[2] rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 py-4 text-lg font-black text-white shadow-xl shadow-orange-500/25 hover:opacity-95"
            >
              Proceed to Pay ({formatCurrency(grandTotal)})
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: TAP TO PAY SIMULATION */}
      {checkoutStep === 'PAYMENT' && (
        <div className="flex-1 max-w-md mx-auto w-full p-6 flex flex-col justify-center text-center space-y-8">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-widest text-orange-400">
              Total Amount
            </p>
            <h2 className="text-5xl font-black font-mono text-white">{formatCurrency(grandTotal)}</h2>
          </div>

          {/* Contactless Reader Target Graphic */}
          <div className="relative mx-auto flex h-60 w-60 flex-col items-center justify-center rounded-full border-4 border-dashed border-orange-500/40 bg-neutral-900/60 p-6 shadow-2xl">
            <CreditCard className="h-16 w-16 text-orange-400 animate-bounce" />
            <p className="mt-4 text-sm font-bold text-white">Tap Card or Phone Here</p>
            <p className="text-xs text-neutral-400 mt-1">Apple Pay, Google Pay, Chip Card</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleCompleteKioskPayment}
              disabled={isProcessingPayment}
              className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 py-4 text-lg font-black text-white shadow-xl shadow-emerald-500/25 hover:opacity-95"
            >
              {isProcessingPayment ? 'Authorizing Payment...' : 'Simulate Tap Payment'}
            </button>
            <button
              onClick={() => setCheckoutStep('DINING')}
              className="text-xs text-neutral-500 hover:text-neutral-300"
            >
              Cancel and Return
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: ORDER TICKET CONFIRMATION */}
      {checkoutStep === 'SUCCESS' && (
        <div className="flex-1 max-w-md mx-auto w-full p-6 flex flex-col justify-center text-center space-y-6 animate-in zoom-in duration-200">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-black text-white">Payment Successful!</h2>
            <p className="text-xs text-neutral-400">Your order has been sent to the kitchen</p>
          </div>

          <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-8 space-y-2">
            <p className="text-xs uppercase font-mono font-bold tracking-widest text-neutral-400">
              Your Order Number
            </p>
            <p className="text-6xl font-black font-mono text-orange-400 tracking-tight">
              {confirmedOrderNumber}
            </p>
            <p className="text-xs text-neutral-500 pt-2">
              Please take your receipt and watch the display screen.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-neutral-500">
            <Clock className="h-3.5 w-3.5" />
            <span>Screen resets in {countdown}s...</span>
          </div>

          <button
            onClick={resetKiosk}
            className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 py-3.5 font-bold text-white hover:bg-neutral-800"
          >
            Start New Order
          </button>
        </div>
      )}

      {/* PRODUCT CUSTOMIZATION MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl border border-neutral-800 bg-neutral-900 p-6 text-white shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs uppercase font-mono font-bold text-orange-400">
                  {selectedProduct.category}
                </span>
                <h3 className="text-xl font-black">{selectedProduct.name}</h3>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-neutral-400 hover:text-white font-bold text-xl"
              >
                ✕
              </button>
            </div>

            <div className="relative h-48 w-full overflow-hidden rounded-2xl bg-neutral-950">
              {selectedProduct.image && (
                <Image
                  src={selectedProduct.image}
                  alt={selectedProduct.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 500px"
                  className="object-cover"
                />
              )}
            </div>

            <p className="text-sm text-neutral-300">
              {selectedProduct.description || 'Prepared fresh with premium ingredients.'}
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-400">Special Instructions / Requests:</label>
              <textarea
                rows={2}
                placeholder="e.g. No onions, sauce on side, extra crispy..."
                value={customizationNotes}
                onChange={(e) => setCustomizationNotes(e.target.value)}
                className="w-full rounded-xl border border-neutral-700 bg-neutral-950 p-3 text-sm text-white focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-neutral-800">
              <span className="text-2xl font-black font-mono">
                {formatCurrency(selectedProduct.price)}
              </span>
              <button
                onClick={() => addToCart(selectedProduct, customizationNotes)}
                className="rounded-2xl bg-orange-500 px-6 py-3 font-extrabold text-white shadow-lg shadow-orange-500/30 hover:bg-orange-600 active:scale-95"
              >
                Add to My Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
