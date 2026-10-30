import { readdir, readFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { closePool, getPool } from "../src/lib/holders/pool"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const migrationsDir = join(root, "db", "migrations")

async function main() {
    const pool = getPool()
    await pool.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version text PRIMARY KEY,
            applied_at timestamptz NOT NULL DEFAULT now()
        )
    `)

    const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort()
    for (const file of files) {
        const version = file.replace(/\.sql$/, "")
        const existing = await pool.query("SELECT 1 FROM schema_migrations WHERE version = $1", [version])
        if (existing.rowCount) {
            console.log(`Skipping ${file}`)
            continue
        }
        const sql = await readFile(join(migrationsDir, file), "utf8")
        const client = await pool.connect()
        try {
            await client.query("BEGIN")
            await client.query(sql)
            await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [version])
            await client.query("COMMIT")
            console.log(`Applied ${file}`)
        } catch (error) {
            await client.query("ROLLBACK")
            throw error
        } finally {
            client.release()
        }
    }
}

main()
    .catch((error: unknown) => {
        console.error(error instanceof Error ? error.message : error)
        process.exitCode = 1
    })
    .finally(async () => {
        await closePool()
    })
