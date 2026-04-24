import oracledb from "oracledb";
import { logger } from "./logger";

const ORACLE_CONFIG = {
  user: "JD2",
  password: "Oracle123",
  connectString: "192.168.1.35:1521/ORCLPDB1",
};

// Known table name patterns for each entity (checked in order)
const TABLE_PATTERNS: Record<string, string[]> = {
};

// Resolved table names (populated on startup via discoverTables())
export const T: Record<string, string> = {};

let pool: any = null;
let initialized = false;

export async function initOraclePool(): Promise<void> {
  if (initialized) return;

  try {
    oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
    oracledb.autoCommit = true;

    pool = await oracledb.createPool({
      user: ORACLE_CONFIG.user,
      password: ORACLE_CONFIG.password,
      connectString: ORACLE_CONFIG.connectString,
      poolMin: 2,
      poolMax: 10,
      poolIncrement: 1,
      poolTimeout: 60,
      connectTimeout: 10,
    });

    logger.info("Oracle connection pool created");

    await discoverTables();
    await ensureUsersTable();
    initialized = true;
  } catch (err) {
    logger.error({ err }, "Failed to initialize Oracle connection pool");
    throw err;
  }
}

async function discoverTables(): Promise<void> {
  const conn = await pool!.getConnection();
  try {
    // Query all tables in the current user's schema
    const result = await conn.execute(
      `SELECT TABLE_NAME FROM USER_TABLES ORDER BY TABLE_NAME`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    ) as { rows?: Array<{ TABLE_NAME: string }> };

    const existingTables = new Set(
      (result.rows ?? []).map((r: { TABLE_NAME: string }) => r.TABLE_NAME.toUpperCase())
    );
    logger.info({ tables: [...existingTables] }, "Oracle tables discovered");

    for (const [entity, patterns] of Object.entries(TABLE_PATTERNS)) {
      const found = patterns.find((p) => existingTables.has(p.toUpperCase()));
      if (found) {
        T[entity] = found;
        logger.info(`Table mapping: ${entity} → ${found}`);
      } else {
        // Fall back to the first candidate and log a warning
        T[entity] = patterns[0];
        logger.warn(
          `No Oracle table found for '${entity}' (tried: ${patterns.join(", ")}). Defaulting to ${patterns[0]}`
        );
      }
    }
  } finally {
    await conn.close();
  }
}

/**
 * Creates the APP_USERS table if it does not yet exist.
 * Safe to call on every startup — uses Oracle's exception-based IF NOT EXISTS pattern.
 * Logs the SQL so admins can run it manually if needed.
 */
async function ensureUsersTable(): Promise<void> {
  const conn = await pool!.getConnection();
  try {
    await conn.execute(`
      BEGIN
        EXECUTE IMMEDIATE '
          CREATE TABLE APP_USERS (
            ID           NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            PHONE        VARCHAR2(10)  NOT NULL,
            PASSWORD_HASH VARCHAR2(255) NOT NULL,
            IS_ACTIVE    NUMBER(1)     DEFAULT 1 NOT NULL,
            CREATED_AT   TIMESTAMP     DEFAULT SYSDATE NOT NULL,
            CONSTRAINT APP_USERS_PHONE_UQ UNIQUE (PHONE)
          )
        ';
      EXCEPTION
        WHEN OTHERS THEN
          IF SQLCODE = -955 THEN NULL; /* Table already exists */
          ELSE RAISE;
          END IF;
      END;
    `);
    logger.info("APP_USERS table ready");
  } catch (err) {
    logger.warn({ err }, "Could not ensure APP_USERS table — create it manually");
  } finally {
    await conn.close();
  }
}

/** Returns true if the Oracle connection pool is up and ready. */
export function isConnected(): boolean {
  return initialized && pool !== null;
}

export async function getConnection(): Promise<any> {
  if (!pool) {
    throw new Error(
      "Oracle DB is not connected. Ensure the server at 192.168.1.35:1521 is reachable from this environment."
    );
  }
  return pool.getConnection();
}

/** Run a SELECT or DML that returns rows */
export async function query<T = Record<string, unknown>>(
  sql: string,
  binds: unknown[] | Record<string, unknown> = [],
  opts: Record<string, unknown> = {}
): Promise<T[]> {
  const conn = await getConnection();
  try {
    const result = await conn.execute(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      ...opts,
    }) as { rows?: T[] };
    return (result.rows ?? []) as T[];
  } catch (err) {
    logger.error({ err, sql }, "Oracle query failed");
    throw err;
  } finally {
    await conn.close();
  }
}

/** Run an INSERT/UPDATE/DELETE and return the raw result (for RETURNING INTO etc.) */
export async function execute(
  sql: string,
  binds: unknown[] | Record<string, unknown> = [],
  opts: Record<string, unknown> = {}
): Promise<any> {
  const conn = await getConnection();
  try {
    const result = await conn.execute(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      autoCommit: true,
      ...opts,
    });
    return result;
  } catch (err) {
    logger.error({ err, sql }, "Oracle execute failed");
    throw err;
  } finally {
    await conn.close();
  }
}

/** Convenience: run a single-row SELECT */
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  binds: unknown[] | Record<string, unknown> = []
): Promise<T | null> {
  const rows = await query<T>(sql, binds);
  return rows[0] ?? null;
}

/** Convenience: run a COUNT query and return the number */
export async function count(
  sql: string,
  binds: unknown[] | Record<string, unknown> = []
): Promise<number> {
  const rows = await query<{ CNT: number }>(sql, binds);
  return Number(rows[0]?.CNT ?? 0);
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.close(0);
    pool = null;
    initialized = false;
    logger.info("Oracle connection pool closed");
  }
}
