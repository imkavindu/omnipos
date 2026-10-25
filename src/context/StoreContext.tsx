'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { soundManager } from '@/lib/audio';

export type UserRole = 'SUPER_ADMIN' | 'STORE_MANAGER' | 'CASHIER' | 'KIOSK' | 'KITCHEN';

export interface StoreData {
  _id: string;
  code: string;
  name: string;
  type: 'restaurant' | 'retail';
  address: string;
  phone: string;
  currency: string;
  currencySymbol: string;
  taxRate: number;
  receiptHeader: string;
  receiptFooter: string;
}

export interface UserData {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  storeId?: string | null;
  avatar?: string;
  mustChangePin?: boolean;
}

interface StoreContextType {
  stores: StoreData[];
  activeStore: StoreData | null;
  userRole: UserRole;
  activeUser: UserData | null;
  soundEnabled: boolean;
  isLoading: boolean;
  isRestaurant: boolean;
  isRetail: boolean;
  setActiveStoreId: (storeId: string) => void;
  setActiveStoreByCode: (code: string) => StoreData | null;
  setActiveStore: (store: StoreData | null) => void;
  setUserRole: (role: UserRole) => void;
  setActiveUser: (user: UserData | null) => void;
  loginWithPin: (pin: string, storeId?: string) => Promise<{ success: boolean; error?: string; redirectUrl?: string }>;
  loginAdmin: (credentials: { email: string; password: string }) => Promise<{ success: boolean; error?: string; redirectUrl?: string }>;
  logout: () => Promise<void>;
  toggleSound: () => void;
  refreshStores: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [stores, setStores] = useState<StoreData[]>([]);
  const [activeStore, setActiveStore] = useState<StoreData | null>(null);
  const [userRole, setUserRoleState] = useState<UserRole>('CASHIER');
  const [activeUser, setActiveUserState] = useState<UserData | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 1. Fetch available store branches
  const fetchStores = useCallback(async () => {
    try {
      const res = await fetch('/api/stores');
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setStores(data);

        // Preference for branch terminal selector
        const savedStoreId = typeof window !== 'undefined' ? localStorage.getItem('omnipos_store_id') : null;
        const matched = data.find((s) => s._id === savedStoreId);
        if (matched) {
          setActiveStore(matched);
        } else {
          setActiveStore(data[0]);
          if (typeof window !== 'undefined') localStorage.setItem('omnipos_store_id', data[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to load stores:', err);
    }
  }, []);

  // 2. Verify session via server-side httpOnly cookie (/api/auth/me)
  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { method: 'GET' });
      const data = await res.json();
      if (data.authenticated && data.user) {
        setActiveUserState(data.user);
        setUserRoleState(data.user.role);
      } else {
        setActiveUserState(null);
      }
    } catch (err) {
      console.error('Failed to verify authentication session:', err);
      setActiveUserState(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStores();
    refreshSession();
  }, [fetchStores, refreshSession]);

  const setActiveStoreId = (storeId: string) => {
    const found = stores.find((s) => s._id === storeId);
    if (found) {
      setActiveStore(found);
      if (typeof window !== 'undefined') {
        localStorage.setItem('omnipos_store_id', found._id);
      }
    }
  };

  const setUserRole = (role: UserRole) => {
    setUserRoleState(role);
  };

  const setActiveUser = (user: UserData | null) => {
    setActiveUserState(user);
    if (user) {
      setUserRoleState(user.role);
      if (user.storeId) {
        setActiveStoreId(user.storeId);
      }
    }
  };

  // 3. Store Staff 4-Digit PIN Login (Server-side bcrypt validation + httpOnly cookie)
  const loginWithPin = async (
    pin: string,
    storeId?: string
  ): Promise<{ success: boolean; error?: string; redirectUrl?: string }> => {
    try {
      const targetStoreId = storeId || activeStore?._id;
      if (!targetStoreId) {
        soundManager.playErrorBuzz();
        return { success: false, error: 'Please select a store branch' };
      }

      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinCode: pin, storeId: targetStoreId }),
      });

      const data = await res.json();
      if (!res.ok) {
        soundManager.playErrorBuzz();
        return { success: false, error: data.error || 'Authentication failed' };
      }

      const user: UserData = data.user;
      setActiveUser(user);
      soundManager.playSuccessChime();

      // Route staff exclusively to their designated workspace
      let redirectUrl = '/pos';
      switch (user.role) {
        case 'STORE_MANAGER':
          redirectUrl = '/manager';
          break;
        case 'CASHIER':
          redirectUrl = '/pos';
          break;
        case 'KIOSK':
          redirectUrl = '/kiosk';
          break;
        case 'KITCHEN':
          redirectUrl = '/kds';
          break;
        default:
          redirectUrl = '/pos';
      }

      return { success: true, redirectUrl };
    } catch {
      soundManager.playErrorBuzz();
      return { success: false, error: 'Network error connecting to auth service' };
    }
  };

  // 4. Super Admin Platform Login (Email + Password credentials + httpOnly cookie)
  const loginAdmin = async (credentials: {
    email: string;
    password: string;
  }): Promise<{ success: boolean; error?: string; redirectUrl?: string }> => {
    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const data = await res.json();
      if (!res.ok) {
        soundManager.playErrorBuzz();
        return { success: false, error: data.error || 'Invalid administrator credentials' };
      }

      const user: UserData = data.user;
      setActiveUser(user);
      soundManager.playSuccessChime();

      return { success: true, redirectUrl: '/admin' };
    } catch {
      soundManager.playErrorBuzz();
      return { success: false, error: 'Network error connecting to auth service' };
    }
  };

  const setActiveStoreByCode = (code: string) => {
    const found = stores.find((s) => s.code.toLowerCase() === code.toLowerCase());
    if (found) {
      setActiveStore(found);
      if (typeof window !== 'undefined') {
        localStorage.setItem('omnipos_store_id', found._id);
      }
      return found;
    }
    return null;
  };

  // 5. Server-side logout (clears httpOnly cookie via API)
  const logout = async () => {
    const isSuperAdmin = activeUser?.role === 'SUPER_ADMIN';
    const currentStoreCode = activeStore?.code;
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setActiveUserState(null);
      setUserRoleState('CASHIER');
      if (typeof window !== 'undefined') {
        if (isSuperAdmin) {
          window.location.href = '/admin/login';
        } else if (currentStoreCode) {
          window.location.href = `/store/${currentStoreCode.toLowerCase()}`;
        } else {
          window.location.href = '/';
        }
      }
    }
  };

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      soundManager.enabled = next;
      return next;
    });
  };

  const isRestaurant = activeStore?.type === 'restaurant';
  const isRetail = activeStore?.type === 'retail';

  return (
    <StoreContext.Provider
      value={{
        stores,
        activeStore,
        userRole,
        activeUser,
        soundEnabled,
        isLoading,
        isRestaurant,
        isRetail,
        setActiveStoreId,
        setActiveStoreByCode,
        setActiveStore,
        setUserRole,
        setActiveUser,
        loginWithPin,
        loginAdmin,
        logout,
        toggleSound,
        refreshStores: fetchStores,
        refreshSession,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
