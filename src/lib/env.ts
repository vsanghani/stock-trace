import { z } from "zod"

/**
 * Every environment variable this app reads.
 *
 * `NEXT_RUNTIME` is injected by Next.js. The rest are configuration. Parsing
 * never throws: blank strings count as unset, and a value that does not match
 * its schema is ignored. Optional integrations (Sentry, Upstash) stay quiet
 * when they are unset and warn only when the value is present but unusable.
 *
 * Server and proxy code call `getServerEnv()` from `env.server`. Client
 * components, `instrumentation-client.ts`, and `site.ts` keep a static
 * `process.env.NEXT_PUBLIC_*` read so Next can inline those public values.
 * `readPublicEnv()` is the same static read for server code that only needs
 * the public set.
 */
const optionalText = z.preprocess((value: unknown) => {
    if (typeof value !== "string") return undefined
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
}, z.string().optional())

const optionalHttpUrl = z.preprocess((value: unknown) => {
    if (typeof value !== "string") return undefined
    const trimmed = value.trim()
    if (!trimmed) return undefined
    try {
        const url = new URL(trimmed)
        if (url.protocol !== "http:" && url.protocol !== "https:") return undefined
        return trimmed
    } catch {
        return undefined
    }
}, z.string().optional())

const optionalRuntime = z.preprocess((value: unknown) => {
    return value === "nodejs" || value === "edge" ? value : undefined
}, z.enum(["nodejs", "edge"]).optional())

const envShape = {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: optionalText,
    CLERK_SECRET_KEY: optionalText,
    DATABASE_URL: optionalText,
    SEC_USER_AGENT: optionalText,
    OPENROUTER_API_KEY: optionalText,
    ALPHA_VANTAGE_API_KEY: optionalText,
    FMP_API_KEY: optionalText,
    NEXT_PUBLIC_SITE_URL: optionalHttpUrl,
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: optionalText,
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: optionalText,
    NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: optionalText,
    NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL: optionalText,
    SENTRY_DSN: optionalHttpUrl,
    NEXT_PUBLIC_SENTRY_DSN: optionalHttpUrl,
    SENTRY_AUTH_TOKEN: optionalText,
    SENTRY_ORG: optionalText,
    SENTRY_PROJECT: optionalText,
    UPSTASH_REDIS_REST_URL: optionalHttpUrl,
    UPSTASH_REDIS_REST_TOKEN: optionalText,
    NEXT_RUNTIME: optionalRuntime,
}

export const envSchema = z.object(envShape)

export type AppEnv = z.infer<typeof envSchema>

type EnvKey = keyof typeof envShape

export const ENV_KEYS = Object.keys(envShape) as EnvKey[]

/**
 * Clerk route vars have the same paths hardcoded on the sign-in and sign-up
 * pages, so an unset value is not a misconfiguration.
 */
const DEFAULTED_KEYS = new Set<EnvKey>([
    "NEXT_PUBLIC_CLERK_SIGN_IN_URL",
    "NEXT_PUBLIC_CLERK_SIGN_UP_URL",
    "NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL",
    "NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL",
])

/** Unset is a supported no-op, so absence alone is not a warning. */
const QUIET_KEYS = new Set<EnvKey>([
    "SENTRY_DSN",
    "NEXT_PUBLIC_SENTRY_DSN",
    "SENTRY_AUTH_TOKEN",
    "SENTRY_ORG",
    "SENTRY_PROJECT",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "NEXT_RUNTIME",
])

const URL_KEYS = new Set<EnvKey>([
    "NEXT_PUBLIC_SITE_URL",
    "SENTRY_DSN",
    "NEXT_PUBLIC_SENTRY_DSN",
    "UPSTASH_REDIS_REST_URL",
])

export const PUBLIC_ENV_KEYS = [
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SITE_URL",
    "NEXT_PUBLIC_SENTRY_DSN",
    "NEXT_PUBLIC_CLERK_SIGN_IN_URL",
    "NEXT_PUBLIC_CLERK_SIGN_UP_URL",
    "NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL",
    "NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL",
] as const satisfies readonly EnvKey[]

export type PublicEnvKey = (typeof PUBLIC_ENV_KEYS)[number]

