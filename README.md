# OmniPOS: Enterprise Multi-Store POS & Kiosk Platform

**OmniPOS** is an enterprise-grade, multi-store, role-based Point of Sale (POS) and Self-Checkout Kiosk system built for retail stores and restaurants. It is engineered with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **MongoDB (Mongoose)** with strict multi-tenant data isolation.

---

## Architecture Overview

```
+---------------------------------------------------------------------------------------+
|                                    OmniPOS Frontend                                   |
|                        (Next.js App Router + TypeScript + Tailwind)                   |
+---------------------------------------------------------------------------------------+
       |                                |                                   |
       v                                v                                   v
+-------------------+       +-----------------------+           +-----------------------+
| 1. SaaS Platform  |       | 2. Shop Owner/Manager |           | 3. Staff Workspaces   |
| Owner Hub (/admin)|       | Command (/manager)    |           | Isolated Terminals    |
| - Tenant Accounts |       | - Staff PIN Mgmt      |           | - Cashier POS (/pos)  |
| - Billing & MRR   |       | - Branch Locations    |           | - Kitchen KDS (/kds)  |
| - Subscription Tier|      | - Z-Reports & Stock   |           | - Self-Kiosk (/kiosk) |
+-------------------+       +-----------------------+           +-----------------------+
                                        |
                                        v
+---------------------------------------------------------------------------------------+
|                                 Clean Header HUD                                      |
|            [Brand Logo] [Store Branch] [User Role] [Sound FX] [Clock] [Lock]          |
|                 (All top navigation tabs completely stripped)                         |
+---------------------------------------------------------------------------------------+
                                        |
                                        v
+---------------------------------------------------------------------------------------+
|                                   Next.js REST APIs                                   |
|    /api/stores | /api/products | /api/products/barcode | /api/orders | /api/users     |
|                         (Strict storeId Tenant Scoping)                               |
+---------------------------------------------------------------------------------------+
                                        |
                                        v
+---------------------------------------------------------------------------------------+
|                              MongoDB / Mongoose ODM Layer                             |
|          Collections: stores | users | products | orders (with storeId indexes)       |
+---------------------------------------------------------------------------------------+
```

---

## 1. Multi-Tenant Database Schema & Isolation

All records across products, orders, inventory, and users are strictly partitioned by an indexed `storeId` foreign key.

### Core Models (`/src/models`)
- **`Store` ([`Store.ts`](src/models/Store.ts))**:
  - `code` (Unique branch code, e.g. `DT-BISTRO`, `OMNI-TECH`)
  - `name`, `type` (`'restaurant'` | `'retail'`)
  - `taxRate`, `currency`, `currencySymbol`
  - `ownerName`, `ownerEmail`, `planTier` (`'starter'` | `'growth'` | `'enterprise'`), `subscriptionStatus` (`'active'` | `'trial'` | `'past_due'`), `monthlyFee`
- **`User` ([`User.ts`](src/models/User.ts))**:
  - `name`, `email`, `pinCode` (4-digit terminal access)
  - `role` (`'SUPER_ADMIN'` | `'STORE_MANAGER'` | `'CASHIER'` | `'KITCHEN'` | `'KIOSK'`)
  - `storeId` (null for Super Admin, scoped for store staff)
- **`Product` ([`Product.ts`](src/models/Product.ts))**:
  - `storeId` (Indexed foreign key)
  - `name`, `category`, `price`, `costPrice`, `sku`, `barcode` (Indexed)
  - `stockQuantity`, `lowStockThreshold`
  - `kitchenCategory` (`'GRILL'` | `'BAR'` | `'BAKERY'` | `'DELI'` | `'RETAIL'`)
- **`Order` ([`Order.ts`](src/models/Order.ts))**:
  - `storeId` (Indexed foreign key), `orderNumber`
  - `orderType` (`'DINE_IN'` | `'TAKEAWAY'` | `'RETAIL_SALE'` | `'KIOSK_SELF'`)
  - `items` array with quantity, prices, modifiers, and kitchen prep statuses
  - `subtotal`, `discount`, `tax`, `total`
  - `paymentMethod` (`'CASH'` | `'CARD'` | `'KIOSK_DIGITAL'`), `paymentStatus`
  - `orderStatus` (`'PENDING'` | `'PREPARING'` | `'READY'` | `'COMPLETED'`)

---

## 2. 3-Tier Enterprise Role Hierarchy & Access Control

