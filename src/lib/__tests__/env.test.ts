import { afterEach, describe, expect, it, vi } from "vitest"

import { getServerEnv } from "@/lib/env.server"
import {
    envSchema,
    inspectEnv,
    missingEnvKeys,
    readPublicEnv,
    resetEnvWarningsForTests,
    shouldUploadSourceMaps,
    warnMissingEnv,
} from "@/lib/env"

const COMPLETE = {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_example",
    CLERK_SECRET_KEY: "sk_test_example",
    DATABASE_URL: "postgres://localhost/plutox",
    SEC_USER_AGENT: "Plutox research@example.com",
    OPENROUTER_API_KEY: "key",
    ALPHA_VANTAGE_API_KEY: "key",
    FMP_API_KEY: "key",
    NEXT_PUBLIC_SITE_URL: "https://www.plutox.site",
}

describe("env schema", () => {
    afterEach(() => {
        resetEnvWarningsForTests()
        vi.restoreAllMocks()
    })

    it("accepts an empty environment and does not throw while warning", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
        const missing = warnMissingEnv({})
        expect(envSchema.safeParse({}).success).toBe(true)
        expect(missing).toEqual([
            "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
            "CLERK_SECRET_KEY",
            "DATABASE_URL",
            "SEC_USER_AGENT",
            "OPENROUTER_API_KEY",
            "ALPHA_VANTAGE_API_KEY",
            "FMP_API_KEY",
            "NEXT_PUBLIC_SITE_URL",
        ])
        expect(missingEnvKeys({})).toEqual(missing)
        expect(warn).toHaveBeenCalledOnce()
        const message = String(warn.mock.calls[0]?.[0])
        expect(message).toContain("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY")
        expect(message).toContain("CLERK_SECRET_KEY")
        expect(message).not.toContain("SENTRY_DSN")
        expect(message).not.toContain("UPSTASH_REDIS_REST_URL")
    })

    it("treats blank strings as missing and ignores clerk route defaults", () => {
        expect(
            missingEnvKeys({
                ...COMPLETE,
                NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "  pk_test_example  ",
                CLERK_SECRET_KEY: " ",
            })
        ).toEqual(["CLERK_SECRET_KEY"])
    })

    it("does not throw when a value is not a string", () => {
        expect(() => missingEnvKeys({ NEXT_PUBLIC_SITE_URL: 1 as unknown as string })).not.toThrow()
        expect(envSchema.safeParse({ NEXT_PUBLIC_SITE_URL: "https://www.plutox.site" }).success).toBe(true)
    })

    it("ignores an invalid optional URL and warns once", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
        const inspected = inspectEnv({
            ...COMPLETE,
            NEXT_PUBLIC_SITE_URL: "not a url",
            SENTRY_DSN: "ftp://sentry.example/1",
        })
        expect(inspected.env.NEXT_PUBLIC_SITE_URL).toBeUndefined()
        expect(inspected.env.SENTRY_DSN).toBeUndefined()
        expect(inspected.missing).not.toContain("NEXT_PUBLIC_SITE_URL")
        expect(inspected.problems.join("\n")).toContain("NEXT_PUBLIC_SITE_URL")
        expect(inspected.problems.join("\n")).toContain("SENTRY_DSN")
        warnMissingEnv({
            ...COMPLETE,
            NEXT_PUBLIC_SITE_URL: "not a url",
        })
        expect(warn).toHaveBeenCalledOnce()
        expect(String(warn.mock.calls[0]?.[0])).toContain("was ignored")
    })

    it("disables Upstash unless both the URL and token are set", () => {
        const inspected = inspectEnv({
            ...COMPLETE,
            UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
        })
        expect(inspected.env.UPSTASH_REDIS_REST_URL).toBeUndefined()
        expect(inspected.env.UPSTASH_REDIS_REST_TOKEN).toBeUndefined()
        expect(inspected.problems.join(" ")).toContain("UPSTASH_REDIS_REST_TOKEN")

        const ready = inspectEnv({
            ...COMPLETE,
            UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
            UPSTASH_REDIS_REST_TOKEN: "token",
        })
        expect(ready.env.UPSTASH_REDIS_REST_URL).toBe("https://example.upstash.io")
        expect(ready.env.UPSTASH_REDIS_REST_TOKEN).toBe("token")
        expect(ready.problems).toEqual([])
    })

    it("uploads source maps only when the token, org, and project are set", () => {
        const partial = inspectEnv({ ...COMPLETE, SENTRY_AUTH_TOKEN: "token" })
        expect(shouldUploadSourceMaps(partial.env)).toBe(false)
        expect(partial.problems.join(" ")).toContain("SENTRY_ORG")

        const ready = inspectEnv({
            ...COMPLETE,
            SENTRY_AUTH_TOKEN: "token",
            SENTRY_ORG: "vrtx",
            SENTRY_PROJECT: "plutox",
            SENTRY_DSN: "https://public@sentry.example/1",
            NEXT_PUBLIC_SENTRY_DSN: "https://public@sentry.example/1",
        })
        expect(shouldUploadSourceMaps(ready.env)).toBe(true)
        expect(ready.env.SENTRY_DSN).toBe("https://public@sentry.example/1")
    })

    it("reads public and server values from process.env at call time", () => {
        const previousSite = process.env.NEXT_PUBLIC_SITE_URL
        const previousFmp = process.env.FMP_API_KEY
        process.env.NEXT_PUBLIC_SITE_URL = "https://www.plutox.site"
        process.env.FMP_API_KEY = "fmp-test"
        expect(readPublicEnv().NEXT_PUBLIC_SITE_URL).toBe("https://www.plutox.site")
        expect(getServerEnv().FMP_API_KEY).toBe("fmp-test")
        expect(getServerEnv().NEXT_PUBLIC_SITE_URL).toBe("https://www.plutox.site")
        if (previousSite === undefined) delete process.env.NEXT_PUBLIC_SITE_URL
        else process.env.NEXT_PUBLIC_SITE_URL = previousSite
        if (previousFmp === undefined) delete process.env.FMP_API_KEY
        else process.env.FMP_API_KEY = previousFmp
    })
})
