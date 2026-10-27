import { afterEach, describe, expect, it } from "vitest"

import {
    LANDING_DESCRIPTION,
    landingMetadata,
    pageMetadata,
    rootMetadata,
    siteUrl,
} from "@/lib/site"

const ENV_KEYS = [
    "NEXT_PUBLIC_SITE_URL",
    "VERCEL_ENV",
    "VERCEL_PROJECT_PRODUCTION_URL",
    "VERCEL_URL",
    "VERCEL",
    "NODE_ENV",
    "NEXT_PHASE",
    "NEXT_PRIVATE_BUILD_WORKER",
    "npm_lifecycle_event",
] as const

const original = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]))

const env = process.env as Record<string, string | undefined>

function useEnv(values: Partial<Record<(typeof ENV_KEYS)[number], string>>) {
    for (const key of ENV_KEYS) delete env[key]
    for (const [key, value] of Object.entries(values)) {
        env[key] = value
    }
}

afterEach(() => {
    for (const key of ENV_KEYS) {
        const value = original[key]
        if (value === undefined) delete env[key]
        else env[key] = value
    }
})

describe("siteUrl", () => {
    it("prefers NEXT_PUBLIC_SITE_URL and strips a trailing slash", () => {
        useEnv({
            NEXT_PUBLIC_SITE_URL: "https://www.plutox.site/",
            VERCEL_ENV: "production",
            VERCEL_URL: "preview.vercel.app",
        })
        expect(siteUrl().origin).toBe("https://www.plutox.site")
        expect(siteUrl().href).toBe("https://www.plutox.site/")
    })

    it("uses the Plutox production host when VERCEL_ENV is production", () => {
        useEnv({
            NODE_ENV: "production",
            VERCEL_ENV: "production",
            VERCEL_URL: "stock-trace-git-preview.vercel.app",
            VERCEL_PROJECT_PRODUCTION_URL: "stock-trace.vercel.app",
        })
        expect(siteUrl().origin).toBe("https://www.plutox.site")
    })

    it("uses the Vercel production host before the preview host", () => {
        useEnv({
            NODE_ENV: "production",
            VERCEL_PROJECT_PRODUCTION_URL: "stock-trace.vercel.app/",
            VERCEL_URL: "stock-trace-git-preview.vercel.app",
        })
        expect(siteUrl().origin).toBe("https://stock-trace.vercel.app")
    })

    it("uses VERCEL_URL for a preview when no production host is set", () => {
        useEnv({
            NODE_ENV: "production",
            VERCEL_ENV: "preview",
            VERCEL_URL: "stock-trace-git-preview.vercel.app",
        })
        expect(siteUrl().origin).toBe("https://stock-trace-git-preview.vercel.app")
    })

    it("uses localhost outside production", () => {
        useEnv({ NODE_ENV: "development" })
        expect(siteUrl().origin).toBe("http://localhost:3000")
    })

    it("uses localhost during a local production build", () => {
        useEnv({ NODE_ENV: "production", npm_lifecycle_event: "build" })
        expect(siteUrl().origin).toBe("http://localhost:3000")
    })

    it("throws in a production runtime when no host resolves", () => {
        useEnv({ NODE_ENV: "production", npm_lifecycle_event: "start" })
        expect(() => siteUrl()).toThrow(/Cannot resolve the public site URL/)
    })

    it("throws on Vercel when no host resolves", () => {
        useEnv({
            NODE_ENV: "production",
            VERCEL: "1",
            npm_lifecycle_event: "build",
        })
        expect(() => siteUrl()).toThrow(/Cannot resolve the public site URL/)
    })

    it("throws when NEXT_PUBLIC_SITE_URL is set but not a URL", () => {
        useEnv({ NEXT_PUBLIC_SITE_URL: "http://" })
        expect(() => siteUrl()).toThrow(/Invalid site URL/)
    })
})

describe("metadata", () => {
    it("keeps the landing description under 155 characters", () => {
        expect(LANDING_DESCRIPTION.length).toBeLessThan(155)
        expect(LANDING_DESCRIPTION).toContain("Track stocks in one workspace")
        expect(LANDING_DESCRIPTION).toContain("not financial advice")
    })

    it("does not set a homepage og:url on the root metadata", () => {
        useEnv({ NODE_ENV: "test" })
        const openGraph = rootMetadata().openGraph
        expect(openGraph).toBeDefined()
        expect(openGraph && "url" in openGraph).toBe(false)
        expect(rootMetadata().twitter).toMatchObject({
            images: [
                {
                    url: "/og.png",
                    alt: expect.stringContaining("For information only, not financial advice."),
                },
            ],
        })
    })

    it("sets a canonical URL and og:url for the page path", () => {
        expect(pageMetadata("About us", "Who we are.", "/about")).toMatchObject({
            alternates: { canonical: "/about" },
            openGraph: {
                url: "/about",
                images: [{ url: "/og.png", width: 1200, height: 630 }],
            },
        })
    })

    it("adds twitter image alt text on the landing page", () => {
        expect(landingMetadata().twitter).toMatchObject({
            images: [
                {
                    url: "/og.png",
                    alt: expect.stringContaining("Plutox"),
                },
            ],
        })
    })
})
