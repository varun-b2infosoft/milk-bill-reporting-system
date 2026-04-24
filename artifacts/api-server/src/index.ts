import app from "./app";
import { logger } from "./lib/logger";
import { initOraclePool, closePool } from "./lib/oracle";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function start() {
  // Attempt to connect to Oracle — server starts regardless of outcome.
  // If Oracle is unreachable (e.g., private network from cloud), all DB
  // endpoints will return 503 until connectivity is established.
  logger.info("Connecting to Oracle DB at 192.168.1.35:1521/ORCLPDB1 …");
  try {
    await initOraclePool();
    logger.info("Oracle DB connected successfully");
  } catch (err) {
    logger.error(
      { err },
      "Oracle DB connection failed — server will start but DB endpoints will return 503 until Oracle is reachable. " +
      "Note: 192.168.1.35 is a private network address — ensure this server can reach it."
    );
  }

  app.listen(port, (err) => {
    if (err) {
      const listenErr = err as { code?: string; message?: string };
      if (listenErr.code === "EADDRINUSE") {
        logger.error({ port }, "Port already in use. Stop the existing server or use a different PORT.");
      } else {
        logger.error({ err }, "Error listening on port");
      }
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
  });

  // Graceful shutdown: handle repeated signals without double-closing resources.
  let shuttingDown = false;
  for (const sig of ["SIGTERM", "SIGINT"] as const) {
    process.on(sig, async () => {
      if (shuttingDown) {
        logger.info({ sig }, "Shutdown already in progress");
        return;
      }

      shuttingDown = true;
      logger.info({ sig }, "Shutting down …");

      try {
        await closePool();
        process.exit(0);
      } catch (err) {
        logger.warn({ err }, "Error while closing Oracle pool during shutdown");
        process.exit(0);
      }
    });
  }
}

start().catch((err) => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});