| Tier | Role | Default Route | Allowed Views | Access Control & Boundaries |
|---|---|---|---|---|
| **Tier 1** | `SUPER_ADMIN` | `/admin` | SaaS Platform Owner Hub | Governs shop owners, subscription billing, MRR, and platform metrics. No operational cashier or kitchen interference. |
| **Tier 2** | `STORE_MANAGER` | `/manager` | Manager Portal, POS, KDS (if restaurant) | Provisions store branches, assigns staff roles and 4-digit PINs, tracks inventory, and reviews daily Z-reports. |
| **Tier 3** | `CASHIER` | `/pos` | POS Terminal only | High-speed sales register, barcode scanner wedge, cart discounts, change calculator, receipt printing. |
| **Tier 3** | `KITCHEN` | `/kds` | Kitchen KDS only | Live 3-column Kanban display with elapsed timers and audio alerts for food orders. |
| **Tier 3** | `KIOSK` | `/kiosk` | Kiosk Mode only | Touch-first self-checkout with menu customization, table numbers, and contactless pay simulation. |

---

## 3. Strict Store Type Workflows (Retail vs. Restaurant)

### Restaurant Outlets (e.g., Downtown Bistro & Bar)
- **POS Cart**: Restricted strictly to **🍽️ Dine-In** and **🥡 Takeaway** order modes with table number and guest name tracking. Retail-only modes are hidden.
- **KDS Kitchen Sync**: Food items route automatically to the live Kitchen Display System with preparation timers (<5m green, 5-15m amber, >15m red).
- **Navigation**: KDS tab is enabled for kitchen staff and managers.

### Retail Shops (e.g., OmniMart Tech & Express)
- **POS Cart**: Locked strictly to **Retail Checkout Terminal** mode with active hardware barcode scanner wedge integration. Restaurant dining options and table inputs are hidden.
- **Navigation**: Kitchen KDS is completely stripped from the user interface.

---

## 4. Clean Dashboard Header & Direct Workspace Routing

- **Header HUD (`src/components/Header.tsx`)**: All top navigation menu links (POS, Kiosk, KDS, Manager, Admin) have been removed. The header strictly displays:
  - Brand Logo (`OmniPOS` with restaurant/retail badge)
  - Active Store Branch selector / badge
  - User Profile & Role badge
  - Sound FX Mute/Unmute toggle (Web Audio API synthesizers)
  - Live local clock
  - Lock / Sign Out button (returns user to `/`)
- **Direct Workspace Routing (`src/app/page.tsx`)**: Upon entering a 4-digit PIN or tapping a staff profile card, users are instantly routed directly to their designated workspace without intermediary menus.

---

## 5. REST API Reference

| Method | Endpoint | Description | Scoping / Tenant Key |
|---|---|---|---|
| `GET` | `/api/stores` | List active business branches | Global |
| `POST` | `/api/stores` | Provision new branch location | Shop Owner / Manager |
| `PATCH`| `/api/stores` | Update subscription status or store info | Super Admin |
| `GET` | `/api/products?storeId=...` | List products with search, category & stock filters | `storeId` |
| `POST` | `/api/products` | Create product with unique barcode per store | `storeId` |
| `PATCH`| `/api/products/[id]` | Real-time stock adjustment (+/- delta) | `id` |
| `GET` | `/api/products/barcode/[code]?storeId=...`| Instant hardware barcode lookup | `barcode` + `storeId` |
| `GET` | `/api/orders?storeId=...` | Query store orders and active KDS tickets | `storeId` |
| `POST` | `/api/orders` | Create order, assign order number, deduct inventory | `storeId` |
| `PATCH`| `/api/orders/[id]` | Advance kitchen ticket status (`PREPARING`, `READY`, `COMPLETED`) | `id` |
| `GET` | `/api/analytics` | Global SaaS MRR, tenant accounts, and GMV | Super Admin (`storeId=ALL`) |
| `GET` | `/api/analytics?storeId=...` | Branch Daily Z-Report, tax, and tender breakdown | Store Manager (`storeId`) |
| `POST` | `/api/users` | PIN authentication OR staff creation with PIN code | `storeId` |
| `POST` | `/api/seed?force=true` | Seed demo stores, products, barcodes, and orders | Admin |

---

## 6. Development & Verification

### Running the Server
```bash
npm run dev
```
Server runs on `http://localhost:3000`.

### Building for Production
```bash
npm run build
```
Builds with Next.js Turbopack, verifying TypeScript types across all static and dynamic routes.

### Authentication Architecture & Credentials

