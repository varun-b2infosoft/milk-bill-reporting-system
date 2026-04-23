import oracledb from "oracledb";
import { logger } from "./logger";

const ORACLE_CONFIG = {
  user: "JD2",
  password: "Oracle123",
  connectString: "192.168.1.30:1521/ORCLPDB1",
};

// Known table name patterns for each entity (checked in order)
const TABLE_PATTERNS: Record<string, string[]> = {
  bills:       ["BILLS", "MILK_BILL", "MILK_BILLS", "BILL_MASTER", "MB_BILLS"],
  societies:   ["SOCIETIES", "SOCIETY", "SOCIETY_MASTER", "MB_SOCIETIES"],
  routes:      ["ROUTES", "ROUTE", "ROUTE_MASTER", "MB_ROUTES"],
  milkEntries: ["MILK_ENTRIES", "MILK_ENTRY", "MILK_DATA", "ENTRY_DETAIL", "MB_ENTRIES"],
  deductions:  ["DEDUCTIONS", "DEDUCTION", "BILL_DEDUCTIONS", "MB_DEDUCTIONS"],
  purchases:   ["PURCHASES", "PURCHASE", "MILK_PURCHASES", "MB_PURCHASES"],
  targets:     ["TARGETS", "TARGET", "SOCIETY_TARGETS", "MB_TARGETS"],
  dcsRecords:  ["DCS_RECORDS", "DCS_MONITORING", "DCS", "DCS_DATA", "MB_DCS"],
};

// Resolved table names (populated on startup via discoverTables())
export const T: Record<string, string> = {};

let pool: oracledb.Pool | null = null;
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
    const result = await conn.execute<{ TABLE_NAME: string }>(
      `SELECT TABLE_NAME FROM USER_TABLES ORDER BY TABLE_NAME`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const existingTables = new Set(
      (result.rows ?? []).map((r) => r.TABLE_NAME.toUpperCase())
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

export async function getConnection(): Promise<oracledb.Connection> {
  if (!pool) {
    throw new Error(
      "Oracle DB is not connected. Ensure the server at 192.168.1.30:1521 is reachable from this environment."
    );
  }
  return pool.getConnection();
}

/** Run a SELECT or DML that returns rows */
export async function query<T = Record<string, unknown>>(
  sql: string,
  binds: unknown[] | Record<string, unknown> = [],
  opts: oracledb.ExecuteOptions = {}
): Promise<T[]> {
  const conn = await getConnection();
  try {
    const result = await conn.execute<T>(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      ...opts,
    });
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
  opts: oracledb.ExecuteOptions = {}
): Promise<oracledb.Result<unknown>> {
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
