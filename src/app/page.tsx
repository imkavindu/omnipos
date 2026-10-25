'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Store,
  Zap,
  BarChart3,
  Users,
  ShieldCheck,
  Globe,
  ChefHat,
  Star,
  CheckCircle2,
  ArrowRight,
  X,
  Building2,
  Mail,
  Phone,
  MessageSquare,
  Send,
  Eye,
  EyeOff,
  Loader2,
  ChevronRight,
  CreditCard,
  MonitorCheck,
  TrendingUp,
  Package,
  Bell,
  Lock,
  AlertCircle,
  CheckCheck,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PricingPlan {
  id: 'starter' | 'growth' | 'enterprise';
  name: string;
  price: number;
  description: string;
  features: string[];
  highlight?: boolean;
  badge?: string;
}

interface RegistrationData {
  businessName: string;
  storeCode: string;
  storeType: 'restaurant' | 'retail';
  storePassword: string;
  planTier: 'starter' | 'growth' | 'enterprise';
  ownerName: string;
  ownerEmail: string;
  managerPin: string;
  address: string;
  phone: string;
}

type RegistrationStep = 1 | 2 | 3 | 4;

// ─── Data ─────────────────────────────────────────────────────────────────────

const PLANS: PricingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 4900,
    description: 'Perfect for small cafés, food stalls, and boutique shops getting started.',
    features: [
      '1 Branch / Terminal',
      'Up to 5 Staff Accounts',
      'POS & Barcode Scanner',
      'Basic Sales Reports',
      'Email Support',
      '100 Products',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 9900,
    description: 'For growing restaurants and retail stores with multiple staff.',
    highlight: true,
    badge: 'Most Popular',
    features: [
      '3 Branches / Terminals',
      'Up to 20 Staff Accounts',
      'POS + Kitchen Display (KDS)',
      'Self-Checkout Kiosk',
      'Advanced Analytics',
      'Priority Support',
      'Unlimited Products',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 19900,
    description: 'Full-featured SaaS for chains, franchises, and large retailers.',
    features: [
      'Unlimited Branches',
      'Unlimited Staff',
      'All POS Modules',
      'Multi-Store Analytics Hub',
      'Dedicated Account Manager',
      'API Access',
      'Custom Integrations',
      'SLA Guarantee',
    ],
  },
];

const FEATURES = [
  {
    icon: CreditCard,
    title: 'Smart POS Terminal',
    desc: 'Lightning-fast checkout with barcode scanning, cash & card, split payments, and receipt printing.',
    color: 'from-amber-500 to-orange-500',
  },
  {
    icon: ChefHat,
    title: 'Kitchen Display System',
    desc: 'Real-time order routing to kitchen stations. Colour-coded ticket ageing so nothing goes cold.',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    icon: MonitorCheck,
    title: 'Self-Checkout Kiosk',
    desc: 'Customer-facing ordering terminal with digital payment. Reduce queues and labour costs.',
    color: 'from-cyan-500 to-blue-500',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Analytics',
    desc: 'Hourly sales heatmaps, top-selling SKUs, staff performance, and LKR revenue dashboards.',
    color: 'from-purple-500 to-indigo-500',
  },
  {
    icon: Users,
    title: 'Role-Based Staff Access',
    desc: 'Manager, Cashier, Chef, and Kiosk roles with 4-digit PIN authentication per terminal.',
    color: 'from-rose-500 to-pink-500',
  },
  {
    icon: ShieldCheck,
    title: 'Enterprise Security',
    desc: 'Two-factor store connection (code + password), bcrypt-hashed PINs, and httpOnly JWT sessions.',
    color: 'from-slate-500 to-neutral-600',
  },
  {
    icon: Package,
    title: 'Inventory Management',
    desc: 'SKU-level stock tracking, low-stock alerts, and cost-price margin analysis.',
    color: 'from-amber-600 to-yellow-500',
  },
  {
    icon: Globe,
    title: 'Multi-Tenant SaaS',
    desc: 'Strict data isolation between tenants. Scale from 1 branch to a nationwide chain on one platform.',
    color: 'from-violet-500 to-purple-600',
  },
];

