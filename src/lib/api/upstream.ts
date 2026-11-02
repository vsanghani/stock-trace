/**
 * Shared upstream HTTP helper. Errors name the service and the status only.
 * The request URL is never included: several providers put the API key in it.
 */

const DEFAULT_TIMEOUT_MS = 8_000

export class UpstreamError extends Error {
    readonly service: string
    readonly status: number | null

    constructor(service: string, status: number | null) {
        super(status === null ? `${service} request failed` : `${service} responded with status ${status}`)
        this.name = "UpstreamError"
        this.service = service
        this.status = status
    }
}

export type UpstreamInit = RequestInit & {
    service: string
    timeoutMs?: number
    next?: { revalidate?: number | false; tags?: string[] }
}

export function fetchWithTimeout(
    input: RequestInfo | URL,
    init: RequestInit | undefined,
    timeoutMs: number,
    fetchImpl: typeof fetch = fetch
): Promise<Response> {
    const timeout = AbortSignal.timeout(timeoutMs)
    const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout
    return fetchImpl(input, { ...init, signal })
}

export async function fetchUpstream(input: RequestInfo | URL, init: UpstreamInit): Promise<Response> {
    const { service, timeoutMs = DEFAULT_TIMEOUT_MS, signal, ...rest } = init
    try {
        const response = await fetchWithTimeout(input, { ...rest, signal }, timeoutMs)
        if (!response.ok) {
            await response.arrayBuffer().catch(() => undefined)
            throw new UpstreamError(service, response.status)
        }
        return response
    } catch (error) {
        if (error instanceof UpstreamError) throw error
        throw new UpstreamError(service, null)
    }
}
