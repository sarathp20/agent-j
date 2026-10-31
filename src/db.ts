import path from "node:path"
import pg from "pg"

pg.types.setTypeParser(1082, (value: string) => value)   // 1082 = the DATE type

try {
    process.loadEnvFile(path.resolve(import.meta.dirname, "..", ".env"))
} catch {
    // no .env file: fine if DATABASE_URL is already set in the environment
}

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
    throw new Error("DATABASE_URL is missing. Add it to .env")
}

export const pool = new pg.Pool(
    {connectionString}
)