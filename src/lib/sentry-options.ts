/** Runtime options shared by the server, edge, and browser SDKs. */
export function sentryRuntimeOptions(dsn: string | undefined) {
    return {
        dsn,
        enabled: Boolean(dsn),
        sendDefaultPii: false,
        tracesSampleRate: 0,
    }
}
