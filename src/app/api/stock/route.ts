import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker');

    if (!ticker) {
        return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
    }

    try {
        const queryOptions = { modules: ['price', 'summaryDetail', 'financialData', 'defaultKeyStatistics', 'recommendationTrend', 'upgradeDowngradeHistory', 'assetProfile', 'earnings'] };
        // @ts-ignore - yahoo-finance2 types can be tricky with modules
        const result = await yahooFinance.quoteSummary(ticker, queryOptions) as any;

        // console.log('Yahoo Finance Result:', JSON.stringify(result, null, 2));

        if (!result) {
            throw new Error('No data returned from Yahoo Finance');
        }

        const price = result.price || {};
        const summaryDetail = result.summaryDetail || {};
        const financialData = result.financialData || {};
        const defaultKeyStatistics = result.defaultKeyStatistics || {};
        const recommendationTrend = result.recommendationTrend?.trend?.[0] || {};
        const upgradesDowngrades = result.upgradeDowngradeHistory?.history?.slice(0, 6) || [];
        const assetProfile = result.assetProfile || {};
        const earnings = result.earnings || {};

        // Extract quarterly earnings (last 4 quarters)
        const quarterlyEarnings = (earnings.earningsChart?.quarterly || []).slice(-4).map((q: any) => ({
            date: q.date || '',
            actual: q.actual?.raw ?? q.actual ?? null,
            estimate: q.estimate?.raw ?? q.estimate ?? null,
        }));

        // Extract company officers (top 10)
        const companyOfficers = (assetProfile.companyOfficers || []).slice(0, 10).map((o: any) => ({
            name: o.name || '',
            title: o.title || '',
            age: o.age || undefined,
        }));

        const stockData = {
            symbol: price.symbol || ticker,
            shortName: price.shortName || ticker,
            currency: price.currency,
            marketState: price.marketState ?? undefined,
            exchangeName: (price.fullExchangeName || price.exchangeName) ?? undefined,
            regularMarketPrice: price.regularMarketPrice,
            regularMarketChange: price.regularMarketChange,
            regularMarketChangePercent: price.regularMarketChangePercent,
            marketCap: price.marketCap,
            regularMarketOpen: price.regularMarketOpen,
            regularMarketDayHigh: price.regularMarketDayHigh,
            regularMarketDayLow: price.regularMarketDayLow,
            fiftyTwoWeekHigh: summaryDetail.fiftyTwoWeekHigh,
            fiftyTwoWeekLow: summaryDetail.fiftyTwoWeekLow,
            dividendRate: summaryDetail.dividendRate,
            dividendYield: summaryDetail.dividendYield,
            beta: summaryDetail.beta,

            // Ratios
            trailingPE: summaryDetail.trailingPE,
            priceToBook: defaultKeyStatistics.priceToBook,
            debtToEquity: financialData.debtToEquity,
            returnOnEquity: financialData.returnOnEquity,
            currentRatio: financialData.currentRatio,

            // Analyst Data
            consensus: {
                buy: recommendationTrend.buy || 0,
                strongBuy: recommendationTrend.strongBuy || 0,
                hold: recommendationTrend.hold || 0,
                sell: recommendationTrend.sell || 0,
                strongSell: recommendationTrend.strongSell || 0,
            },
            targets: {
                high: financialData.targetHighPrice,
                low: financialData.targetLowPrice,
                mean: financialData.targetMeanPrice,
                median: financialData.targetMedianPrice,
                current: financialData.currentPrice,
            },
            analystActions: upgradesDowngrades.map((action: any) => ({
                date: action.epochGradeDate,
                firm: action.firm,
                toGrade: action.toGrade,
                fromGrade: action.fromGrade,
                action: action.action,
            })),

            // Company Profile
            longBusinessSummary: assetProfile.longBusinessSummary || undefined,
            sector: assetProfile.sector || undefined,
            industry: assetProfile.industry || undefined,
            website: assetProfile.website || undefined,
            city: assetProfile.city || undefined,
            country: assetProfile.country || undefined,
            fullTimeEmployees: assetProfile.fullTimeEmployees || undefined,

            // Company Officers
            companyOfficers,

            // Quarterly Earnings
            quarterlyEarnings,
        };

        return NextResponse.json(stockData);
    } catch (error) {
        console.error('Error fetching stock data:', error);
        return NextResponse.json({ error: 'Failed to fetch stock data', details: String(error) }, { status: 500 });
    }
}
