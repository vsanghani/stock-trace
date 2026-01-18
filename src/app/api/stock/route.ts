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
        const queryOptions = { modules: ['price', 'summaryDetail', 'financialData', 'defaultKeyStatistics'] };
        // @ts-ignore - yahoo-finance2 types can be tricky with modules
        const result = await yahooFinance.quoteSummary(ticker, queryOptions) as any;

        console.log('Yahoo Finance Result:', JSON.stringify(result, null, 2));

        if (!result) {
            throw new Error('No data returned from Yahoo Finance');
        }

        const price = result.price || {};
        const summaryDetail = result.summaryDetail || {};
        const financialData = result.financialData || {};
        const defaultKeyStatistics = result.defaultKeyStatistics || {};

        const stockData = {
            symbol: price.symbol || ticker,
            shortName: price.shortName || ticker,
            currency: price.currency,
            regularMarketPrice: price.regularMarketPrice,
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
        };

        return NextResponse.json(stockData);
    } catch (error) {
        console.error('Error fetching stock data:', error);
        return NextResponse.json({ error: 'Failed to fetch stock data', details: String(error) }, { status: 500 });
    }
}
