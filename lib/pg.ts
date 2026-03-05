import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

/**
 * Reuse Pool across hot reload in dev.
 */
export const pool =
  global.__pgPool ??
  new Pool({
    host: process.env.PG_HOST,
    port: Number(process.env.PG_PORT || 5432),
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
  });

if (process.env.NODE_ENV !== "production") global.__pgPool = pool;
