import { z } from "zod"

/**
 * Application environment. Every variable the app expects is listed here.
 *
 * Platform values that Next.js and Vercel inject (`NODE_ENV`, `VERCEL`,
 * `VERCEL_ENV`, `VERCEL_URL`, `VERCEL_PROJECT_PRODUCTION_URL`, `NEXT_PHASE`,
 * `NEXT_PRIVATE_BUILD_WORKER`, `npm_lifecycle_event`) are read by `site.ts`
 * and are not part of this schema.
 *
 * Parsing never throws. Blank strings count as unset. A missing variable is
 * logged once per process so `next build` and `next start` stay up.
 */
const envShape = {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
    CLERK_SECRET_KEY: z.string().optional(),
    DATABASE_URL: z.string().optional(),
    SEC_USER_AGENT: z.string().optional(),
    OPENROUTER_API_KEY: z.string().optional(),
    ALPHA_VANTAGE_API_KEY: z.string().optional(),
    FMP_API_KEY: z.string().optional(),
    NEXT_PUBLIC_SITE_URL: z.string().optional(),
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().optional(),
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().optional(),
    NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: z.string().optional(),
    NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL: z.string().optional(),
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

let warned = false

function blank(value: string | undefined): boolean {
    return !value?.trim()
}

/** Keys that are unset and have no built-in default. Safe to call with any bag of values. */
export function missingEnvKeys(source: Record<string, string | undefined> = process.env): EnvKey[] {
    const picked: Record<string, string | undefined> = {}
    for (const key of ENV_KEYS) {
        const value = source[key]
        picked[key] = typeof value === "string" ? value : undefined
    }

    const parsed = envSchema.safeParse(picked)
    if (!parsed.success) {
        return ENV_KEYS.filter((key) => !DEFAULTED_KEYS.has(key))
    }

    return ENV_KEYS.filter((key) => !DEFAULTED_KEYS.has(key) && blank(parsed.data[key]))
}

/** Log missing variables once. Does not throw. */
export function warnMissingEnv(source: Record<string, string | undefined> = process.env): string[] {
    const missing = missingEnvKeys(source)
    if (missing.length === 0 || warned) return missing
    warned = true
    const clerkMissing =
        missing.includes("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY") || missing.includes("CLERK_SECRET_KEY")
    console.warn(
        `[plutox] Missing environment variables:\n${missing.map((key) => `  - ${key}`).join("\n")}\n` +
            "The server will keep running. " +
            (clerkMissing
                ? "Sign-in stays disabled until NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY are set. "
                : "") +
            "See .env.example."
    )
    return missing
}
