import * as Sentry from "@sentry/nextjs"

import { getServerEnv } from "@/lib/env.server"

/** Records a server failure when Sentry is configured. No-op without a DSN. */
export function captureServerException(error: unknown): void {
    if (!getServerEnv().SENTRY_DSN) return
    Sentry.captureException(error)
}