export interface InspectedEnv {
    env: AppEnv
    missing: EnvKey[]
    problems: string[]
}

let warned = false

function blank(value: string | undefined): boolean {
    return !value?.trim()
}

function rawText(source: Record<string, string | undefined>, key: EnvKey): string | undefined {
    const value = source[key]
    if (typeof value !== "string") return undefined
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
}

function picked(source: Record<string, string | undefined>): Record<string, string | undefined> {
    const record: Record<string, string | undefined> = {}
    for (const key of ENV_KEYS) {
        const value = source[key]
        record[key] = typeof value === "string" ? value : undefined
    }
    return record
}

/** Parse a bag of values. Safe to call with any record; never throws. */
export function inspectEnv(source: Record<string, string | undefined> = process.env): InspectedEnv {
    const input = picked(source)
    const parsed = envSchema.safeParse(input)
    const env: AppEnv = parsed.success ? parsed.data : ({} as AppEnv)
    const problems: string[] = []

    if (!parsed.success) {
        problems.push("Environment values could not be parsed and were ignored.")
    }

    for (const key of URL_KEYS) {
        if (rawText(input, key) && blank(env[key])) {
            problems.push(`${key} is not a valid http(s) URL and was ignored.`)
        }
    }

    const upstashUrl = Boolean(env.UPSTASH_REDIS_REST_URL)
    const upstashToken = Boolean(env.UPSTASH_REDIS_REST_TOKEN)
    if (upstashUrl !== upstashToken) {
        problems.push(
            "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must both be set; Redis rate limiting is disabled."
        )
        env.UPSTASH_REDIS_REST_URL = undefined
        env.UPSTASH_REDIS_REST_TOKEN = undefined
    }

    if (env.SENTRY_AUTH_TOKEN && (!env.SENTRY_ORG || !env.SENTRY_PROJECT)) {
        problems.push(
            "SENTRY_AUTH_TOKEN is set without SENTRY_ORG and SENTRY_PROJECT; source maps will not be uploaded."
        )
    }

    const missing = ENV_KEYS.filter((key) => {
        if (DEFAULTED_KEYS.has(key) || QUIET_KEYS.has(key)) return false
        if (!blank(env[key])) return false
        // A present-but-invalid value is reported in `problems` instead.
        if (rawText(input, key)) return false
        return true
    })

    return { env, missing, problems }
}

/** Keys that are unset and have no built-in default. */
export function missingEnvKeys(source: Record<string, string | undefined> = process.env): EnvKey[] {
    return inspectEnv(source).missing
}

/** True only when org, project, and auth token are all set. */
export function shouldUploadSourceMaps(env: AppEnv): boolean {
    return Boolean(env.SENTRY_AUTH_TOKEN && env.SENTRY_ORG && env.SENTRY_PROJECT)
}

/**
 * Public values, safe to import from client components.
 * Called with no argument, each `NEXT_PUBLIC_*` var is read statically.
 */
export function readPublicEnv(source?: Record<string, string | undefined>): Pick<AppEnv, PublicEnvKey> {
    const record = source ?? {
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
        NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
        NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
        NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
        NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
        NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL,
        NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL,
    }
    return inspectEnv(record).env
}

/** Publishable key only. The UI hides Clerk when this is unset. */
export function hasClerkPublishableKey(source?: Record<string, string | undefined>): boolean {
    return Boolean(readPublicEnv(source).NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
}

/** Log missing or unusable variables once. Does not throw. */
export function warnMissingEnv(source: Record<string, string | undefined> = process.env): string[] {
    const { missing, problems } = inspectEnv(source)
    const notes = [
        ...missing.map((key) => `  - ${key}`),
        ...problems.map((problem) => `  - ${problem}`),
    ]
    if (notes.length === 0 || warned) return missing
    warned = true
    const clerkMissing =
        missing.includes("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY") || missing.includes("CLERK_SECRET_KEY")
    console.warn(
        `[plutox] Missing environment variables:\n${notes.join("\n")}\n` +
            "The server will keep running. " +
            (clerkMissing
                ? "Sign-in stays disabled until NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY are set. "
                : "") +
            "See .env.example."
    )
    return missing
}

/** Test hook. Production code warns at most once per process. */
export function resetEnvWarningsForTests(): void {
    warned = false
}
