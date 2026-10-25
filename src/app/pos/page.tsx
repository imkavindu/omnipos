'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useStore } from '@/context/StoreContext';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { soundManager } from '@/lib/audio';
import { formatCurrency } from '@/lib/currency';
import confetti from 'canvas-confetti';
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  Percent,
  DollarSign,
  Printer,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  CreditCard,
  Banknote,
  UtensilsCrossed,
  Tag,
  RefreshCw,
} from 'lucide-react';

interface ProductItem {
  _id: string;
  storeId: string;
  name: string;
  category: string;
  price: number;
  costPrice: number;
  sku: string;
  barcode: string;
  image: string;
  stockQuantity: number;
  lowStockThreshold: number;
  kitchenCategory: 'GRILL' | 'BAR' | 'BAKERY' | 'DELI' | 'RETAIL';
  description?: string;
}

interface CartItem {
  product: ProductItem;
  quantity: number;
  notes?: string;
}

interface CompletedOrderData {
  _id: string;
  orderNumber: string;
  orderType: string;
  items: Array<{ name: string; price: number; quantity: number }>;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  cashTendered?: number;
  changeDue?: number;
  createdAt: string;
}

export default function PosTerminal() {
  const { activeStore } = useStore();

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<string[]>(['ALL']);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<'RETAIL_SALE' | 'DINE_IN' | 'TAKEAWAY'>('RETAIL_SALE');
  const [tableNumber, setTableNumber] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('Walk-in Customer');

  // Discount state
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [showDiscountModal, setShowDiscountModal] = useState<boolean>(false);

  // Barcode Lookup Modal
  const [showBarcodeModal, setShowBarcodeModal] = useState<boolean>(false);
  const [manualBarcodeInput, setManualBarcodeInput] = useState<string>('');
  const [scanAlert, setScanAlert] = useState<string>('');

  // Payment & Receipt Modals
  const [showCheckoutModal, setShowCheckoutModal] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'KIOSK_DIGITAL'>('CASH');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [completedOrder, setCompletedOrder] = useState<CompletedOrderData | null>(null);

  // Set default order type based on store type
  useEffect(() => {
    if (activeStore?.type === 'restaurant') {
      setOrderType('DINE_IN');
    } else {
      setOrderType('RETAIL_SALE');
    }
  }, [activeStore]);

  // Fetch products scoped to activeStore
  const fetchProducts = useCallback(async () => {
    if (!activeStore) return;
    try {
      setIsLoading(true);
      const res = await fetch(`/api/products?storeId=${activeStore._id}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setProducts(data);
        const uniqueCats = ['ALL', ...Array.from(new Set(data.map((p: ProductItem) => p.category)))];
        setCategories(uniqueCats);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeStore]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Cart operations
  const addToCart = useCallback((product: ProductItem) => {
    if (product.stockQuantity <= 0) {
      soundManager.playErrorBuzz();
      setScanAlert(`"${product.name}" is out of stock!`);
      setTimeout(() => setScanAlert(''), 3000);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product._id === product._id);
      if (existing) {
        return prev.map((item) =>
          item.product._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product._id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product._id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountValue(0);
  };

  // Barcode scanning handler (Keyboard wedge listener)
  const handleScannedCode = useCallback(
    async (code: string) => {
      if (!activeStore) return;
      try {
        const res = await fetch(`/api/products/barcode/${encodeURIComponent(code)}?storeId=${activeStore._id}`);
        const data = await res.json();
        if (res.ok && data._id) {
          addToCart(data);
          setScanAlert(`Scanned & Added: ${data.name}`);
          setTimeout(() => setScanAlert(''), 3000);
        } else {
          soundManager.playErrorBuzz();
          setScanAlert(data.error || `Barcode ${code} not recognized`);
          setTimeout(() => setScanAlert(''), 3000);
        }
      } catch {
        soundManager.playErrorBuzz();
        setScanAlert(`Error processing barcode ${code}`);
        setTimeout(() => setScanAlert(''), 3000);
      }
    },
    [activeStore, addToCart]
  );

  const { simulateScan } = useBarcodeScanner({
    onScan: handleScannedCode,
    enabled: !showCheckoutModal,
  });

  // Calculate totals
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    if (discountType === 'PERCENTAGE') {
      return (subtotal * discountValue) / 100;
    }
    return Math.min(discountValue, subtotal);
  }, [subtotal, discountValue, discountType]);

  const discountedSubtotal = Math.max(0, subtotal - discountAmount);

  const taxRate = activeStore ? activeStore.taxRate : 8.0;
  const tax = (discountedSubtotal * taxRate) / 100;
  const total = discountedSubtotal + tax;

  const numericCashTendered = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, numericCashTendered - total);

  // Filter products by category and search
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'ALL' || p.category === selectedCategory;
      const matchSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode.includes(searchQuery);
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Complete Order
  const handleProcessOrder = async () => {
    if (cart.length === 0 || !activeStore) return;

    if (paymentMethod === 'CASH' && numericCashTendered < total) {
      soundManager.playErrorBuzz();
      alert(`Cash tendered (${formatCurrency(numericCashTendered)}) is less than total amount (${formatCurrency(total)})`);
      return;
    }

    setIsSubmitting(true);
    try {
      const orderPayload = {
        storeId: activeStore._id,
        orderType,
        items: cart.map((item) => ({
          productId: item.product._id,
          name: item.product.name,
          sku: item.product.sku,
          barcode: item.product.barcode,
          price: item.product.price,
          quantity: item.quantity,
          kitchenCategory: item.product.kitchenCategory,
          notes: item.notes || '',
        })),
        subtotal: Number(subtotal.toFixed(2)),
        discount: Number(discountAmount.toFixed(2)),
        discountType,
        tax: Number(tax.toFixed(2)),
        total: Number(total.toFixed(2)),
        paymentMethod,
        paymentStatus: 'PAID',
        cashTendered: paymentMethod === 'CASH' ? numericCashTendered : total,
        changeDue: paymentMethod === 'CASH' ? Number(changeDue.toFixed(2)) : 0,
        customerName,
        tableNumber: orderType === 'DINE_IN' ? tableNumber : '',
        cashierName: 'POS Cashier Station',
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();
      if (!res.ok) {
        soundManager.playErrorBuzz();
        alert(data.error || 'Failed to complete order');
        return;
      }

      // Success
      soundManager.playSuccessChime();
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });

      setCompletedOrder({
        _id: data._id,
        orderNumber: data.orderNumber,
        orderType: data.orderType,
        items: data.items,
        subtotal: data.subtotal,
        tax: data.tax,
        discount: data.discount,
        total: data.total,
        paymentMethod: data.paymentMethod,
        cashTendered: data.cashTendered,
        changeDue: data.changeDue,
        createdAt: new Date().toISOString(),
      });

      // Reset cart and checkout modal
      clearCart();
      setShowCheckoutModal(false);
      setCashTendered('');

      // Refresh product stock count
      fetchProducts();
    } catch (err) {
      console.error('Order submission error:', err);
      soundManager.playErrorBuzz();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-53px)] overflow-hidden bg-neutral-950 text-white">
      {/* LEFT COLUMN: Product Catalog & Search (Responsive Grid) */}
      <div className="flex-1 flex flex-col border-r border-neutral-800/80 overflow-hidden">
        {/* Top Control Bar: Search, Category Pills, Barcode Button */}
        <div className="p-3 sm:p-4 border-b border-neutral-800 bg-neutral-900/50 space-y-3 shrink-0">
          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search products by name, SKU, or barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-neutral-700 bg-neutral-950 py-2 pl-9 pr-4 text-xs sm:text-sm text-white placeholder-neutral-500 focus:border-orange-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-xs text-neutral-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Barcode Scanner Modal Button */}
            <button
              onClick={() => setShowBarcodeModal(true)}
              className="flex items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-xs font-semibold text-orange-400 hover:border-orange-500 hover:bg-neutral-900 transition-colors shrink-0"
              title="Open Barcode Scanner Modal"
            >
              <Barcode className="h-4 w-4" />
              <span className="hidden sm:inline">Scan Barcode</span>
            </button>

            {/* Refresh Catalog */}
            <button
              onClick={fetchProducts}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-950 text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors shrink-0"
              title="Refresh Products"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                    : 'bg-neutral-950 text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Live Scanner / Hardware Wedge Alert Banner */}
          {scanAlert && (
            <div className="flex items-center justify-between rounded-xl bg-orange-500/20 border border-orange-500/40 px-3 py-1.5 text-xs text-orange-300 animate-in fade-in">
              <div className="flex items-center gap-2">
                <Barcode className="h-4 w-4 text-orange-400" />
                <span>{scanAlert}</span>
              </div>
              <button onClick={() => setScanAlert('')} className="text-neutral-400 hover:text-white">
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-neutral-400 text-sm">
                <RefreshCw className="h-6 w-6 animate-spin text-orange-400" />
                <span>Loading catalog items...</span>
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center text-neutral-400">
              <ShoppingBag className="h-10 w-10 text-neutral-600 mb-2" />
              <p className="text-sm font-semibold text-white">No products found</p>
              <p className="text-xs text-neutral-500 mt-1">Try adjusting your search or category filter</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((product) => {
                const isLowStock = product.stockQuantity <= product.lowStockThreshold;
                const isOutOfStock = product.stockQuantity <= 0;

                return (
                  <button
                    key={product._id}
                    onClick={() => {
                      soundManager.playScanBeep();
                      addToCart(product);
                    }}
                    disabled={isOutOfStock}
                    className={`group relative flex flex-col justify-between rounded-2xl border p-3 text-left transition-all ${
                      isOutOfStock
                        ? 'border-red-900/40 bg-neutral-950/50 opacity-60 cursor-not-allowed'
                        : 'border-neutral-800/80 bg-neutral-900/60 hover:border-orange-500/60 hover:bg-neutral-900 hover:shadow-lg hover:shadow-orange-500/5 active:scale-[0.98]'
                    }`}
                  >
                    {/* Product Image Thumbnail */}
                    <div className="relative mb-2 h-28 w-full overflow-hidden rounded-xl bg-neutral-950">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-neutral-700">
                          <ShoppingBag className="h-8 w-8" />
                        </div>
                      )}

                      {/* Stock Badge */}
                      <span
                        className={`absolute top-2 right-2 rounded-md px-1.5 py-0.5 text-[10px] font-mono font-bold ${
                          isOutOfStock
                            ? 'bg-red-500 text-white'
                            : isLowStock
                            ? 'bg-amber-500 text-neutral-950'
                            : 'bg-neutral-900/80 text-neutral-300 backdrop-blur-sm'
                        }`}
                      >
                        {isOutOfStock ? 'OUT OF STOCK' : `${product.stockQuantity} left`}
                      </span>
                    </div>

                    {/* Product Info */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400">
                          {product.category}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-500">{product.sku}</span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-2 group-hover:text-orange-400 transition-colors">
                        {product.name}
                      </h4>
                    </div>

                    {/* Price and Barcode */}
                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-neutral-800/80">
                      <span className="text-sm sm:text-base font-extrabold text-white font-mono">
                        {formatCurrency(product.price)}
                      </span>
                      <span className="flex items-center gap-1 font-mono text-[10px] text-neutral-400 group-hover:text-orange-400">
                        <Barcode className="h-3 w-3" />
                        {product.barcode}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Interactive Cart & Checkout Terminal */}
      <div className="w-full lg:w-[420px] flex flex-col bg-neutral-950 border-t lg:border-t-0 border-neutral-800 shrink-0">
        {/* Cart Header */}
        <div className="p-3 sm:p-4 border-b border-neutral-800 bg-neutral-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-orange-400" />
            <h3 className="font-bold text-sm sm:text-base">Current Cart</h3>
            <span className="rounded-full bg-orange-500/20 text-orange-400 px-2 py-0.5 text-xs font-mono font-bold">
              {cart.reduce((s, i) => s + i.quantity, 0)}
            </span>
          </div>

          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-neutral-400 hover:text-red-400 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>

        {/* Order Mode & Metadata Selector (Strict Store Type Separation) */}
        <div className="p-3 border-b border-neutral-800/80 bg-neutral-900/30 space-y-2 text-xs">
          {activeStore?.type === 'restaurant' ? (
            <>
              <div className="flex items-center gap-1.5">
                {(['DINE_IN', 'TAKEAWAY'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setOrderType(type)}
                    className={`flex-1 py-1.5 rounded-xl font-medium transition-all ${
                      orderType === type
                        ? 'bg-neutral-800 text-orange-400 border border-orange-500/40 shadow-sm font-semibold'
                        : 'bg-neutral-950 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {type === 'DINE_IN' ? '🍽️ Dine-In' : '🥡 Takeaway'}
                  </button>
                ))}
              </div>

              {orderType === 'DINE_IN' ? (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Table # (e.g. Table 4)"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-2.5 py-1 text-xs text-white focus:border-orange-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Guest Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-2.5 py-1 text-xs text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              ) : (
                <div className="pt-1">
                  <input
                    type="text"
                    placeholder="Guest / Pickup Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-2.5 py-1 text-xs text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-between py-1 px-1">
              <div className="flex items-center gap-1.5 text-neutral-300 font-semibold">
                <span className="h-2 w-2 rounded-full bg-blue-400" />
                <span>Retail Checkout Terminal</span>
              </div>
              <span className="font-mono text-[10px] uppercase font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                Barcode Wedge Active
              </span>
            </div>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-neutral-500">
              <ShoppingBag className="h-12 w-12 text-neutral-700 mb-2 stroke-[1.5]" />
              <p className="text-sm font-medium text-neutral-400">Cart is empty</p>
              <p className="text-xs text-neutral-600 mt-1 max-w-[200px]">
                Scan a barcode or tap products from the catalog to start an order.
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product._id}
                className="flex items-center justify-between gap-2 rounded-xl border border-neutral-800 bg-neutral-900/60 p-2.5 transition-all hover:border-neutral-700"
              >
                <div className="flex-1 min-w-0">
                  <h5 className="text-xs font-bold text-white truncate">{item.product.name}</h5>
                  <p className="text-[11px] text-neutral-400 font-mono">
                    {formatCurrency(item.product.price)} × {item.quantity} ={' '}
                    <span className="text-white font-semibold">
                      {formatCurrency(item.product.price * item.quantity)}
                    </span>
                  </p>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => updateQuantity(item.product._id, -1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-950 text-neutral-300 hover:text-white hover:bg-neutral-800"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-6 text-center font-mono text-xs font-bold text-white">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.product._id, 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-950 text-neutral-300 hover:text-white hover:bg-neutral-800"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => removeFromCart(item.product._id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-500 hover:text-red-400 hover:bg-neutral-900"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Calculation & Action Footer */}
        <div className="p-3 sm:p-4 border-t border-neutral-800 bg-neutral-900/80 space-y-2.5 shrink-0">
          {/* Discount & Quick Promos */}
          <div className="flex items-center justify-between text-xs">
            <button
              onClick={() => setShowDiscountModal(true)}
              className="flex items-center gap-1 text-neutral-400 hover:text-orange-400 transition-colors"
            >
              <Tag className="h-3.5 w-3.5" />
              <span>
                Discount:{' '}
                {discountValue > 0
                  ? `${discountValue}${discountType === 'PERCENTAGE' ? '%' : ' Rs.'}`
                  : 'Add promo'}
              </span>
            </button>
            {discountAmount > 0 && (
              <span className="font-mono text-emerald-400 font-semibold">
                -{formatCurrency(discountAmount)}
              </span>
            )}
          </div>

          {/* Subtotal, Tax, and Total Summary */}
          <div className="space-y-1 text-xs text-neutral-400 pt-1 border-t border-neutral-800/80">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-mono text-white">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax ({taxRate}%):</span>
              <span className="font-mono text-white">{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-white pt-1 border-t border-neutral-800">
              <span>Total:</span>
              <span className="font-mono text-orange-400">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Checkout Button */}
          <button
            onClick={() => setShowCheckoutModal(true)}
            disabled={cart.length === 0}
            className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 font-bold text-sm shadow-xl transition-all ${
              cart.length === 0
                ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-orange-500/25 hover:opacity-95 active:scale-[0.99]'
            }`}
          >
            <CreditCard className="h-4 w-4" />
            <span>Pay {formatCurrency(total)}</span>
          </button>
        </div>
      </div>

      {/* MODAL 1: Barcode Scan Simulator & Manual Search */}
      {showBarcodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-5 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400">
                  <Barcode className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Barcode Scanner Simulator</h3>
                  <p className="text-xs text-neutral-400">Hardware Wedge or Rapid Lookup</p>
                </div>
              </div>
              <button
                onClick={() => setShowBarcodeModal(false)}
                className="text-neutral-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            {/* Manual input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (manualBarcodeInput) {
                  simulateScan(manualBarcodeInput);
                  setShowBarcodeModal(false);
                  setManualBarcodeInput('');
                }
              }}
              className="space-y-2"
            >
              <label className="text-xs font-semibold text-neutral-300">
                Type or Paste Barcode / SKU:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. 8901001"
                  value={manualBarcodeInput}
                  onChange={(e) => setManualBarcodeInput(e.target.value)}
                  className="flex-1 rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white font-mono focus:border-orange-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600"
                >
                  Lookup
                </button>
              </div>
            </form>

            {/* Quick Test Barcode Buttons for Active Store */}
            <div className="space-y-2 pt-2 border-t border-neutral-800">
              <p className="text-xs text-neutral-400">Sample Barcodes for {activeStore?.name}:</p>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {products.slice(0, 6).map((p) => (
                  <button
                    key={p.barcode}
                    onClick={() => {
                      simulateScan(p.barcode);
                      setShowBarcodeModal(false);
                    }}
                    className="flex flex-col rounded-xl border border-neutral-800 bg-neutral-950 p-2 text-left hover:border-orange-500 hover:bg-neutral-900 transition-all"
                  >
                    <span className="font-mono text-xs font-bold text-orange-400">{p.barcode}</span>
                    <span className="text-[11px] text-neutral-300 truncate">{p.name}</span>
                    <span className="text-[10px] text-neutral-500">{formatCurrency(p.price)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Discount & Promo Code */}
      {showDiscountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900 p-5 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-orange-400" />
                <h3 className="font-bold text-sm">Apply Cart Discount</h3>
              </div>
              <button
                onClick={() => setShowDiscountModal(false)}
                className="text-neutral-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDiscountType('PERCENTAGE')}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold ${
                  discountType === 'PERCENTAGE'
                    ? 'bg-orange-500 text-white'
                    : 'bg-neutral-950 text-neutral-400'
                }`}
              >
                Percentage (%)
              </button>
              <button
                type="button"
                onClick={() => setDiscountType('FIXED')}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold ${
                  discountType === 'FIXED' ? 'bg-orange-500 text-white' : 'bg-neutral-950 text-neutral-400'
                }`}
              >
                Fixed Amount (Rs.)
              </button>
            </div>

            <div className="space-y-1">
              <input
                type="number"
                min="0"
                max={discountType === 'PERCENTAGE' ? 100 : subtotal}
                value={discountValue || ''}
                onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                placeholder={discountType === 'PERCENTAGE' ? 'e.g. 10 for 10%' : 'e.g. 500 for Rs. 500'}
                className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-2.5 text-center text-lg font-mono text-white focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[5, 10, 15, 20].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => {
                    setDiscountType('PERCENTAGE');
                    setDiscountValue(pct);
                  }}
                  className="rounded-lg border border-neutral-800 bg-neutral-950 py-1.5 text-xs font-semibold text-neutral-300 hover:border-orange-500 hover:text-white"
                >
                  {pct}% OFF
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowDiscountModal(false)}
              className="w-full rounded-xl bg-orange-500 py-2.5 text-xs font-bold text-white hover:bg-orange-600"
            >
              Apply Discount
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: Checkout & Payment Modal (Touchpad / Cash change calculation) */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div>
                <h3 className="font-bold text-base">Complete Payment</h3>
                <p className="text-xs text-neutral-400">Total Due: {formatCurrency(total)}</p>
              </div>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="text-neutral-400 hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setPaymentMethod('CASH')}
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition-all ${
                  paymentMethod === 'CASH'
                    ? 'border-orange-500 bg-orange-500/10 text-orange-400 shadow-md'
                    : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white'
                }`}
              >
                <Banknote className="h-5 w-5" />
                <span>Cash</span>
              </button>

              <button
                onClick={() => setPaymentMethod('CARD')}
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition-all ${
                  paymentMethod === 'CARD'
                    ? 'border-orange-500 bg-orange-500/10 text-orange-400 shadow-md'
                    : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white'
                }`}
              >
                <CreditCard className="h-5 w-5" />
                <span>Credit Card</span>
              </button>

              <button
                onClick={() => setPaymentMethod('KIOSK_DIGITAL')}
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition-all ${
                  paymentMethod === 'KIOSK_DIGITAL'
                    ? 'border-orange-500 bg-orange-500/10 text-orange-400 shadow-md'
                    : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white'
                }`}
              >
                <DollarSign className="h-5 w-5" />
                <span>NFC / Digital</span>
              </button>
            </div>

            {/* Cash Calculation Pad */}
            {paymentMethod === 'CASH' ? (
              <div className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-neutral-400">Cash Received:</label>
                  <input
                    type="number"
                    step="0.01"
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    placeholder={total.toFixed(2)}
                    className="w-36 rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-right font-mono text-base font-bold text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>

                {/* Quick denomination pills */}
                <div className="flex items-center gap-1.5">
                  {[
                    Math.ceil(total),
                    Math.ceil(total / 100) * 100,
                    Math.ceil(total / 500) * 500 || 500,
                    Math.ceil(total / 1000) * 1000 || 1000,
                    1000,
                    2000,
                    5000,
                  ]
                    .filter((v, i, a) => v >= total && a.indexOf(v) === i)
                    .slice(0, 4)
                    .map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setCashTendered(val.toString())}
                        className="flex-1 rounded-lg border border-neutral-800 bg-neutral-900 py-1 text-xs font-mono font-semibold text-neutral-300 hover:border-orange-500 hover:text-white"
                      >
                        {formatCurrency(val, { showDecimals: false })}
                      </button>
                    ))}
                </div>

                {/* Change Due Display */}
                <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80">
                  <span className="text-xs text-neutral-400">Change Due:</span>
                  <span
                    className={`font-mono text-lg font-extrabold ${
                      numericCashTendered >= total ? 'text-emerald-400' : 'text-neutral-500'
                    }`}
                  >
                    {formatCurrency(changeDue)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 text-center space-y-2">
                <CreditCard className="h-10 w-10 text-orange-400 mx-auto animate-pulse" />
                <p className="text-sm font-semibold text-white">Card Terminal Ready</p>
                <p className="text-xs text-neutral-400">
                  Tap, insert card, or use contactless smart device to authorize {formatCurrency(total)}.
                </p>
              </div>
            )}

            <button
              onClick={handleProcessOrder}
              disabled={isSubmitting || (paymentMethod === 'CASH' && numericCashTendered < total)}
              className={`w-full rounded-xl py-3 text-sm font-bold shadow-lg transition-all ${
                paymentMethod === 'CASH' && numericCashTendered < total
                  ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/25 hover:opacity-95'
              }`}
            >
              {isSubmitting ? 'Finalizing Order...' : `Confirm & Print Receipt (${formatCurrency(total)})`}
            </button>
          </div>
        </div>
      )}

      {/* MODAL 4: Digital Receipt Modal (Printable) */}
      {completedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-white p-6 text-neutral-900 shadow-2xl font-mono text-xs space-y-4 animate-in fade-in zoom-in duration-150">
            {/* Thermal Receipt Header */}
            <div className="text-center space-y-1 border-b border-dashed border-neutral-300 pb-3">
              <h2 className="text-base font-extrabold tracking-tight uppercase">
                {activeStore?.name || 'OmniPOS'}
              </h2>
              <p className="text-[10px] text-neutral-600">{activeStore?.address}</p>
              <p className="text-[10px] text-neutral-600">Tel: {activeStore?.phone}</p>
              <div className="pt-2 text-xs font-bold text-orange-600">
                TICKET #{completedOrder.orderNumber}
              </div>
              <p className="text-[10px] text-neutral-500">
                {new Date(completedOrder.createdAt).toLocaleString()} • {completedOrder.orderType}
              </p>
            </div>

            {/* Line Items */}
            <div className="space-y-1.5 border-b border-dashed border-neutral-300 pb-3">
              {completedOrder.items.map((it, idx) => (
                <div key={idx} className="flex justify-between items-start">
                  <div className="flex-1 pr-2">
                    <p className="font-bold">{it.name}</p>
                    <p className="text-[10px] text-neutral-600">
                      {it.quantity} @ {formatCurrency(it.price)}
                    </p>
                  </div>
                  <span className="font-bold">{formatCurrency(it.price * it.quantity)}</span>
                </div>
              ))}
            </div>

            {/* Calculation Totals */}
            <div className="space-y-1 border-b border-dashed border-neutral-300 pb-3">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(completedOrder.subtotal)}</span>
              </div>
              {completedOrder.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount:</span>
                  <span>-{formatCurrency(completedOrder.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>{formatCurrency(completedOrder.tax)}</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold pt-1">
                <span>TOTAL:</span>
                <span>{formatCurrency(completedOrder.total)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-neutral-600 pt-1">
                <span>Method ({completedOrder.paymentMethod}):</span>
                <span>{formatCurrency(completedOrder.cashTendered || completedOrder.total)}</span>
              </div>
              {completedOrder.changeDue !== undefined && completedOrder.changeDue > 0 && (
                <div className="flex justify-between font-bold text-neutral-800">
                  <span>Change Given:</span>
                  <span>{formatCurrency(completedOrder.changeDue)}</span>
                </div>
              )}
            </div>

            {/* Receipt Barcode Graphic */}
            <div className="text-center space-y-1 pt-1">
              <div className="inline-block p-1 bg-neutral-100 rounded">
                <Barcode className="h-8 w-36 mx-auto text-neutral-900" />
              </div>
              <p className="text-[10px] tracking-widest text-neutral-600 font-bold">
                *{completedOrder.orderNumber}*
              </p>
              <p className="text-[10px] text-neutral-500 pt-1">
                {activeStore?.receiptFooter || 'Thank you for your visit!'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-300 bg-neutral-100 py-2.5 font-sans text-xs font-bold text-neutral-800 hover:bg-neutral-200"
              >
                <Printer className="h-4 w-4" />
                <span>Print</span>
              </button>
              <button
                onClick={() => setCompletedOrder(null)}
                className="rounded-xl bg-orange-600 py-2.5 font-sans text-xs font-bold text-white hover:bg-orange-700 shadow-md"
              >
                New Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
