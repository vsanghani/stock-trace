import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json({ suggestions: [] });
    }

    try {
        const result = await yahooFinance.search(query, { quotesCount: 5, newsCount: 0 });
        const suggestions = result.quotes
            .filter((q: any) => q.isYahooFinance === true || q.symbol) // Basic filtering
            .map((q: any) => ({
                symbol: q.symbol,
                name: q.shortname || q.longname || q.name || '',
                exchange: q.exchange || '',
                type: q.quoteType || ''
            }));

        return NextResponse.json({ suggestions });
    } catch (error) {
        console.error('Error fetching suggestions:', error);
        return NextResponse.json({ suggestions: [] }); // Fail gracefully
    }
}
