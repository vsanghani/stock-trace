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

Copy `.env.example` to `.env.local` and fill in the variables listed in
[Environment Variables](#environment-variables) below. The dev server boots without them: public
pages load, and protected routes return 503 until Clerk is configured. For real sign-in, create a
free application at [dashboard.clerk.com](https://dashboard.clerk.com) and copy its publishable and
secret keys. Price and fundamentals data comes from Yahoo Finance and needs no key.

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

Names and one-line descriptions also live in `.env.example`. That file has empty secrets and is safe
to commit; `.env.local` is gitignored and must never be committed.

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
| `DATABASE_URL` | **Server — secret** | Postgres connection string. |
| `SEC_USER_AGENT` | Server | User-Agent for SEC EDGAR requests, including a contact email. |
| `SENTRY_DSN` | **Server — secret** | [Sentry](https://sentry.io) DSN for server and edge errors. Free tier. Unset disables Sentry. |
| `NEXT_PUBLIC_SENTRY_DSN` | Client | Sentry DSN for browser errors. Unset disables client reporting. |
| `SENTRY_AUTH_TOKEN` | **Server — secret** | Build-time token for source map upload. Unset skips the upload. |
| `SENTRY_ORG` | Server | Sentry organization slug. Required with `SENTRY_PROJECT` before maps are uploaded. |
| `SENTRY_PROJECT` | Server | Sentry project slug. Required with `SENTRY_ORG` before maps are uploaded. |
| `UPSTASH_REDIS_REST_URL` | **Server — secret** | Upstash Redis REST URL for shared API rate limits. Free tier. Unset uses an in-memory window. |
| `UPSTASH_REDIS_REST_TOKEN` | **Server — secret** | Upstash Redis REST token. Both this and the URL are required. |

Variables prefixed `NEXT_PUBLIC_` are inlined into the client bundle and are visible to anyone using
the site. Never give a secret that prefix. Without `OPENROUTER_API_KEY` and `ALPHA_VANTAGE_API_KEY`,
sentiment analysis and forecast assumptions fall back to sample data rather than failing. Sentry and
Upstash are no-ops until their variables are set. A bad optional value is logged once and ignored;
the process keeps running. `src/lib/env.ts` is the typed list.

---

## Continuous integration

`.github/workflows/ci.yml` runs on pull requests into `development` and `feature/**`:

1. `npm ci`
2. `npm run typecheck`
3. ESLint on the files changed in the pull request (the tree still has older lint failures)
4. `npm test`
5. `npm run build` with dummy environment values so startup validation runs

A separate **Preview smoke** job listens for `deployment_status`. GitHub runs that workflow
from the deployed ref's workflow file, including a pull request branch, not only from the default
branch. The job runs for a non-production deployment. It smokes the preview when an open pull
request into `development` or `feature/**` has that deployment's commit as `head.sha` (or the same
branch name in `deployment.ref` and a matching head SHA). If the branch matches a pull request but
the commit does not, the job fails. Anything else — no open pull request, a plain branch deploy, or
a SHA with no matching pull request — logs a notice and exits 0. The requests are `/` and
`/api/health`. Any 5xx fails the job. The request sends `x-vercel-protection-bypass` from the
repository secret `VERCEL_AUTOMATION_BYPASS_SECRET`.

When that secret is absent, **Preview smoke** is skipped at job level (it does not run and exit
green). GitHub still reports a skipped job's merge conclusion as success, so do not mark Preview
smoke as a required check until the secret is set. The workflow does not change Vercel project
settings or write repository secrets.

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
| `/api/health` | Public | Liveness JSON (`{ ok: true }`). No auth, database, or upstream calls. Rate-limited. |
| `/dashboard` | **Protected** | Stock research dashboard (`/dashboard?ticker=AAPL`) |
| `/valuation`, `/options`, `/pnl-calculator` | **Protected** | Analysis tools |
| `/senlogic`, `/correlation`, `/stress-test`, `/whisper-alerts` | **Protected** | Experiments |
| `/api/stock`, `/api/options`, `/api/valuation/*`, `/api/sentiment/*` | **Protected** | Market data (returns `401` JSON when unauthenticated) |

Protected pages redirect unauthenticated visitors to `/sign-in` with the original destination
preserved in `redirect_url`, so users land where they intended after signing in.

---

## Deployment (Vercel)

1. Push the repository to GitHub, then import it at [vercel.com/new](https://vercel.com/new). Next.js
   is detected automatically — no `vercel.json` needed.
2. In the Clerk dashboard, create a **production instance** for your domain and complete the DNS
   records it asks for. Production uses a separate key pair from development.
3. Add every variable from [Environment Variables](#environment-variables) in
   **Vercel → Settings → Environment Variables**, using your production Clerk keys
   and setting `NEXT_PUBLIC_SITE_URL` to your real domain. Paste secrets
   directly into Vercel — do not put them in a file in the repo.
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
