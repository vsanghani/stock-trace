import { NextResponse } from 'next/server';

import { yahooFinance } from '@/lib/api/yahoo';
import {
    absentBodySchema,
    firstQueryValues,
    parseJsonBody,
    parseWithSchema,
    searchQuerySchema,
} from '@/lib/api/validate';
import { captureServerException } from '@/lib/sentry';

export async function GET(request: Request) {
    const parsed = parseWithSchema(searchQuerySchema, firstQueryValues(request));
    if (!parsed.ok) return parsed.response;

    const body = await parseJsonBody(request, absentBodySchema);
    if (!body.ok) return body.response;

    const query = parsed.data.q;
    if (!query) {
        return NextResponse.json({ suggestions: [] });
    }

    try {
        const result = await yahooFinance.search(query, { quotesCount: 5, newsCount: 0 });
        const suggestions = result.quotes
            .filter((q: { isYahooFinance?: boolean; symbol?: string }) => q.isYahooFinance === true || q.symbol)
            .map((q: { symbol?: string; shortname?: string; longname?: string; name?: string; exchange?: string; quoteType?: string }) => ({
                symbol: q.symbol,
                name: q.shortname || q.longname || q.name || '',
                exchange: q.exchange || '',
                type: q.quoteType || ''
            }));

        return NextResponse.json({ suggestions });
    } catch (error) {
        console.error('Error fetching suggestions:', error instanceof Error ? error.message : 'search failed');
        captureServerException(error);
        return NextResponse.json({ suggestions: [] });
    }
}
