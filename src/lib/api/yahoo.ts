import YahooFinance from "yahoo-finance2"

import { fetchWithTimeout } from "@/lib/api/upstream"

const YAHOO_TIMEOUT_MS = 8_000

/**
 * One Yahoo client for every market-data route. A shared cookie jar and a
 * per-request timeout replace the separate clients each route used to create.
 */
export const yahooFinance = new YahooFinance({
    suppressNotices: ["yahooSurvey"],
    fetch: (input, init) => fetchWithTimeout(input, init, YAHOO_TIMEOUT_MS),
})
