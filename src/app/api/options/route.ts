import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker');
    const date = searchParams.get('date');

    if (!ticker) {
        return NextResponse.json({ error: 'Ticker symbol is required' }, { status: 400 });
    }

    try {
        const queryOptions: Record<string, unknown> = {};
        if (date) {
            queryOptions.date = new Date(date);
        }

        // @ts-ignore - yahoo-finance2 types can be tricky
        const result = await yahooFinance.options(ticker.toUpperCase(), queryOptions) as any;

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
            options: (result.options || []).map((opt: any) => ({
                expirationDate: opt.expirationDate instanceof Date
                    ? opt.expirationDate.toISOString()
                    : String(opt.expirationDate),
                hasMiniOptions: opt.hasMiniOptions || false,
                calls: (opt.calls || []).map((c: any) => ({
                    contractSymbol: c.contractSymbol,
                    strike: c.strike,
                    currency: c.currency,
                    lastPrice: c.lastPrice ?? 0,
                    change: c.change ?? 0,
                    percentChange: c.percentChange ?? 0,
                    volume: c.volume ?? 0,
                    openInterest: c.openInterest ?? 0,
                    bid: c.bid ?? 0,
                    ask: c.ask ?? 0,
                    contractSize: c.contractSize || 'REGULAR',
                    expiration: c.expiration instanceof Date
                        ? c.expiration.toISOString()
                        : String(c.expiration || ''),
                    lastTradeDate: c.lastTradeDate instanceof Date
                        ? c.lastTradeDate.toISOString()
                        : String(c.lastTradeDate || ''),
                    impliedVolatility: c.impliedVolatility ?? 0,
                    inTheMoney: c.inTheMoney ?? false,
                })),
                puts: (opt.puts || []).map((p: any) => ({
                    contractSymbol: p.contractSymbol,
                    strike: p.strike,
                    currency: p.currency,
                    lastPrice: p.lastPrice ?? 0,
                    change: p.change ?? 0,
                    percentChange: p.percentChange ?? 0,
                    volume: p.volume ?? 0,
                    openInterest: p.openInterest ?? 0,
                    bid: p.bid ?? 0,
                    ask: p.ask ?? 0,
                    contractSize: p.contractSize || 'REGULAR',
                    expiration: p.expiration instanceof Date
                        ? p.expiration.toISOString()
                        : String(p.expiration || ''),
                    lastTradeDate: p.lastTradeDate instanceof Date
                        ? p.lastTradeDate.toISOString()
                        : String(p.lastTradeDate || ''),
                    impliedVolatility: p.impliedVolatility ?? 0,
                    inTheMoney: p.inTheMoney ?? false,
                })),
            })),
        };

        return NextResponse.json(optionsData);
    } catch (error) {
        console.error('Error fetching options data:', error);
        return NextResponse.json(
            { error: 'Failed to fetch options data', details: String(error) },
            { status: 500 }
        );
    }
}