#### 1. SaaS Platform Owner (Decoupled Platform Gateway)
* **Access Route**: `/admin/login` (Dedicated Email + Password authentication, completely segregated from store terminals)
* **Security**: Password hashed with **bcrypt (cost factor: 10)**. Authenticated via signed JWT issued into an **`httpOnly`, `sameSite=strict`** cookie (`omnipos_token`).
* **Demo Platform Owner**:
  - **Email**: `admin@omnipos.io`
  - **Password**: `OmniAdmin2026!`
  - **Destination**: `/admin` (Tenant Onboarding, Subscription Management, Global MRR/GMV)

#### 2. Multi-Tenant Store Identification & Branch-Scoped PIN Terminals
* **Store Lookup Gate**: `/` (Search-only store code entry screen — zero public store directories or competitor client lists exposed)
* **Store PIN Terminal**: `/store/[storeCode]` (e.g. `/store/dt-bistro`, `/store/omni-tech`)
  - Validates `storeCode` against the database; invalid codes render a clean error state without crashing.
  - "Switch Store" link returns to `/` without requiring full authentication resets.
  - "Lock / Sign Out" from operational workspaces (`/pos`, `/manager`, `/kds`, `/kiosk`) returns strictly to that branch's terminal (`/store/[storeCode]`).
* **Security & Isolation**: All staff PINs stored as **bcrypt (cost factor: 10)** hashes in MongoDB. PIN terminals display and authenticate **strictly** against that store's staff list. Authenticated sessions verified server-side via `/api/auth/me`.
* **Demo Store Branch Codes & Staff PINs**:
  - **Downtown Bistro**: Code `DT-BISTRO` ➔ Terminal at `/store/dt-bistro`
    - Bistro Manager: `1111` (Marcus Brody) ➔ `/manager`
    - Bistro Cashier: `1234` (James Wilson) ➔ `/pos`
    - Head Chef: `9999` (Chef Gordon) ➔ `/kds`
    - Self-Checkout Kiosk: `4321` (Kiosk Station 01) ➔ `/kiosk`
  - **OmniMart Tech Retail**: Code `OMNI-TECH` ➔ Terminal at `/store/omni-tech`
    - Retail Manager: `2222` (Sarah Chen) ➔ `/manager`
    - Retail Cashier: `5678` (Maya Patel) ➔ `/pos`
    - Express Pay Kiosk: `8765` (Kiosk Station 02) ➔ `/kiosk`
  - **Uptown Bakery**: Code `UP-BAKERY` ➔ Terminal at `/store/up-bakery`

---

## ⚠️ Pre-Production Upgrade Checklist

The following items are intentionally left as in-process / single-instance solutions for this development build. They **must** be upgraded before any production or multi-instance deployment.

### 1. Rate Limiting — Upgrade to Redis-backed Store Before Production

**File:** `src/lib/rateLimit.ts`

The current rate limiter for `POST /api/admin/stores` (tenant onboarding) and the terminal unpair PIN attempt lockout (`POST /api/terminal/unpair`) uses an **in-memory `Map`** on the Node.js process.

**Why this is a problem in production:**

- The in-memory counter **resets to zero on every server restart** (e.g. after a deploy, a crash, or a cold boot).
- In **serverless / edge deployments** (Vercel, AWS Lambda, Cloudflare Workers), each function invocation may run in a separate Lambda instance with its own isolated memory — meaning the rate limit counters are never shared across instances and an attacker can trivially bypass them by hitting different instances in parallel.

**Required fix before production deploy:**

Replace the in-memory `Map` in `src/lib/rateLimit.ts` with a Redis-backed store (e.g. [Upstash Redis](https://upstash.com/) for Vercel serverless, or `ioredis` for a dedicated server). The `checkRateLimit(key, limit, windowMs)` function signature can remain unchanged — only the underlying storage needs to swap from `Map` to atomic Redis `INCR` + `EXPIRE` commands.

```ts
// TODO(pre-prod): Replace Map-based checkRateLimit() with Redis INCR/EXPIRE
// Relevant library: @upstash/ratelimit (Vercel-compatible, per-edge-instance safe)
// Affects: POST /api/admin/stores, POST /api/terminal/unpair (unpair PIN lockout)
```

### 2. Session Storage — httpOnly Cookies (Already Implemented ✅)

JWT tokens are stored as `httpOnly; SameSite=strict` cookies. No `localStorage` session exposure.

### 3. MongoDB Transactions — Replica Set Required (Already Configured ✅)

Multi-document ACID transactions require a MongoDB replica set (`rs0`). This is configured for the development container. In production, use MongoDB Atlas (replica sets enabled by default) or a self-hosted replica set — a standalone `mongod` will reject `session.withTransaction()` calls.

