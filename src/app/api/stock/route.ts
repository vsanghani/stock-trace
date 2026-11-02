import { NextResponse } from 'next/server';

import type { QuoteSummaryModules } from 'yahoo-finance2/modules/quoteSummary';

import { yahooFinance } from '@/lib/api/yahoo';
import {
    absentBodySchema,
    firstQueryValues,
    parseJsonBody,
    parseWithSchema,
    stockQuerySchema,
} from '@/lib/api/validate';
import { captureServerException } from '@/lib/sentry';

/** Yahoo sometimes returns a bare number and sometimes `{ raw: number }`. */
function yahooNumber(value: unknown): number | null {
    if (typeof value === 'number') return value;
    if (typeof value === 'object' && value !== null && 'raw' in value && typeof value.raw === 'number') {
        return value.raw;
    }
    return null;
}

export async function GET(request: Request) {
    const parsed = parseWithSchema(stockQuerySchema, firstQueryValues(request));
    if (!parsed.ok) return parsed.response;

    const body = await parseJsonBody(request, absentBodySchema);
    if (!body.ok) return body.response;

    const ticker = parsed.data.ticker;

    try {
        const modules: QuoteSummaryModules[] = ['price', 'summaryDetail', 'financialData', 'defaultKeyStatistics', 'recommendationTrend', 'upgradeDowngradeHistory', 'assetProfile', 'earnings'];
        const result = await yahooFinance.quoteSummary(ticker, { modules });

        // console.log('Yahoo Finance Result:', JSON.stringify(result, null, 2));

        if (!result) {
            throw new Error('No data returned from Yahoo Finance');
        }

        const price = result.price;
        const summaryDetail = result.summaryDetail;
        const financialData = result.financialData;
        const defaultKeyStatistics = result.defaultKeyStatistics;
        const recommendationTrend = result.recommendationTrend?.trend?.[0];
        const upgradesDowngrades = result.upgradeDowngradeHistory?.history?.slice(0, 6) || [];
        const assetProfile = result.assetProfile;
        const earnings = result.earnings;

        // Extract quarterly earnings (last 4 quarters)
        const quarterlyEarnings = (earnings?.earningsChart?.quarterly || []).slice(-4).map((quarter) => ({
            date: quarter.date || '',
            actual: yahooNumber(quarter.actual),
            estimate: yahooNumber(quarter.estimate),
        }));

        // Extract company officers (top 10)
        const companyOfficers = (assetProfile?.companyOfficers || []).slice(0, 10).map((officer) => ({
            name: officer.name || '',
            title: officer.title || '',
            age: officer.age || undefined,
        }));

        const stockData = {
            symbol: price?.symbol || ticker,
            shortName: price?.shortName || ticker,
            currency: price?.currency,
            regularMarketPrice: price?.regularMarketPrice,
            regularMarketChange: price?.regularMarketChange,
            regularMarketChangePercent: price?.regularMarketChangePercent,
            marketCap: price?.marketCap,
            regularMarketOpen: price?.regularMarketOpen,
            regularMarketDayHigh: price?.regularMarketDayHigh,
            regularMarketDayLow: price?.regularMarketDayLow,
            fiftyTwoWeekHigh: summaryDetail?.fiftyTwoWeekHigh,
            fiftyTwoWeekLow: summaryDetail?.fiftyTwoWeekLow,
            dividendRate: summaryDetail?.dividendRate,
            dividendYield: summaryDetail?.dividendYield,
            beta: summaryDetail?.beta,

            // Ratios
            trailingPE: summaryDetail?.trailingPE,
            priceToBook: defaultKeyStatistics?.priceToBook,
            debtToEquity: financialData?.debtToEquity,
            returnOnEquity: financialData?.returnOnEquity,
            currentRatio: financialData?.currentRatio,

            // Analyst Data
            consensus: {
                buy: recommendationTrend?.buy || 0,
                strongBuy: recommendationTrend?.strongBuy || 0,
                hold: recommendationTrend?.hold || 0,
                sell: recommendationTrend?.sell || 0,
                strongSell: recommendationTrend?.strongSell || 0,
            },
            targets: {
                high: financialData?.targetHighPrice,
                low: financialData?.targetLowPrice,
                mean: financialData?.targetMeanPrice,
                median: financialData?.targetMedianPrice,
                current: financialData?.currentPrice,
            },
            analystActions: upgradesDowngrades.map((action) => ({
                date: action.epochGradeDate,
                firm: action.firm,
                toGrade: action.toGrade,
                fromGrade: action.fromGrade,
                action: action.action,
            })),

            // Company Profile
            longBusinessSummary: assetProfile?.longBusinessSummary || undefined,
            sector: assetProfile?.sector || undefined,
            industry: assetProfile?.industry || undefined,
            website: assetProfile?.website || undefined,
            city: assetProfile?.city || undefined,
            country: assetProfile?.country || undefined,
            fullTimeEmployees: assetProfile?.fullTimeEmployees || undefined,

            // Company Officers
            companyOfficers,

            // Quarterly Earnings
            quarterlyEarnings,
        };

        return NextResponse.json(stockData);
    } catch (error) {
        console.error('Error fetching stock data:', error instanceof Error ? error.message : 'stock lookup failed');
        captureServerException(error);
        return NextResponse.json({ error: 'Failed to fetch stock data' }, { status: 500 });
    }
}
