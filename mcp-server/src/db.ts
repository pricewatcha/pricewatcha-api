import pg from "pg";

export type { Pool, PoolClient, QueryResult } from "pg";

export function createPool(connectionString: string): pg.Pool {
  return new pg.Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
}

export async function ensureSchema(pool: pg.Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      CREATE TABLE IF NOT EXISTS oauth_clients (
        client_id          TEXT PRIMARY KEY,
        client_name        TEXT,
        redirect_uris      TEXT[]    NOT NULL DEFAULT '{}',
        grant_types        TEXT[]    NOT NULL DEFAULT '{}',
        response_types     TEXT[]    NOT NULL DEFAULT '{}',
        token_endpoint_auth_method TEXT NOT NULL DEFAULT 'none',
        client_id_issued_at BIGINT,
        created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS oauth_authorization_codes (
        code                   TEXT PRIMARY KEY,
        client_id              TEXT NOT NULL,
        redirect_uri           TEXT NOT NULL,
        code_challenge         TEXT NOT NULL,
        code_challenge_method  TEXT NOT NULL DEFAULT 'S256',
        scope                  TEXT,
        resource               TEXT,
        expires_at             TIMESTAMPTZ NOT NULL,
        used                   BOOLEAN NOT NULL DEFAULT FALSE,
        created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS oauth_tokens (
        access_token         TEXT PRIMARY KEY,
        refresh_token        TEXT UNIQUE,
        client_id            TEXT NOT NULL,
        scope                TEXT,
        resource             TEXT,
        expires_at           TIMESTAMPTZ NOT NULL,
        refresh_expires_at   TIMESTAMPTZ,
        created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS oauth_tokens_refresh_token_idx
        ON oauth_tokens (refresh_token)
        WHERE refresh_token IS NOT NULL;
    `);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
