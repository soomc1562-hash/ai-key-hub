import { Pool } from "pg";

const globalForDb = globalThis as unknown as {
  pgPool?: Pool;
  schemaPromise?: Promise<void>;
};

export const pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
    max: 5,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgPool = pool;
}

export const db = {
  query: (text: string, params: unknown[] = []) =>
    pool.query(text, params),
};

export async function ensureSchema(): Promise<void> {
  if (!globalForDb.schemaPromise) {
    globalForDb.schemaPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'user',
          created_at TEXT NOT NULL
        );

        CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower
        ON users (LOWER(email));

        CREATE TABLE IF NOT EXISTS conversations (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          provider TEXT NOT NULL,
          title TEXT NOT NULL,
          folder TEXT NOT NULL DEFAULT 'General',
          messages_json TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS conversations_user_updated
        ON conversations(user_id, updated_at DESC);

        CREATE TABLE IF NOT EXISTS usage_events (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          provider TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
      `);

      await pool.query(`
        ALTER TABLE conversations
        ADD COLUMN IF NOT EXISTS folder TEXT NOT NULL DEFAULT 'General'
      `);

      await pool.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
      `);

      if (process.env.ADMIN_EMAIL) {
        await pool.query(
          "UPDATE users SET role = 'admin' WHERE LOWER(email) = LOWER($1)",
          [process.env.ADMIN_EMAIL]
        );
      }
    })();
  }

  try {
    await globalForDb.schemaPromise;
  } catch (error) {
    globalForDb.schemaPromise = undefined;
    throw error;
  }
}
