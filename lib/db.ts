import { connection } from "next/server";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
    throw new Error("Database URL not set");
}

const globalForPool = global as unknown as {pool: Pool};

export const pool =
    globalForPool.pool ||
    new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl:
            process.env.NODE_ENV === "production"
                ? { rejectUnauthorized: false }
                : false,
    });

if (process.env.NODE_ENV !== "production") globalForPool.pool = pool;