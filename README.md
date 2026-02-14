# Stock Trace

> **Internal Use Only** — This application is intended for internal staff. Do not distribute externally.

Stock Trace is a real-time stock research and analysis dashboard. It provides live price data, company insights, sentiment analysis, and a suite of experimental tools including correlation heatmaps, portfolio stress testing, P&L tracking, and whisper alerts.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) |
| **Language** | TypeScript 5 |
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

### Lint

```bash
npm run lint
```

---

## File Structure

```
stock-trace/
├── public/                          # Static assets (SVGs, icons)
├── src/
│   ├── app/                         # Next.js App Router (pages & API)
│   │   ├── layout.tsx               # Root layout
│   │   ├── page.tsx                  # Home / landing page
│   │   ├── globals.css              # Global styles
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
│   │   ├── navbar.tsx               # Top navigation bar
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

- **Stock Search & Dashboard** — Look up any ticker for real-time price data, company info, and market stats.
- **Sentiment Analysis (SenLogic)** — AI-driven sentiment scoring for any stock.
- **Correlation Heatmap** — Visualise how different assets move relative to each other.
- **Portfolio Stress Test** — Simulate market scenarios against your holdings.
- **P&L Calculator** — Track daily trades with a calendar-based P&L view.
- **Whisper Alerts** — Set custom price/condition alerts with notifications.
- **Blog** — Internal articles and insights powered by MDX.