const TESTIMONIALS = [
  {
    name: 'Ruwan Perera',
    role: 'Owner, Spice Route Restaurant, Colombo',
    avatar: 'RP',
    rating: 5,
    text: 'OmniPOS transformed our restaurant. The KDS alone cut our average order time by 40%. Setup took under 10 minutes!',
    color: 'from-orange-500 to-amber-500',
  },
  {
    name: 'Nimasha Fernando',
    role: 'Manager, Trend Boutique, Kandy',
    avatar: 'NF',
    rating: 5,
    text: 'The multi-store analytics is a game changer. I can see live sales across all three branches from my phone. Rs. 9,900 is an absolute steal.',
    color: 'from-purple-500 to-indigo-500',
  },
  {
    name: 'Kasun Jayawardena',
    role: 'CEO, FreshMart Supermarkets',
    avatar: 'KJ',
    rating: 5,
    text: 'Enterprise plan covers all 12 of our branches. The API integration with our ERP was smooth. Highly recommend for any serious retailer.',
    color: 'from-emerald-500 to-teal-500',
  },
];

// ─── Sub-components ────────────────────────────────────────────────────────────

function OmniPOSLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-14 w-14' };
  const iconSizes = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-7 w-7' };
  return (
    <div
      className={`flex items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/20 ${sizes[size]}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={iconSizes[size]}
        aria-hidden="true"
      >
        <rect x="3" y="3" width="18" height="11" rx="2" />
        <line x1="12" y1="14" x2="12" y2="17" />
        <rect x="6" y="17" width="12" height="2" rx="1" />
        <line x1="9" y1="19" x2="9" y2="22" />
        <line x1="12" y1="19" x2="12" y2="22" />
        <line x1="15" y1="19" x2="15" y2="22" />
        <line x1="7" y1="7" x2="17" y2="7" />
        <line x1="7" y1="10" x2="13" y2="10" />
      </svg>
    </div>
  );
}

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
      ))}
    </div>
  );
}

// ─── Registration Modal ────────────────────────────────────────────────────────

function RegistrationModal({
  onClose,
  defaultPlan,
}: {
  onClose: () => void;
  defaultPlan?: 'starter' | 'growth' | 'enterprise';
}) {
  const router = useRouter();
  const [step, setStep] = useState<RegistrationStep>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStorePassword, setShowStorePassword] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successData, setSuccessData] = useState<{ storeName: string; storeCode: string; loginUrl: string } | null>(null);

  const [form, setForm] = useState<RegistrationData>({
    businessName: '',
    storeCode: '',
    storeType: 'restaurant',
    storePassword: '',
    planTier: defaultPlan || 'growth',
    ownerName: '',
    ownerEmail: '',
    managerPin: '',
    address: '',
    phone: '',
  });

  const update = (field: keyof RegistrationData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSubmitError('');
  };

  // Auto-generate store code from business name
  useEffect(() => {
    if (form.businessName && step === 2) {
      const generated = form.businessName
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, '')
        .trim()
        .split(/\s+/)
        .slice(0, 3)
        .map((w: string) => w.slice(0, 4))
        .join('-');
      update('storeCode', generated);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.businessName, step]);

  const canProceedStep1 = form.planTier;
  const canProceedStep2 = form.businessName && form.storeType;
  const canProceedStep3 = form.ownerName && form.ownerEmail;
  const canProceedStep4 = form.storeCode.length >= 3 && form.storePassword.length >= 6 && /^\d{4}$/.test(form.managerPin);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const res = await fetch('/api/stores/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || 'Registration failed. Please try again.');
        setIsSubmitting(false);
        return;
      }

      setSuccessData({
        storeName: data.store.name,
        storeCode: data.store.code,
        loginUrl: data.loginUrl,
      });
    } catch {
      setSubmitError('Network error. Please check your connection and try again.');
      setIsSubmitting(false);
    }
  };

  const selectedPlan = PLANS.find((p) => p.id === form.planTier);

  // ── Success screen ──
  if (successData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 space-y-6 shadow-2xl text-center animate-in fade-in zoom-in duration-300">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <CheckCheck className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">You&apos;re Live! 🎉</h2>
            <p className="text-sm text-slate-500 dark:text-neutral-400">
              <span className="font-semibold text-slate-900 dark:text-white">{successData.storeName}</span> has been created
              on OmniPOS. Your manager account is ready.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 text-left space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 dark:text-neutral-400">Store Code</span>
              <span className="font-mono font-bold text-orange-500 dark:text-orange-400">{successData.storeCode}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 dark:text-neutral-400">Plan</span>
              <span className="font-semibold text-slate-900 dark:text-white capitalize">{form.planTier}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 dark:text-neutral-400">Status</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Trial Active</span>
            </div>
          </div>
          <button
            onClick={() => router.push(successData.loginUrl)}
            id="goto-store-btn"
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm shadow-lg shadow-orange-500/25 transition-all cursor-pointer"
          >
            <span>Open My Store Terminal</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  const stepLabels = ['Choose Plan', 'Business Info', 'Owner Details', 'Security Setup'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xl my-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <OmniPOSLogo size="sm" />
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">Create Your Store</h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400">Step {step} of 4 — {stepLabels[step - 1]}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-500 dark:text-neutral-400 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-slate-100 dark:bg-neutral-800">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">

          {/* ── Step 1: Choose Plan ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Select Your Plan</h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">All plans start with a free trial.</p>
              </div>
              <div className="space-y-3">
                {PLANS.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => update('planTier', plan.id)}
                    className={`w-full flex items-center justify-between rounded-2xl border p-4 transition-all text-left cursor-pointer ${
                      form.planTier === plan.id
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/5 shadow-md shadow-orange-500/10'
                        : 'border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          form.planTier === plan.id
                            ? 'border-orange-500 bg-orange-500'
                            : 'border-slate-300 dark:border-neutral-600'
                        }`}
                      >
                        {form.planTier === plan.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">{plan.name}</span>
                          {plan.badge && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-500/10 px-1.5 py-0.5 rounded-full border border-orange-200 dark:border-orange-500/20">
                              {plan.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">{plan.description}</p>
                      </div>
                    </div>
                    <span className="text-sm font-black text-slate-900 dark:text-white whitespace-nowrap pl-3">
                      Rs. {plan.price.toLocaleString()}<span className="text-xs font-normal text-slate-400 dark:text-neutral-500">/mo</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2: Business Info ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Business Details</h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">Tell us about your business.</p>
              </div>
              <div className="space-y-3">
                <Field label="Business / Store Name" required>
                  <input
                    id="reg-business-name"
                    type="text"
                    value={form.businessName}
                    onChange={(e) => update('businessName', e.target.value)}
                    placeholder="e.g. Spice Route Restaurant"
                    className={inputCls}
                    autoFocus
                  />
                </Field>
                <Field label="Business Type" required>
                  <div className="grid grid-cols-2 gap-2">
                    {(['restaurant', 'retail'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => update('storeType', t)}
                        className={`flex items-center gap-2 rounded-xl border p-3 transition-all cursor-pointer ${
                          form.storeType === t
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/5'
                            : 'border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700'
                        }`}
                      >
                        {t === 'restaurant' ? <ChefHat className="w-4 h-4 text-orange-500" /> : <Store className="w-4 h-4 text-orange-500" />}
                        <span className="text-sm font-semibold text-slate-900 dark:text-white capitalize">{t}</span>
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Address">
                  <input
                    id="reg-address"
                    type="text"
                    value={form.address}
                    onChange={(e) => update('address', e.target.value)}
                    placeholder="No. 12, Main Street, Colombo 03"
                    className={inputCls}
                  />
                </Field>
                <Field label="Phone">
                  <input
                    id="reg-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => update('phone', e.target.value)}
                    placeholder="+94 77 123 4567"
                    className={inputCls}
                  />
                </Field>
              </div>
            </div>
          )}

          {/* ── Step 3: Owner Details ── */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Owner Details</h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">This will be your account contact.</p>
              </div>
              <div className="space-y-3">
                <Field label="Full Name" required>
                  <input
                    id="reg-owner-name"
                    type="text"
                    value={form.ownerName}
                    onChange={(e) => update('ownerName', e.target.value)}
                    placeholder="e.g. Ruwan Perera"
                    className={inputCls}
                    autoFocus
                  />
                </Field>
                <Field label="Email Address" required>
                  <input
                    id="reg-owner-email"
                    type="email"
                    value={form.ownerEmail}
                    onChange={(e) => update('ownerEmail', e.target.value)}
                    placeholder="ruwan@yourstore.lk"
                    className={inputCls}
                  />
                </Field>
                <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs flex gap-2">
                  <Bell className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>This email will be your Store Manager login and the billing contact.</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 4: Security Setup ── */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Security Setup</h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">Secure your store terminal with a unique code and password.</p>
              </div>
              <div className="space-y-3">
                <Field label="Store Code" hint="3–16 characters, letters/numbers/hyphens" required>
                  <input
                    id="reg-store-code"
                    type="text"
                    value={form.storeCode}
                    onChange={(e) => update('storeCode', e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
                    placeholder="e.g. SPICE-ROUTE"
                    maxLength={16}
                    className={`${inputCls} font-mono uppercase tracking-widest`}
                    autoFocus
                  />
                </Field>
                <Field label="Store Connection Password" hint="Min. 6 characters — used to unlock terminals" required>
                  <div className="relative">
                    <input
                      id="reg-store-password"
                      type={showStorePassword ? 'text' : 'password'}
                      value={form.storePassword}
                      onChange={(e) => update('storePassword', e.target.value)}
                      placeholder="e.g. MyStore2026!"
                      className={`${inputCls} pr-12`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowStorePassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-neutral-500 hover:text-slate-700 dark:hover:text-neutral-300 transition-colors cursor-pointer"
                    >
                      {showStorePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </Field>
                <Field label="Manager PIN" hint="4-digit PIN for your store manager account" required>
                  <input
                    id="reg-manager-pin"
                    type="password"
                    value={form.managerPin}
                    onChange={(e) => update('managerPin', e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="••••"
                    maxLength={4}
                    className={`${inputCls} text-center tracking-widest font-mono text-xl`}
                  />
                </Field>

                {/* Summary card */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">Registration Summary</p>
                  {[
                    { label: 'Store', value: form.businessName },
                    { label: 'Plan', value: `${selectedPlan?.name} — Rs. ${(selectedPlan?.price || 0).toLocaleString()}/mo` },
                    { label: 'Owner', value: form.ownerEmail },
                    { label: 'Type', value: form.storeType },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-xs">
                      <span className="text-slate-500 dark:text-neutral-400">{label}</span>
                      <span className="font-semibold text-slate-900 dark:text-white capitalize">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {submitError && (
            <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3.5 py-2.5 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center gap-3 p-6 border-t border-slate-100 dark:border-neutral-800">
          {step > 1 && (
            <button
              onClick={() => setStep((s) => (s - 1) as RegistrationStep)}
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-neutral-800 text-sm font-semibold text-slate-600 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              Back
            </button>
          )}
          {step < 4 ? (
            <button
              onClick={() => setStep((s) => (s + 1) as RegistrationStep)}
              disabled={
                (step === 1 && !canProceedStep1) ||
                (step === 2 && !canProceedStep2) ||
                (step === 3 && !canProceedStep3)
              }
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm shadow-md shadow-orange-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <span>Continue</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canProceedStep4 || isSubmitting}
              id="create-store-submit-btn"
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm shadow-md shadow-orange-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating your store...</span>
                </>
              ) : (
                <span>Create My Store</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const inputCls =
  'w-full bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-colors';

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {hint && <span className="ml-1.5 font-normal text-slate-400 dark:text-neutral-500">— {hint}</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Contact Section Form ──────────────────────────────────────────────────────

function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', message: '', type: 'inquiry' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    await new Promise((r) => setTimeout(r, 1200)); // simulate
    setSent(true);
    setSending(false);
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Message Received!</h3>
          <p className="text-sm text-slate-500 dark:text-neutral-400 mt-1">We&apos;ll get back to you within 24 hours.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 mb-1.5">Full Name</label>
          <input
            id="contact-name"
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Your name"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 mb-1.5">Email</label>
          <input
            id="contact-email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="you@business.lk"
            className={inputCls}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 mb-1.5">Inquiry Type</label>
        <div className="flex flex-wrap gap-2">
          {['inquiry', 'demo', 'support', 'partnership'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setForm((f) => ({ ...f, type: t }))}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer capitalize ${
                form.type === t
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400'
                  : 'border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400 hover:border-slate-300 dark:hover:border-neutral-700'
              }`}
            >
              {t === 'inquiry' ? 'General Inquiry' : t === 'demo' ? 'Book a Demo' : t === 'support' ? 'Technical Support' : 'Partnership'}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 mb-1.5">Message</label>
        <textarea
          id="contact-message"
          required
          rows={4}
          value={form.message}
          onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          placeholder="Tell us about your business and how we can help..."
          className={`${inputCls} resize-none`}
        />
      </div>
      <button
        type="submit"
        disabled={sending}
        id="contact-send-btn"
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm shadow-lg shadow-orange-500/20 disabled:opacity-50 transition-all cursor-pointer"
      >
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        <span>{sending ? 'Sending...' : 'Send Message'}</span>
      </button>
    </form>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function OmniPOSLandingPage() {
  const { theme, toggleTheme } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [modalPlan, setModalPlan] = useState<'starter' | 'growth' | 'enterprise'>('growth');
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const openModal = (plan: 'starter' | 'growth' | 'enterprise' = 'growth') => {
    setModalPlan(plan);
    setShowModal(true);
  };

  const parallaxY = scrollY * 0.3;

  return (
    <>
      {/* ─── NAV ──────────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 border-b border-slate-200/60 dark:border-neutral-800/60 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <OmniPOSLogo size="sm" />
            <span className="text-base font-black text-slate-900 dark:text-white tracking-tight">OmniPOS</span>
            <span className="hidden sm:inline text-[10px] font-bold text-orange-500 dark:text-orange-400 bg-orange-100 dark:bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-200 dark:border-orange-500/20 uppercase tracking-wider">
              Sri Lanka
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600 dark:text-neutral-400">
            <a href="#features" className="hover:text-orange-500 dark:hover:text-orange-400 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-orange-500 dark:hover:text-orange-400 transition-colors">Pricing</a>
            <a href="#testimonials" className="hover:text-orange-500 dark:hover:text-orange-400 transition-colors">Reviews</a>
            <a href="#contact" className="hover:text-orange-500 dark:hover:text-orange-400 transition-colors">Contact</a>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Dark / Light Mode Toggle */}
            <button
              onClick={toggleTheme}
              id="landing-theme-toggle"
              aria-label="Toggle light or dark theme"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-100/80 dark:bg-neutral-900/80 text-slate-700 dark:text-neutral-300 hover:text-orange-500 dark:hover:text-orange-400 hover:border-orange-500/40 dark:hover:border-orange-500/40 transition-all cursor-pointer"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-400 transition-transform duration-200 hover:rotate-45" />
              ) : (
                <Moon className="h-4 w-4 text-indigo-600 transition-transform duration-200 hover:-rotate-12" />
              )}
            </button>

            <Link
              href="/store"
              id="nav-terminal-login"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-neutral-300 hover:text-orange-500 dark:hover:text-orange-400 border border-slate-200 dark:border-neutral-800 px-3 py-1.5 rounded-xl transition-colors bg-white/50 dark:bg-neutral-900/50"
            >
              <Store className="h-3.5 w-3.5 text-orange-500" />
              <span>Terminal Login</span>
            </Link>
            <Link
              href="/admin/login"
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Admin
            </Link>
            <button
              onClick={() => openModal('growth')}
              id="hero-cta-nav"
              className="flex items-center justify-center px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold shadow-md shadow-orange-500/20 transition-all cursor-pointer"
            >
              <span>Start Free</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="overflow-hidden">
        {/* ─── HERO ─────────────────────────────────────────────────────────────── */}
        <section
          ref={heroRef}
          className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 sm:px-6 py-24 bg-gradient-to-b from-slate-50 to-white dark:from-neutral-950 dark:to-neutral-900 overflow-hidden"
        >
          {/* Ambient blobs */}
          <div
            className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-orange-500/10 dark:bg-orange-500/5 blur-3xl pointer-events-none"
            style={{ transform: `translateY(${parallaxY}px)` }}
          />
          <div
            className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-amber-400/10 dark:bg-amber-400/5 blur-3xl pointer-events-none"
            style={{ transform: `translateY(${-parallaxY * 0.5}px)` }}
          />

          <div className="relative z-10 max-w-4xl mx-auto space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-100 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 text-orange-700 dark:text-orange-400 text-xs font-bold">
              <Zap className="h-3.5 w-3.5" />
              <span>Built for Sri Lankan Restaurants &amp; Retail Shops</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.05]">
              The POS System{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-500 via-amber-500 to-red-500">
                Your Business
              </span>{' '}
              Deserves
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 dark:text-neutral-400 max-w-2xl mx-auto leading-relaxed">
              Enterprise-grade point of sale, kitchen display, self-checkout kiosk, and analytics — in one platform.
              Starting at just <span className="font-bold text-slate-900 dark:text-white">Rs. 4,900/month</span>.
            </p>

            {/* CTA Group */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => openModal('growth')}
                id="hero-cta-main"
                className="group flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-base shadow-xl shadow-orange-500/30 transition-all hover:scale-105 cursor-pointer"
              >
                <span>Start Free Trial</span>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <Link
                href="/store"
                id="hero-cta-connect"
                className="flex items-center gap-2 px-8 py-4 rounded-2xl border-2 border-slate-200 dark:border-neutral-800 hover:border-orange-500/50 bg-white/80 dark:bg-neutral-900/60 text-slate-700 dark:text-neutral-300 font-bold text-base transition-all hover:scale-105"
              >
                <Store className="h-5 w-5 text-orange-500" />
                <span>Connect Store Terminal</span>
              </Link>
            </div>

            {/* Trust signals */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs text-slate-500 dark:text-neutral-500">
              {['No credit card required', 'Free 14-day trial', 'Cancel anytime', 'LKR pricing'].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  {t}
                </span>
              ))}
            </div>

            {/* Hero screenshot placeholder — live terminal card previews */}
            <div className="mt-8 grid grid-cols-3 gap-3 max-w-lg mx-auto">
              {[
                { label: 'POS', icon: CreditCard, color: 'from-amber-500 to-orange-500' },
                { label: 'KDS', icon: ChefHat, color: 'from-emerald-500 to-teal-500' },
                { label: 'Kiosk', icon: MonitorCheck, color: 'from-cyan-500 to-blue-500' },
              ].map(({ label, icon: Icon, color }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 flex flex-col items-center gap-2 shadow-lg shadow-slate-200/50 dark:shadow-neutral-900/50 hover:shadow-xl transition-shadow"
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr ${color} text-white shadow-md`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-700 dark:text-neutral-300">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── STATS BANNER ─────────────────────────────────────────────────────── */}
        <section className="py-12 bg-gradient-to-r from-orange-500 via-amber-500 to-red-500">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
            {[
              { value: '500+', label: 'Active Stores' },
              { value: '1M+', label: 'Transactions/month' },
              { value: '99.9%', label: 'Uptime SLA' },
              { value: 'Rs. 4,900', label: 'Starting Price/mo' },
            ].map(({ value, label }) => (
              <div key={label} className="space-y-1">
                <p className="text-3xl sm:text-4xl font-black">{value}</p>
                <p className="text-sm font-semibold text-white/80">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── FEATURES ─────────────────────────────────────────────────────────── */}
        <section id="features" className="py-24 px-4 sm:px-6 bg-white dark:bg-neutral-950">
          <div className="max-w-6xl mx-auto space-y-16">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-100 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 text-orange-700 dark:text-orange-400 text-xs font-bold">
                <Zap className="h-3.5 w-3.5" />
                Everything You Need
              </div>
              <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white">
                One Platform. Every Module.
              </h2>
              <p className="text-lg text-slate-500 dark:text-neutral-400 max-w-2xl mx-auto">
                From the cashier counter to the kitchen screen to the analytics dashboard — OmniPOS covers it all.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {FEATURES.map(({ icon: Icon, title, desc, color }) => (
                <div
                  key={title}
                  className="group rounded-2xl border border-slate-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 space-y-3 hover:border-orange-500/30 hover:shadow-xl dark:hover:shadow-orange-500/5 transition-all duration-300 cursor-default"
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr ${color} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
                  <p className="text-sm text-slate-500 dark:text-neutral-400 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── SECURITY HIGHLIGHT ───────────────────────────────────────────────── */}
        <section className="py-24 px-4 sm:px-6 bg-slate-50 dark:bg-neutral-900">
          <div className="max-w-5xl mx-auto">
            <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-neutral-800 dark:from-neutral-800 dark:to-neutral-900 border border-slate-700 dark:border-neutral-700 p-8 sm:p-12 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl" />
              <div className="relative z-10 grid lg:grid-cols-2 gap-10 items-center">
                <div className="space-y-6">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
                    <ShieldCheck className="h-7 w-7" />
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-3xl sm:text-4xl font-black text-white">
                      Bank-Grade Security<br />For Every Terminal
                    </h2>
                    <p className="text-neutral-400 leading-relaxed">
                      OmniPOS uses a two-layer authentication model — devices must supply both a <strong className="text-white">Store Code + Store Password</strong> to connect, then each staff member authenticates with their own <strong className="text-white">bcrypt-hashed PIN</strong>.
                    </p>
                  </div>
                  <button
                    onClick={() => openModal('growth')}
                    id="security-cta-btn"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span>Get Started Securely</span>
                  </button>
                </div>
                <div className="space-y-3">
                  {[
                    { icon: Lock, label: 'Store Password Gate', desc: 'Terminal connection requires store code + encrypted password' },
                    { icon: ShieldCheck, label: 'bcrypt PIN Hashing', desc: 'Staff PINs are never stored in plaintext — always bcrypt cost-10' },
                    { icon: TrendingUp, label: 'Role-Based Access Control', desc: 'Manager, Cashier, Chef, Kiosk — each with scoped permissions' },
                    { icon: Bell, label: 'Audit Session Trail', desc: 'All logins recorded with timestamps and terminal identification' },
                  ].map(({ icon: Icon, label, desc }) => (
                    <div key={label} className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{label}</p>
                        <p className="text-xs text-neutral-400 mt-0.5">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── PRICING ──────────────────────────────────────────────────────────── */}
        <section id="pricing" className="py-24 px-4 sm:px-6 bg-white dark:bg-neutral-950">
          <div className="max-w-5xl mx-auto space-y-16">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-100 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 text-orange-700 dark:text-orange-400 text-xs font-bold">
                <CreditCard className="h-3.5 w-3.5" />
                LKR Pricing — No FX Risk
              </div>
              <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white">
                Simple, Honest Pricing
              </h2>
              <p className="text-lg text-slate-500 dark:text-neutral-400 max-w-xl mx-auto">
                All plans include a free 14-day trial. No setup fees. Cancel anytime.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative rounded-3xl border p-6 sm:p-8 space-y-6 flex flex-col transition-all duration-300 ${
                    plan.highlight
                      ? 'border-orange-500 bg-gradient-to-b from-orange-50 to-amber-50 dark:from-orange-500/5 dark:to-amber-500/5 shadow-2xl shadow-orange-500/15 scale-[1.02]'
                      : 'border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:shadow-xl transition-shadow'
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-black shadow-lg shadow-orange-500/30">
                      {plan.badge}
                    </div>
                  )}
                  <div className="space-y-2">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">{plan.name}</h3>
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-black text-slate-900 dark:text-white">Rs. {plan.price.toLocaleString()}</span>
                      <span className="text-sm text-slate-500 dark:text-neutral-400 mb-1">/month</span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-neutral-400">{plan.description}</p>
                  </div>
                  <ul className="space-y-2.5 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-slate-700 dark:text-neutral-300">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => openModal(plan.id)}
                    id={`pricing-cta-${plan.id}`}
                    className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
                      plan.highlight
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/25'
                        : 'border-2 border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-300 hover:border-orange-500/50 hover:bg-slate-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <span>Start Free Trial</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── TESTIMONIALS ─────────────────────────────────────────────────────── */}
        <section id="testimonials" className="py-24 px-4 sm:px-6 bg-slate-50 dark:bg-neutral-900">
          <div className="max-w-5xl mx-auto space-y-16">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold">
                <Star className="h-3.5 w-3.5 fill-current" />
                Customer Reviews
              </div>
              <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white">
                Loved by Sri Lankan Businesses
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {TESTIMONIALS.map(({ name, role, avatar, rating, text, color }) => (
                <div
                  key={name}
                  className="rounded-3xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 space-y-4 hover:shadow-xl transition-shadow"
                >
                  <StarRating count={rating} />
                  <p className="text-sm text-slate-600 dark:text-neutral-400 leading-relaxed">&ldquo;{text}&rdquo;</p>
                  <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-neutral-800">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr ${color} text-white text-sm font-black`}>
                      {avatar}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{name}</p>
                      <p className="text-xs text-slate-500 dark:text-neutral-400">{role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CONTACT ──────────────────────────────────────────────────────────── */}
        <section id="contact" className="py-24 px-4 sm:px-6 bg-white dark:bg-neutral-950">
          <div className="max-w-5xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-start">
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-bold">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Get In Touch
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
                    We&apos;re Here to Help
                  </h2>
                  <p className="text-slate-500 dark:text-neutral-400 leading-relaxed">
                    Have questions about OmniPOS? Want a personalized demo for your business? Our Sri Lanka support team responds within 24 hours.
                  </p>
                </div>
                <div className="space-y-4">
                  {[
                    { icon: Mail, label: 'Email Support', value: 'support@omnipos.lk' },
                    { icon: Phone, label: 'WhatsApp / Phone', value: '+94 77 000 0000' },
                    { icon: Building2, label: 'Office', value: 'Colombo 03, Sri Lanka' },
                    { icon: Globe, label: 'Website', value: 'www.omnipos.lk' },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-500/10 text-orange-500 border border-orange-100 dark:border-orange-500/20">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">{label}</p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900 p-6 sm:p-8">
                <ContactForm />
              </div>
            </div>
          </div>
        </section>

        {/* ─── FINAL CTA ────────────────────────────────────────────────────────── */}
        <section className="py-24 px-4 sm:px-6 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-neutral-900 dark:to-neutral-950">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <OmniPOSLogo size="lg" />
            <div className="space-y-4">
              <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white">
                Ready to Transform Your Business?
              </h2>
              <p className="text-lg text-slate-500 dark:text-neutral-400">
                Join 500+ Sri Lankan businesses running on OmniPOS. Get started today — your first 14 days are free.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => openModal('growth')}
                id="footer-cta-btn"
                className="group flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-base shadow-xl shadow-orange-500/30 transition-all hover:scale-105 cursor-pointer"
              >
                <span>Create My Free Store</span>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <Link
                href="/admin/login"
                id="footer-admin-link"
                className="flex items-center gap-2 px-8 py-4 rounded-2xl border-2 border-slate-200 dark:border-neutral-800 hover:border-orange-500/40 text-slate-700 dark:text-neutral-300 font-bold text-base transition-all hover:scale-105"
              >
                <Lock className="h-5 w-5 text-rose-500" />
                Platform Admin Login
              </Link>
            </div>
          </div>
        </section>

        {/* ─── FOOTER ───────────────────────────────────────────────────────────── */}
        <footer className="bg-slate-900 dark:bg-neutral-950 border-t border-slate-800 dark:border-neutral-800 py-12 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <OmniPOSLogo size="sm" />
                <div>
                  <span className="text-base font-black text-white">OmniPOS</span>
                  <p className="text-xs text-neutral-500">Enterprise POS for Sri Lanka</p>
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-6 text-xs text-neutral-500">
                <a href="#features" className="hover:text-orange-400 transition-colors">Features</a>
                <a href="#pricing" className="hover:text-orange-400 transition-colors">Pricing</a>
                <a href="#contact" className="hover:text-orange-400 transition-colors">Contact</a>
                <Link href="/store" className="hover:text-orange-400 transition-colors">Terminal Login</Link>
                <Link href="/admin/login" className="hover:text-orange-400 transition-colors">Admin Login</Link>
              </div>
              <p className="text-xs text-neutral-600">© {new Date().getFullYear()} OmniPOS. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </main>

      {/* Registration Modal */}
      {showModal && (
        <RegistrationModal onClose={() => setShowModal(false)} defaultPlan={modalPlan} />
      )}
    </>
  );
}
