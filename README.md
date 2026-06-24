# Multi-Org Data Transfer System

A full-stack prototype demonstrating secure, multi-organization data management and transfer built with **Next.js 16**, **Neon Postgres**, **Drizzle ORM**, and **Resend**.

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Next.js 16 App                    │
│                                                     │
│  /login      → 2-step OTP authentication            │
│  /dashboard  → Paginated data table (CRUD)          │
│  /transfer   → Send data to recipient org           │
│  /inbox      → View received transfers              │
│                                                     │
│  API Routes (app/api/*)                             │
│  ├─ /auth/request-otp  → Generate & email OTP       │
│  ├─ /auth/verify-otp   → Validate OTP, set cookie   │
│  ├─ /auth/me           → Get current session        │
│  ├─ /auth/logout       → Clear session cookie       │
│  ├─ /rows              → GET (paginated) / POST      │
│  ├─ /rows/[id]         → DELETE                     │
│  ├─ /transfer          → POST (copy rows + notify)  │
│  └─ /inbox             → GET received transfers     │
└─────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────┐
│              Neon Postgres (Serverless)              │
│                                                     │
│  organizations  users  otp_codes                    │
│  data_rows  transfers                               │
└─────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────┐
│                   Resend (Email)                     │
│  • OTP delivery                                     │
│  • Transfer notification to recipient org           │
└─────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision | Rationale |
|---|---|
| **Neon + Drizzle ORM** | `neonConfig.fetchConnectionCache = true` reuses HTTP connections in serverless (Vercel), avoiding cold-start overhead |
| **`source_transfer_id` on `data_rows`** | Null = native row; set = received via transfer. This makes post-transfer data isolation trivial — each org's state is fully independent after a transfer |
| **HTTP-only JWT cookie** | Prevents XSS from stealing tokens; 7-day expiry with `sameSite: lax` |
| **OTP over password** | Demonstrates secure auth flow understanding; no password storage; time-limited codes prevent replay attacks |
| **Resend for email** | Reliable transactional email with minimal setup; email notification is non-fatal (transfer succeeds even if email fails) |
| **In-memory rate limiter** | Simple sliding window; swap `app/lib/rate-limit.ts` with Upstash Redis for multi-instance deployments |

---

## Setup

### 1. Clone & Install

```bash
git clone <your-repo>
cd <project>
npm install
```

### 2. Configure Environment Variables

Copy `.env.local` and fill in your values:

```bash
cp .env.local .env.local.backup  # already a template
```

| Variable | Description | Where to Get It |
|---|---|---|
| `DATABASE_URL` | Neon connection string | [console.neon.tech](https://console.neon.tech) → Connection Details |
| `RESEND_API_KEY` | Resend API key | [resend.com/api-keys](https://resend.com/api-keys) |
| `RESEND_FROM_EMAIL` | Verified sender email | Resend verified domain, or `onboarding@resend.dev` for sandbox |
| `ORG_A_EMAIL` | Email for Organization A's user | Must match what's seeded |
| `ORG_B_EMAIL` | Email for Organization B's user | Must match what's seeded |
| `JWT_SECRET` | 32+ char random secret | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

> **Note:** `ORG_A_EMAIL` and `ORG_B_EMAIL` are the email addresses that will receive OTPs. For testing, use real email addresses you have access to.

### 3. Push Database Schema

```bash
npm run db:push
```

This creates all 5 tables (`organizations`, `users`, `otp_codes`, `data_rows`, `transfers`) in your Neon database.

### 4. Seed the Database

```bash
npm run db:seed
```

This inserts:
- 2 organizations (Org A and Org B)
- 1 user per organization (using `ORG_A_EMAIL` and `ORG_B_EMAIL`)
- 500 realistic data rows for Organization A (name, department, status)

The seed is **idempotent** — safe to run multiple times.

### 5. Run the Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) → redirects to `/login`.

---

## Usage Flow

### Organization A Login
1. Go to `/login`, enter `ORG_A_EMAIL`
2. Check inbox for the 6-digit OTP
3. Enter the code → lands on **Dashboard** with 500 rows

### Transfer Data
1. Navigate to **Transfer**
2. Optionally add a message
3. Click **Transfer Data →**
4. Org B receives an email notification

### Organization B Login
1. Open a separate browser / incognito window
2. Go to `/login`, enter `ORG_B_EMAIL`
3. Verify OTP → lands on **Dashboard** (now shows the 500 transferred rows)
4. **Inbox** shows the transfer with sender and message

---

## Security Features

- ✅ HTTP-only JWT session cookies
- ✅ OTP codes: 6-digit, 10-minute expiry, single-use
- ✅ Rate limiting: 3 OTP requests / 15 min; 5 transfers / hour
- ✅ Security headers on every response (CSP, X-Frame-Options, etc.)
- ✅ Zod input validation on all API routes
- ✅ Row-ownership check before delete (prevents cross-org deletion)
- ✅ Parameterized queries via Drizzle (no raw SQL, no injection risk)
- ✅ Environment variables for all secrets

---

## Deployment (Vercel)

1. Push to GitHub
2. Import project on [vercel.com](https://vercel.com)
3. Add all environment variables in the Vercel dashboard
4. Deploy — Vercel auto-detects Next.js

Run `npm run db:seed` once after deploying to populate the production database.
