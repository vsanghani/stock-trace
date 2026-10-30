import pg from "pg"

export function connectionConfig(connectionString: string): pg.PoolConfig {
    let cleaned = connectionString
    let ssl: pg.PoolConfig["ssl"]
    try {
        const url = new URL(connectionString)
        const mode = url.searchParams.get("sslmode")
        if (mode && mode !== "disable") {
            ssl = { rejectUnauthorized: false }
            url.searchParams.delete("sslmode")
            cleaned = url.toString()
        }
    } catch {
        ssl = undefined
    }
    return {
        connectionString: cleaned,
        ssl,
        max: 4,
        application_name: "plutox-holders",
    }
}

let typesConfigured = false

function configureTypeParsers() {
    if (typesConfigured) return
    // Keep DATE columns as YYYY-MM-DD strings so UTC conversion cannot shift the day.
    pg.types.setTypeParser(1082, (value: string) => value)
    typesConfigured = true
}

let singleton: pg.Pool | null = null

export function getPool(): pg.Pool {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
        throw new Error("DATABASE_URL is not set")
    }
    configureTypeParsers()
    if (!singleton) singleton = new pg.Pool(connectionConfig(connectionString))
    return singleton
}

export async function closePool(): Promise<void> {
    if (!singleton) return
    const pool = singleton
    singleton = null
    await pool.end()
}

export function requireSecUserAgent(): string {
    const userAgent = process.env.SEC_USER_AGENT?.trim()
    if (!userAgent) {
        throw new Error(
            "SEC_USER_AGENT is not set. SEC fair access requires a User-Agent that identifies the application and a contact email.",
        )
    }
    return userAgent
}
