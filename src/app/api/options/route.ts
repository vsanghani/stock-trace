import { NextResponse } from 'next/server';

import type { CallOrPut, OptionsOptions } from 'yahoo-finance2/modules/options';

import { yahooFinance } from '@/lib/api/yahoo';
import {
    absentBodySchema,
    firstQueryValues,
    optionsQuerySchema,
    parseJsonBody,
    parseWithSchema,
} from '@/lib/api/validate';
import { captureServerException } from '@/lib/sentry';

function isoTimestamp(value: Date | string | number | undefined): string {
    if (value instanceof Date) return value.toISOString();
    return value === undefined ? '' : String(value);
}

function toOptionContract(contract: CallOrPut) {
    return {
        contractSymbol: contract.contractSymbol,
        strike: contract.strike,
        currency: contract.currency,
        lastPrice: contract.lastPrice ?? 0,
        change: contract.change ?? 0,
        percentChange: contract.percentChange ?? 0,
        volume: contract.volume ?? 0,
        openInterest: contract.openInterest ?? 0,
        bid: contract.bid ?? 0,
        ask: contract.ask ?? 0,
        contractSize: contract.contractSize || 'REGULAR',
        expiration: isoTimestamp(contract.expiration),
        lastTradeDate: isoTimestamp(contract.lastTradeDate),
        impliedVolatility: contract.impliedVolatility ?? 0,
        inTheMoney: contract.inTheMoney ?? false,
    };
}

export async function GET(request: Request) {
    const parsed = parseWithSchema(optionsQuerySchema, firstQueryValues(request));
    if (!parsed.ok) return parsed.response;

    const body = await parseJsonBody(request, absentBodySchema);
    if (!body.ok) return body.response;

    const { ticker, date } = parsed.data;

    try {
        const queryOptions: OptionsOptions = {};
        if (date) {
            queryOptions.date = new Date(date);
        }

        const result = await yahooFinance.options(ticker.toUpperCase(), queryOptions);

        if (!result) {
            throw new Error('No options data returned from Yahoo Finance');
        }

        const quote = result.quote || {};

        const optionsData = {
            underlyingSymbol: result.underlyingSymbol || ticker.toUpperCase(),
            expirationDates: (result.expirationDates || []).map((d: Date) =>
                d instanceof Date ? d.toISOString() : String(d)
            ),
            strikes: result.strikes || [],
            hasMiniOptions: result.hasMiniOptions || false,
            quote: {
                symbol: quote.symbol || ticker.toUpperCase(),
                shortName: quote.shortName || quote.longName || ticker.toUpperCase(),
                regularMarketPrice: quote.regularMarketPrice ?? 0,
                regularMarketChange: quote.regularMarketChange ?? 0,
                regularMarketChangePercent: quote.regularMarketChangePercent ?? 0,
                marketCap: quote.marketCap ?? undefined,
            },
            options: (result.options || []).map((opt) => ({
                expirationDate: opt.expirationDate instanceof Date
                    ? opt.expirationDate.toISOString()
                    : String(opt.expirationDate),
                hasMiniOptions: opt.hasMiniOptions || false,
                calls: (opt.calls || []).map(toOptionContract),
                puts: (opt.puts || []).map(toOptionContract),
            })),
        };

        return NextResponse.json(optionsData);
    } catch (error) {
        console.error('Error fetching options data:', error instanceof Error ? error.message : 'options lookup failed');
        captureServerException(error);
        return NextResponse.json(
            { error: 'Failed to fetch options data' },
            { status: 500 }
        );
    }
}
