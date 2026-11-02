import { NextResponse } from "next/server"
import { z } from "zod"

/** Uppercased tickers accepted by the market-data routes. */
export const TICKER_PATTERN = /^[A-Z0-9.\-]{1,10}$/

export const tickerSchema = z
    .string()
    .trim()
    .max(10)
    .transform((value) => value.toUpperCase())
    .refine((value) => TICKER_PATTERN.test(value))

const DAY = /^\d{4}-\d{2}-\d{2}$/
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/

export const optionalIsoDateSchema = z.preprocess((value: unknown) => {
    if (value === undefined || value === null) return undefined
    if (typeof value !== "string") return value
    const trimmed = value.trim()
    return trimmed.length === 0 ? undefined : trimmed
}, z
    .string()
    .max(40)
    .refine((value) => {
        if (!DAY.test(value) && !INSTANT.test(value)) return false
        const parsed = Date.parse(DAY.test(value) ? `${value}T00:00:00.000Z` : value)
        return Number.isFinite(parsed)
    })
    .optional())

const searchText = z.preprocess((value: unknown) => {
    if (value === undefined || value === null) return undefined
    return value
}, z
    .string()
    .trim()
    .max(80)
    .refine((value) => value.length === 0 || !/[\u0000-\u001F\u007F<>`]/.test(value))
    .optional())

export const stockQuerySchema = z.object({
    ticker: tickerSchema,
})

export const optionsQuerySchema = z.object({
    ticker: tickerSchema,
    date: optionalIsoDateSchema,
})

export const searchQuerySchema = z.object({
    q: searchText,
})

export const tickerParamsSchema = z.object({
    ticker: tickerSchema,
})

/** GET handlers do not read a body. Parsing `undefined` is the check. */
export const absentBodySchema = z.undefined()

export type ValidationSuccess<T> = { ok: true; data: T }
export type ValidationFailure = { ok: false; response: NextResponse }
export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure

export function invalidRequest(fields: string[]): NextResponse {
    return NextResponse.json(
        { error: "Invalid request", fields },
        { status: 400, headers: { "Cache-Control": "no-store" } }
    )
}

function fieldsFromError(error: z.ZodError): string[] {
    const fields = error.issues.map((issue) => {
        const head = issue.path[0]
        return typeof head === "string" || typeof head === "number" ? String(head) : "request"
    })
    return fields.length > 0 ? [...new Set(fields)] : ["request"]
}

export function parseWithSchema<T>(schema: z.ZodType<T>, value: unknown): ValidationResult<T> {
    const parsed = schema.safeParse(value)
    if (!parsed.success) {
        return { ok: false, response: invalidRequest(fieldsFromError(parsed.error)) }
    }
    return { ok: true, data: parsed.data }
}

export function firstQueryValues(request: Request): Record<string, string> {
    const params = new URL(request.url).searchParams
    const query: Record<string, string> = {}
    for (const key of params.keys()) {
        const value = params.get(key)
        if (value !== null && !(key in query)) query[key] = value
    }
    return query
}

export async function parseJsonBody<T>(request: Request, schema: z.ZodType<T>): Promise<ValidationResult<T>> {
    if (request.method === "GET" || request.method === "HEAD") {
        return parseWithSchema(schema, undefined)
    }

    const text = await request.text()
    if (!text.trim()) return parseWithSchema(schema, undefined)

    try {
        return parseWithSchema(schema, JSON.parse(text) as unknown)
    } catch {
        return { ok: false, response: invalidRequest(["body"]) }
    }
}
