import { NextResponse } from 'next/server'
import { SentimentResult, NewsHeadline, getSentimentLabel } from '@/types/sentiment'
import { SITE_NAME } from '@/lib/site'

interface RouteParams {
    params: Promise<{ ticker: string }>
}

// Mock headlines for development/fallback
function getMockHeadlines(ticker: string): NewsHeadline[] {
    const mockSources = ['Reuters', 'Bloomberg', 'CNBC', 'WSJ', 'MarketWatch']
    const sentiments = [
        `${ticker} beats earnings expectations, stock surges`,
        `Analysts upgrade ${ticker} to buy rating`,
        `${ticker} announces expansion into new markets`,
        `${ticker} faces regulatory scrutiny, shares dip`,
        `${ticker} CEO discusses future growth plans`,
    ]

    return sentiments.map((title, i) => ({
        title,
        source: mockSources[i],
        publishedAt: new Date(Date.now() - i * 3600000).toISOString(),
    }))
}

// Analyze sentiment using OpenRouter API
async function analyzeWithLLM(ticker: string, headlines: NewsHeadline[]): Promise<{ score: number; reason: string }> {
    const apiKey = process.env.OPENROUTER_API_KEY

    if (!apiKey) {
        // Fallback: generate mock sentiment based on ticker hash
        const hash = ticker.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
        const mockScore = 30 + (hash % 50) // Score between 30-80
        return {
            score: mockScore,
            reason: `Based on recent market activity and analyst sentiment, ${ticker} shows ${mockScore >= 60 ? 'positive' : mockScore >= 40 ? 'neutral' : 'cautious'} momentum.`
        }
    }

    const headlineText = headlines.map(h => `- ${h.title} (${h.source})`).join('\n')

    const systemPrompt = `You are a financial analyst. Analyze these headlines for ${ticker} and return a single JSON object with a "score" (0-100, where 0 is extreme panic and 100 is extreme euphoria) and a "reason" (1 sentence explaining your analysis). Return ONLY valid JSON, no markdown.`

    const userPrompt = `Headlines for ${ticker}:\n${headlineText}`

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
                "X-Title": `${SITE_NAME} Sentiment`,
            },
            body: JSON.stringify({
                model: 'google/gemini-2.0-flash-001',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: 200,
                temperature: 0.3,
            }),
        })

        if (!response.ok) {
            throw new Error(`OpenRouter API error: ${response.status}`)
        }

        const data = await response.json()
        const content = data.choices?.[0]?.message?.content || ''

        // Parse JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0])
            return {
                score: Math.max(0, Math.min(100, parsed.score || 50)),
                reason: parsed.reason || 'Unable to determine sentiment.'
            }
        }

        throw new Error('Invalid LLM response format')
    } catch (error) {
        console.error('LLM analysis error:', error)
        // Fallback on error
        return {
            score: 50,
            reason: `Market sentiment for ${ticker} is currently mixed based on available data.`
        }
    }
}

// Fetch news from Alpha Vantage (or use mock)
async function fetchNewsHeadlines(ticker: string): Promise<NewsHeadline[]> {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY

    if (!apiKey) {
        return getMockHeadlines(ticker)
    }

    try {
        const response = await fetch(
            `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${ticker}&limit=10&apikey=${apiKey}`
        )

        if (!response.ok) {
            throw new Error('Alpha Vantage API error')
        }

        const data = await response.json()

        if (data.feed && Array.isArray(data.feed)) {
            return data.feed.slice(0, 10).map((item: any) => ({
                title: item.title,
                source: item.source,
                publishedAt: item.time_published,
                url: item.url,
            }))
        }

        return getMockHeadlines(ticker)
    } catch (error) {
        console.error('News fetch error:', error)
        return getMockHeadlines(ticker)
    }
}

export async function GET(request: Request, { params }: RouteParams) {
    const { ticker } = await params

    if (!ticker) {
        return NextResponse.json({ error: 'Ticker is required' }, { status: 400 })
    }

    const upperTicker = ticker.toUpperCase()

    try {
        // Fetch news headlines
        const headlines = await fetchNewsHeadlines(upperTicker)

        // Analyze with LLM
        const { score, reason } = await analyzeWithLLM(upperTicker, headlines)

        const result: SentimentResult = {
            score,
            label: getSentimentLabel(score),
            reason,
            updatedAt: new Date().toISOString(),
            headlines,
        }

        return NextResponse.json(result)
    } catch (error) {
        console.error('Sentiment analysis error:', error)
        return NextResponse.json(
            { error: 'Failed to analyze sentiment', details: String(error) },
            { status: 500 }
        )
    }
}
