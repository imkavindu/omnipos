'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useStore } from '@/context/StoreContext';
import { soundManager } from '@/lib/audio';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Utensils,
  RefreshCw,
  BellRing,
  Layers,
} from 'lucide-react';

interface KdsOrderItem {
  productId: string;
  name: string;
  quantity: number;
  notes?: string;
  kitchenCategory?: 'GRILL' | 'BAR' | 'BAKERY' | 'DELI' | 'RETAIL';
  status?: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED';
}

interface KdsOrder {
  _id: string;
  storeId: string;
  orderNumber: string;
  orderType: string;
  items: KdsOrderItem[];
  orderStatus: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
  tableNumber?: string;
  customerName?: string;
  createdAt: string;
}

export default function KitchenDisplaySystem() {
  const { activeStore } = useStore();

  const [orders, setOrders] = useState<KdsOrder[]>([]);
  const [stationFilter, setStationFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [now, setNow] = useState<number>(Date.now());

  // Live timer tick every second for elapsed time displays
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch active kitchen orders
  const fetchOrders = useCallback(async () => {
    if (!activeStore) return;
    try {
      const res = await fetch(
        `/api/orders?storeId=${activeStore._id}&status=PENDING,PREPARING,READY&limit=50`
      );
      const data = await res.json();
      if (Array.isArray(data)) {
        setOrders(data);
      }
    } catch (err) {
      console.error('Failed to load KDS orders:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeStore]);

  // Initial load and polling every 6 seconds for live tickets
  useEffect(() => {
    fetchOrders();
    const poll = setInterval(fetchOrders, 6000);
    return () => clearInterval(poll);
  }, [fetchOrders]);

  // Advance order status
  const updateOrderStatus = async (
    orderId: string,
    nextStatus: 'PREPARING' | 'READY' | 'COMPLETED'
  ) => {
    soundManager.playKitchenDing();
    try {
      // Optimistic update
      setOrders((prev) =>
        prev
          .map((ord) => (ord._id === orderId ? { ...ord, orderStatus: nextStatus } : ord))
          .filter((ord) => (nextStatus === 'COMPLETED' ? ord._id !== orderId : true))
      );

      await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderStatus: nextStatus }),
      });
    } catch (err) {
      console.error('Failed to update ticket status:', err);
      fetchOrders();
    }
  };

  // Helper to format elapsed time mm:ss
  const getElapsedFormatted = (createdAt: string) => {
    const elapsedSecs = Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 1000));
    const mins = Math.floor(elapsedSecs / 60);
    const secs = elapsedSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Helper for urgency styling
  const getUrgencyClasses = (createdAt: string) => {
    const elapsedMins = (now - new Date(createdAt).getTime()) / 1000 / 60;
    if (elapsedMins > 15) {
      return 'border-red-500 bg-red-950/30 text-red-400 animate-pulse';
    }
    if (elapsedMins > 7) {
      return 'border-amber-500 bg-amber-950/30 text-amber-300';
    }
    return 'border-emerald-500/50 bg-emerald-950/20 text-emerald-400';
  };

  // Stations
  const stations = ['ALL', 'GRILL', 'BAR', 'DELI', 'BAKERY'];

  // Filter orders by station if selected
  const filteredOrders = useMemo(() => {
    if (stationFilter === 'ALL') return orders;
    return orders.filter((ord) =>
      ord.items.some((it) => it.kitchenCategory === stationFilter)
    );
  }, [orders, stationFilter]);

  const pendingOrders = filteredOrders.filter((o) => o.orderStatus === 'PENDING');
  const preparingOrders = filteredOrders.filter((o) => o.orderStatus === 'PREPARING');
  const readyOrders = filteredOrders.filter((o) => o.orderStatus === 'READY');

  return (
    <div className="flex-1 flex flex-col bg-neutral-950 text-white min-h-[calc(100vh-53px)] overflow-hidden">
      {/* KDS Header HUD */}
      <div className="border-b border-neutral-800 bg-neutral-900/90 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-500/20">
            <ChefHat className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-white">
              Live Kitchen Display (KDS)
            </h1>
            <p className="text-xs text-neutral-400">
              {activeStore ? activeStore.name : 'Kitchen Station'} • Active Tickets:{' '}
              <span className="font-mono text-orange-400 font-bold">{orders.length}</span>
            </p>
          </div>
        </div>

        {/* Station Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {stations.map((st) => (
            <button
              key={st}
              onClick={() => setStationFilter(st)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                stationFilter === st
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                  : 'bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}

          <button
            onClick={fetchOrders}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white ml-2"
            title="Refresh Tickets"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KANBAN COLUMNS */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 overflow-x-auto">
        {/* COLUMN 1: NEW / PENDING ORDERS */}
        <div className="flex flex-col rounded-2xl border border-neutral-800/80 bg-neutral-900/40 overflow-hidden">
          <div className="p-3 border-b border-neutral-800 bg-neutral-900/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-blue-400 animate-pulse" />
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-blue-400">
                New Tickets
              </h3>
            </div>
            <span className="rounded-full bg-blue-500/20 px-2 py-0.5 font-mono text-xs font-bold text-blue-300">
              {pendingOrders.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {pendingOrders.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center text-center text-neutral-600">
                <Utensils className="h-8 w-8 mb-1 stroke-[1.5]" />
                <p className="text-xs font-semibold">No pending tickets</p>
              </div>
            ) : (
              pendingOrders.map((ord) => (
                <div
                  key={ord._id}
                  className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 shadow-xl space-y-3 transition-all hover:border-blue-500/50"
                >
                  {/* Ticket Header */}
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                    <div>
                      <span className="text-lg font-black font-mono text-white">
                        {ord.orderNumber}
                      </span>
                      <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                        <span>{ord.tableNumber || ord.orderType}</span>
                        <span>•</span>
                        <span>{ord.customerName || 'Guest'}</span>
                      </div>
                    </div>

                    {/* Timer Badge */}
                    <div
                      className={`flex items-center gap-1 rounded-lg border px-2 py-1 font-mono text-xs font-black ${getUrgencyClasses(
                        ord.createdAt
                      )}`}
                    >
                      <Clock className="h-3.5 w-3.5" />
                      <span>{getElapsedFormatted(ord.createdAt)}</span>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="space-y-1.5 text-xs">
                    {ord.items.map((item, idx) => (
                      <div key={idx} className="flex items-start justify-between">
                        <div className="flex items-start gap-1.5">
                          <span className="font-mono font-black text-orange-400">
                            {item.quantity}×
                          </span>
                          <div>
                            <span className="font-bold text-white">{item.name}</span>
                            {item.notes && (
                              <p className="text-[11px] text-amber-400 font-semibold">
                                ★ {item.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-[9px] uppercase font-mono px-1 rounded bg-neutral-800 text-neutral-400">
                          {item.kitchenCategory || 'KITCHEN'}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Advance to Preparing button */}
                  <button
                    onClick={() => updateOrderStatus(ord._id, 'PREPARING')}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 text-xs font-black text-white shadow-md shadow-blue-600/20 hover:opacity-95"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>Start Preparing</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUMN 2: IN PREPARATION */}
        <div className="flex flex-col rounded-2xl border border-neutral-800/80 bg-neutral-900/40 overflow-hidden">
          <div className="p-3 border-b border-neutral-800 bg-neutral-900/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping" />
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-amber-400">
                In Preparation
              </h3>
            </div>
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 font-mono text-xs font-bold text-amber-300">
              {preparingOrders.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {preparingOrders.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center text-center text-neutral-600">
                <ChefHat className="h-8 w-8 mb-1 stroke-[1.5]" />
                <p className="text-xs font-semibold">No active cooking tickets</p>
              </div>
            ) : (
              preparingOrders.map((ord) => (
                <div
                  key={ord._id}
                  className="rounded-2xl border border-amber-500/30 bg-neutral-900 p-4 shadow-xl space-y-3 transition-all hover:border-amber-500"
                >
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                    <div>
                      <span className="text-lg font-black font-mono text-white">
                        {ord.orderNumber}
                      </span>
                      <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                        <span>{ord.tableNumber || ord.orderType}</span>
                        <span>•</span>
                        <span>{ord.customerName || 'Guest'}</span>
                      </div>
                    </div>

                    <div
                      className={`flex items-center gap-1 rounded-lg border px-2 py-1 font-mono text-xs font-black ${getUrgencyClasses(
                        ord.createdAt
                      )}`}
                    >
                      <Clock className="h-3.5 w-3.5" />
                      <span>{getElapsedFormatted(ord.createdAt)}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    {ord.items.map((item, idx) => (
                      <div key={idx} className="flex items-start justify-between">
                        <div className="flex items-start gap-1.5">
                          <span className="font-mono font-black text-amber-400">
                            {item.quantity}×
                          </span>
                          <div>
                            <span className="font-bold text-white">{item.name}</span>
                            {item.notes && (
                              <p className="text-[11px] text-amber-400 font-semibold">
                                ★ {item.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-[9px] uppercase font-mono px-1 rounded bg-neutral-800 text-neutral-400">
                          {item.kitchenCategory || 'KITCHEN'}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => updateOrderStatus(ord._id, 'READY')}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-2.5 text-xs font-black text-white shadow-md shadow-amber-500/20 hover:opacity-95"
                  >
                    <BellRing className="h-3.5 w-3.5" />
                    <span>Mark as Ready</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUMN 3: READY FOR PICKUP */}
        <div className="flex flex-col rounded-2xl border border-neutral-800/80 bg-neutral-900/40 overflow-hidden">
          <div className="p-3 border-b border-neutral-800 bg-neutral-900/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-emerald-400">
                Ready for Pickup
              </h3>
            </div>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 font-mono text-xs font-bold text-emerald-300">
              {readyOrders.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {readyOrders.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center text-center text-neutral-600">
                <CheckCircle2 className="h-8 w-8 mb-1 stroke-[1.5]" />
                <p className="text-xs font-semibold">No tickets awaiting pickup</p>
              </div>
            ) : (
              readyOrders.map((ord) => (
                <div
                  key={ord._id}
                  className="rounded-2xl border border-emerald-500/40 bg-neutral-900 p-4 shadow-xl space-y-3 transition-all hover:border-emerald-500"
                >
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                    <div>
                      <span className="text-lg font-black font-mono text-emerald-400">
                        {ord.orderNumber}
                      </span>
                      <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                        <span>{ord.tableNumber || ord.orderType}</span>
                        <span>•</span>
                        <span>{ord.customerName || 'Guest'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 rounded-lg border border-emerald-500/50 bg-emerald-950/40 px-2 py-1 font-mono text-xs font-black text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Ready</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    {ord.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span className="text-neutral-300">
                          {item.quantity}× {item.name}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => updateOrderStatus(ord._id, 'COMPLETED')}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-2.5 text-xs font-black text-white shadow-md shadow-emerald-600/20 hover:opacity-95"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Complete / Serve Ticket</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
