import * as Sentry from "@sentry/nextjs"

import { sentryRuntimeOptions } from "@/lib/sentry-options"
import { scrubSentryEvent } from "@/lib/sentry-scrub"

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || undefined

Sentry.init({
    ...sentryRuntimeOptions(dsn),
    beforeSend(event) {
        return scrubSentryEvent(event)
    },
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
