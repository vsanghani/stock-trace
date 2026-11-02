import { describe, expect, it, vi } from "vitest"

import { envSchema, missingEnvKeys, warnMissingEnv } from "@/lib/env"

describe("env schema", () => {
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
        warn.mockRestore()
    })

    it("treats blank strings as missing and ignores clerk route defaults", () => {
        expect(
            missingEnvKeys({
                NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "  pk_test_example  ",
                CLERK_SECRET_KEY: " ",
                DATABASE_URL: "postgres://localhost/plutox",
                SEC_USER_AGENT: "Plutox research@example.com",
                OPENROUTER_API_KEY: "key",
                ALPHA_VANTAGE_API_KEY: "key",
                FMP_API_KEY: "key",
                NEXT_PUBLIC_SITE_URL: "https://www.plutox.site",
            })
        ).toEqual(["CLERK_SECRET_KEY"])
    })

    it("does not throw when a value is not a string", () => {
        expect(() =>
            missingEnvKeys({ NEXT_PUBLIC_SITE_URL: 1 as unknown as string })
        ).not.toThrow()
        expect(envSchema.safeParse({ NEXT_PUBLIC_SITE_URL: "https://www.plutox.site" }).success).toBe(true)
    })
})
