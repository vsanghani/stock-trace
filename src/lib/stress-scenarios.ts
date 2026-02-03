import { StressScenario, Sector } from '@/types/stress-test'

// Historical and hypothetical stress scenarios
export const STRESS_SCENARIOS: StressScenario[] = [
    {
        id: 'gfc-2008',
        name: '2008 Financial Crisis',
        description: 'Global banking collapse triggered by subprime mortgage crisis. S&P 500 fell ~57% peak-to-trough.',
        marketDrawdown: -0.50,
        dateRange: { start: 'Oct 2007', end: 'Mar 2009' },
        isHypothetical: false,
    },
    {
        id: 'covid-2020',
        name: 'COVID-19 Flash Crash',
        description: 'Rapid market sell-off as pandemic fears spread globally. Fastest 30% drop in history.',
        marketDrawdown: -0.33,
        dateRange: { start: 'Feb 2020', end: 'Mar 2020' },
        isHypothetical: false,
    },
    {
        id: 'tech-2022',
        name: '2022 Tech Selloff',
        description: 'Fed rate hikes crushed growth stocks. NASDAQ fell over 30% from highs.',
        marketDrawdown: -0.30,
        dateRange: { start: 'Jan 2022', end: 'Oct 2022' },
        isHypothetical: false,
    },
    {
        id: 'dotcom-2000',
        name: 'Dot-Com Bubble',
        description: 'Tech bubble burst. NASDAQ lost 78% of its value over 2.5 years.',
        marketDrawdown: -0.45,
        dateRange: { start: 'Mar 2000', end: 'Oct 2002' },
        isHypothetical: false,
    },
    {
        id: 'correction-10',
        name: '10% Market Correction',
        description: 'Typical market correction. Occurs on average once per year.',
        marketDrawdown: -0.10,
        dateRange: { start: 'Hypothetical', end: '' },
        isHypothetical: true,
    },
    {
        id: 'bear-20',
        name: '20% Bear Market',
        description: 'Official bear market threshold. Tests portfolio resilience.',
        marketDrawdown: -0.20,
        dateRange: { start: 'Hypothetical', end: '' },
        isHypothetical: true,
    },
]

// Sector beta multipliers - applied to base market drawdown
// Higher = more volatile, Lower = more defensive
export const SECTOR_BETAS: Record<Sector, number> = {
    'Technology': 1.30,
    'Consumer Discretionary': 1.20,
    'Financials': 1.40,
    'Energy': 1.30,
    'Communication Services': 1.15,
    'Materials': 1.10,
    'Industrials': 1.05,
    'Real Estate': 1.10,
    'Healthcare': 0.90,
    'Consumer Staples': 0.80,
    'Utilities': 0.70,
}

// Helper to get scenario by ID
export function getStressScenario(eventId: string): StressScenario | undefined {
    return STRESS_SCENARIOS.find(s => s.id === eventId)
}

// Helper to get sector beta multiplier
export function getSectorBeta(sector: Sector): number {
    return SECTOR_BETAS[sector] ?? 1.0
}
