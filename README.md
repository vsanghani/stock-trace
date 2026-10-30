# Plutox

Plutox is a real-time stock research and analysis dashboard. It provides live price data, company insights, sentiment analysis, and a suite of experimental tools including correlation heatmaps, portfolio stress testing, P&L tracking, and whisper alerts.

A public marketing page sits at `/`, where anyone can search a ticker. The research app itself lives behind authentication at `/dashboard` — a visitor who searches from the landing page is sent through sign-in and then dropped straight onto the stock they asked for.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) |
| **Language** | TypeScript 5 |
| **Auth** | [Clerk](https://clerk.com/) (`@clerk/nextjs`) |
| **UI** | React 19, Lucide React icons |
| **Styling** | Tailwind CSS 4, `@tailwindcss/typography` |
| **Animations** | Framer Motion |
| **Data** | [yahoo-finance2](https://github.com/gadicc/node-yahoo-finance2) |
| **Blog/Content** | MDX via `next-mdx-remote`, `gray-matter` |
| **Theming** | `next-themes` (dark / light mode) |
| **Utilities** | `clsx`, `tailwind-merge`, `date-fns` |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** (comes with Node)

### Install Dependencies

```bash
npm install
```

### Configure Environment

Create a `.env.local` file in the project root and add the variables listed in
[Environment Variables](#environment-variables) below. Only the two Clerk keys are required — create
a free application at [dashboard.clerk.com](https://dashboard.clerk.com) and copy its publishable and
secret keys. Everything else is optional; price and fundamentals data comes from Yahoo Finance and
needs no key. US holder filings stay empty until `DATABASE_URL` is set and the
[holders setup](#us-holders-sec-edgar) has been run.

`.env.local` is gitignored and must never be committed.

### Run the Development Server

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

### Lint & Typecheck

```bash
npm run lint
npm run typecheck
```

---

## Environment Variables

This table is the single source of truth for configuration. There is no `.env.example` in the repo —
by design, so that no file resembling an env file is ever tracked by git.

Set these in `.env.local` for local development, and as environment variables in your hosting
provider for production. **Never commit real values to this file or any other tracked file.**

### Required

| Variable | Scope | Description |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Client | Clerk publishable key from the Clerk dashboard. Safe to expose to the browser. Use the development key locally and the production key on Vercel. |
| `CLERK_SECRET_KEY` | **Server — secret** | Clerk secret key from the Clerk dashboard. Grants full access to your Clerk instance; treat it like a password and never expose it to the client. |

### Auth routing

These match the routes implemented in this app. Change them only if you move the pages.

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | `/dashboard` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | `/dashboard` |

### Optional

| Variable | Scope | Description |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Client | Public base URL used for metadata, canonical URLs and the OpenRouter referer header. Defaults to `http://localhost:3000`. Set to your real domain in production. |
| `OPENROUTER_API_KEY` | **Server — secret** | Enables AI news-sentiment scoring (senLogic) and forecast assumptions via [OpenRouter](https://openrouter.ai/keys). |
| `ALPHA_VANTAGE_API_KEY` | **Server — secret** | News headlines feeding sentiment analysis. [Get a key](https://www.alphavantage.co/support/#api-key). |
| `FMP_API_KEY` | **Server — secret** | Supplementary fundamentals for the DCF model. [Financial Modeling Prep](https://site.financialmodelingprep.com/developer/docs). |
| `DATABASE_URL` | **Server — secret** | Postgres connection string (Neon, Postgres 17) for US holder filings. When it is unset, `/api/holders/[ticker]` and the holders panel show an empty state instead of failing. |
| `SEC_USER_AGENT` | **Server — secret** | User-Agent sent to SEC EDGAR. Fair access requires the application name and a contact email, for example `Plutox research you@example.com`. Required to run ingestion. Not used by the web app at request time. |

Variables prefixed `NEXT_PUBLIC_` are inlined into the client bundle and are visible to anyone using
the site. Never give a secret that prefix. Without `OPENROUTER_API_KEY` and `ALPHA_VANTAGE_API_KEY`,
sentiment analysis and forecast assumptions fall back to sample data rather than failing.

---

## Routes & Access Control

Access is enforced in `src/proxy.ts` (Next.js 16 renames the middleware file from `middleware.ts` to
`proxy.ts`). Any route not listed as public requires a session.

| Route | Access | Purpose |
|---|---|---|
| `/` | Public | Marketing landing page with ticker search |
| `/blog`, `/blog/[slug]` | Public | MDX articles |
| `/sign-in`, `/sign-up` | Public | Clerk auth flows |
| `/api/search` | Public | Ticker autocomplete for the landing page (symbol names only) |
| `/dashboard` | **Protected** | Stock research dashboard (`/dashboard?ticker=AAPL`) |
| `/valuation`, `/options`, `/pnl-calculator` | **Protected** | Analysis tools |
| `/senlogic`, `/correlation`, `/stress-test`, `/whisper-alerts` | **Protected** | Experiments |
| `/api/stock`, `/api/options`, `/api/valuation/*`, `/api/sentiment/*` | **Protected** | Market data (returns `401` JSON when unauthenticated) |
| `/api/holders/[ticker]` | **Protected** | Major US holders from SEC EDGAR (`13F`, `13D`/`13G`, Form 4). Returns an empty payload when `DATABASE_URL` is unset. |

Protected pages redirect unauthenticated visitors to `/sign-in` with the original destination
preserved in `redirect_url`, so users land where they intended after signing in.

---

## US holders (SEC EDGAR)

The stock page (`/dashboard?ticker=AAPL`) shows a holders panel beside the company profile. Holdings come only from SEC EDGAR: the CIK map in `company_tickers.json`, the quarterly Form 13F data sets, Schedule 13D/13G XML (filings from 18 December 2024 onward), and Form 4 XML. Yahoo Finance and paid market-data APIs are not used for this panel.

13F positions are long US-listed equity only. A 13D, 13G, or Form 4 position for the same filer replaces an older 13F position. CUSIPs are checked against the official Section 13(f) securities list, stored for joins, and never returned by the API or shown in the UI. FIGI, when a filing includes one, is stored the same way. CUSIP numbers are licensed by the American Bankers Association through CUSIP Global Services; do not export or republish them. Confirm that internal storage is acceptable before production use.

Postgres keeps the latest eight quarter-ends. Older filings are skipped on ingest and deleted as the window moves. Archiving that older history to Parquet is a follow-up and is not implemented.

### Database

Migrations are plain SQL in `db/migrations` and run on Postgres 17 (Neon). Apply them with `DATABASE_URL` set:

```bash
npm run db:migrate
```

The runner records applied files in `schema_migrations` and is safe to repeat. It creates `security`, `filer`, `filing`, `holding_13f`, `ownership_5pct`, `insider_txn`, an empty `company_relationship` table (for a later suppliers and customers pass; every row will need a `confidence` score), and the `current_holders` materialized view.

### Ingestion

Set `DATABASE_URL` and `SEC_USER_AGENT` in `.env.local`. The client stays at or below 8 requests per second, under the SEC fair-access limit of 10.

```bash
npm run ingest:cik          # ticker and CIK map
npm run ingest:13f          # latest retained 13F quarters, then prune and refresh
npm run ingest:ownership    # previous weekday of 13D/13G XML
npm run ingest:form4        # previous weekday of Form 4 XML
npm run ingest:daily        # CIK map, 13D/13G, and Form 4
npm run ingest              # full backfill: CIK, 13F, then the previous weekday of 13D/13G and Form 4
```

Pass `--date YYYY-MM-DD` to `ingest:ownership`, `ingest:form4`, or `ingest:daily` to load one filing day. `unzip` is not required; the 13F job reads the SEC ZIPs itself.

GitHub Actions workflows, which only reference secrets and do not set them:

| Workflow | Schedule | Secrets |
|---|---|---|
| `.github/workflows/ingest-ownership-daily.yml` | Daily at 11:30 UTC | `DATABASE_URL`, `SEC_USER_AGENT` |
| `.github/workflows/ingest-13f-quarterly.yml` | Day 45 after each quarter-end, plus a catch-up a week later (14/21 Feb, 15/22 May, 14/21 Aug, 14/21 Nov) | `DATABASE_URL`, `SEC_USER_AGENT` |

Both workflows run migrations before ingesting. The quarterly dates follow the 45-day Form 13F deadline. The second date is there in case the data-set ZIP is not published on the deadline itself.

## Deployment (Vercel)

1. Push the repository to GitHub, then import it at [vercel.com/new](https://vercel.com/new). Next.js
   is detected automatically — no `vercel.json` needed.
2. In the Clerk dashboard, create a **production instance** for your domain and complete the DNS
   records it asks for. Production uses a separate key pair from development.
3. Add every variable from [Environment Variables](#environment-variables) in
   **Vercel → Settings → Environment Variables**, using your production Clerk keys
   and setting `NEXT_PUBLIC_SITE_URL` to your real domain. For the holders panel,
   also set `DATABASE_URL` and `SEC_USER_AGENT` as server variables. Paste secrets
   directly into Vercel — do not put them in a file in the repo. The holders panel
   stays empty until the database has been migrated and ingestion has run.
4. Deploy. Confirm that `/` loads for signed-out visitors and that `/dashboard` redirects to sign-in.

---

## File Structure

```
plutox/
├── public/                          # Static assets (SVGs, icons)
├── src/
│   ├── proxy.ts                     # Clerk auth + route protection (Next 16 middleware)
│   ├── app/                         # Next.js App Router (pages & API)
│   │   ├── layout.tsx               # Root layout
│   │   ├── page.tsx                 # Public marketing landing page
│   │   ├── globals.css              # Global styles
│   │   ├── dashboard/page.tsx       # Stock research app (protected)
│   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   ├── sign-up/[[...sign-up]]/page.tsx
│   │   ├── api/
│   │   │   ├── search/route.ts      # Stock search API endpoint
│   │   │   ├── stock/route.ts       # Stock data API endpoint
│   │   │   └── sentiment/
│   │   │       └── [ticker]/route.ts  # Sentiment analysis API
│   │   ├── blog/
│   │   │   ├── page.tsx             # Blog listing page
│   │   │   └── [slug]/page.tsx      # Individual blog post
│   │   ├── correlation/page.tsx     # Correlation heatmap tool
│   │   ├── pnl-calculator/page.tsx  # P&L calculator page
│   │   ├── senlogic/page.tsx        # SenLogic sentiment tool
│   │   ├── stress-test/page.tsx     # Portfolio stress test
│   │   └── whisper-alerts/page.tsx  # Whisper alerts page
│   │
│   ├── components/                  # Reusable UI components
│   │   ├── navbar.tsx               # Top navigation bar (auth-aware)
│   │   ├── clerk-provider-themed.tsx # Clerk provider wired to the app's dark/light theme
│   │   ├── landing/
│   │   │   └── landing-search.tsx   # Landing search that routes guests via sign-in
│   │   ├── stock-search.tsx         # Stock search input
│   │   ├── stock-dashboard.tsx      # Main stock dashboard
│   │   ├── company-info.tsx         # Company info panel
│   │   ├── market-clock.tsx         # Live market clock
│   │   ├── grid-background.tsx      # Grid background effect
│   │   ├── SentimentBadge.tsx       # Sentiment indicator badge
│   │   ├── theme-provider.tsx       # Theme context provider
│   │   ├── theme-toggle.tsx         # Dark/light mode toggle
│   │   ├── blog/                    # Blog components
│   │   │   ├── BlogCard.tsx
│   │   │   ├── BlogList.tsx
│   │   │   ├── SearchInput.tsx
│   │   │   └── TagFilter.tsx
│   │   ├── correlation/            # Correlation tool components
│   │   │   ├── CorrelationHeatmap.tsx
│   │   │   ├── HeatmapGrid.tsx
│   │   │   ├── RiskInsights.tsx
│   │   │   └── useCorrelationStore.ts
│   │   ├── pnl/                    # P&L tracker components
│   │   │   ├── CalendarView.tsx
│   │   │   ├── DayDetails.tsx
│   │   │   ├── TradeForm.tsx
│   │   │   └── usePnLStore.ts
│   │   ├── stress-test/            # Stress test components
│   │   │   ├── ImpactVisualization.tsx
│   │   │   ├── RiskAlert.tsx
│   │   │   ├── ScenarioSelector.tsx
│   │   │   ├── StressTestContainer.tsx
│   │   │   └── useHoldingsStore.ts
│   │   └── whisper/                # Whisper alerts components
│   │       ├── WhisperAlertCreator.tsx
│   │       ├── WhisperContainer.tsx
│   │       ├── WhisperNotification.tsx
│   │       └── useWhisperStore.ts
│   │
│   ├── content/posts/              # Blog content (MDX)
│   │   ├── aapl-earnings.mdx
│   │   ├── ai-web-dev.mdx
│   │   └── getting-started-nextjs.mdx
│   │
│   └── lib/                        # Shared utilities & logic
│       ├── utils.ts                # General utility functions
│       ├── blog.ts                 # Blog data helpers
│       ├── correlation-calculator.ts
│       ├── stress-calculator.ts
│       ├── stress-scenarios.ts
│       ├── whisper-evaluator.ts
│       └── whisper-templates.ts
│
├── next.config.ts                  # Next.js configuration
├── tsconfig.json                   # TypeScript configuration
├── eslint.config.mjs               # ESLint configuration
├── postcss.config.mjs              # PostCSS configuration
├── package.json                    # Dependencies & scripts
└── package-lock.json               # Dependency lock file
```

---

## Key Features

- **Landing Page & Auth** — Public page explaining the product, with a ticker search that carries the
  visitor through sign-up and onto their requested stock.
- **Stock Search & Dashboard** — Look up any ticker for real-time price data, company info, and market stats.
- **Sentiment Analysis (SenLogic)** — AI-driven sentiment scoring for any stock.
- **Correlation Heatmap** — Visualise how different assets move relative to each other.
- **Portfolio Stress Test** — Simulate market scenarios against your holdings.
- **P&L Calculator** — Track daily trades with a calendar-based P&L view.
- **Whisper Alerts** — Set custom price/condition alerts with notifications.
- **Blog** — Articles and insights powered by MDX.

---

## Disclaimer

Plutox is a research tool and does not provide financial advice. Market data is supplied as-is and may
be delayed or incomplete.
