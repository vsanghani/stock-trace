import * as Sentry from "@sentry/nextjs"

import { getServerEnv } from "@/lib/env.server"
import { sentryRuntimeOptions } from "@/lib/sentry-options"
import { scrubSentryEvent } from "@/lib/sentry-scrub"

const dsn = getServerEnv().SENTRY_DSN

Sentry.init({
    ...sentryRuntimeOptions(dsn),
    includeLocalVariables: false,
    beforeSend(event) {
        return scrubSentryEvent(event)
    },
})
