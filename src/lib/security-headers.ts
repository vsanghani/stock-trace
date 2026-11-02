/**
 * Report-only CSP while the policy is tuned, plus an enforcing
 * `frame-ancestors 'none'` so the app cannot be embedded.
 */
export const CONTENT_SECURITY_POLICY_REPORT_ONLY = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.com https://*.clerk.accounts.dev https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://images.unsplash.com https://img.clerk.com",
    "font-src 'self' data:",
    "connect-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://api.clerk.com https://*.sentry.io https://*.ingest.sentry.io",
    "frame-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://challenges.cloudflare.com",
    "worker-src 'self' blob:",
].join("; ")

export const CONTENT_SECURITY_POLICY = "frame-ancestors 'none'"

export function securityHeaders(): Array<{ key: string; value: string }> {
    return [
        { key: "Content-Security-Policy-Report-Only", value: CONTENT_SECURITY_POLICY_REPORT_ONLY },
        { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "DENY" },
    ]
}
