import * as Sentry from "@sentry/nextjs"

import { getServerEnv } from "@/lib/env.server"
import { sentryRuntimeOptions } from "@/lib/sentry-options"
import { scrubSentryEvent } from "@/lib/sentry-scrub"

Sentry.init({
    ...sentryRuntimeOptions(getServerEnv().SENTRY_DSN),
    beforeSend(event) {
        return scrubSentryEvent(event)
    },
})
