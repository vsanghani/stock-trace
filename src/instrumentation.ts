import * as Sentry from "@sentry/nextjs"

import { getServerEnv } from "@/lib/env.server"

export async function register() {
    if (getServerEnv().NEXT_RUNTIME === "nodejs") {
        await import("./sentry.server.config")
        const { warnMissingEnv } = await import("./lib/env")
        warnMissingEnv()
    }
    if (getServerEnv().NEXT_RUNTIME === "edge") {
        await import("./sentry.edge.config")
    }
}

export const onRequestError = Sentry.captureRequestError
