import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { networkInterfaces } from "node:os";
import process from "node:process";

const ROOT = process.cwd();
const API_PORT = Number(process.env.API_PORT || 8081);
const FRONTEND_PORT = Number(process.env.FRONTEND_PORT || process.env.PORT || 5173);
const HOST = "localhost";
const POLL_INTERVAL_MS = 300;
const STARTUP_TIMEOUT_MS = 90_000;

function getLocalIp() {
  const interfaces = networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) {
        return entry.address;
      }
    }
  }
  return "127.0.0.1";
}

function createLogBuffer(maxLines = 200) {
  const lines = [];
  return {
    append(chunk) {
      const text = String(chunk || "").trim();
      if (!text) return;
      for (const line of text.split(/\r?\n/)) {
        if (!line.trim()) continue;
        lines.push(line);
      }
      if (lines.length > maxLines) {
        lines.splice(0, lines.length - maxLines);
      }
    },
    tail(count = 30) {
      return lines.slice(-count);
    },
  };
}

function spawnQuiet(name, command, args, env = {}) {
  const stdout = createLogBuffer();
  const stderr = createLogBuffer();

  const child = spawn(command, args, {
    cwd: ROOT,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout?.on("data", (chunk) => stdout.append(chunk));
  child.stderr?.on("data", (chunk) => stderr.append(chunk));

  return { name, child, stdout, stderr };
}

async function waitFor(url, timeoutMs, processRef) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (processRef.child.exitCode != null) return false;

    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status >= 200 && res.status < 600) return true;
    } catch {
      // Keep polling until timeout.
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  return false;
}

function printFailure(service) {
  const lines = [...service.stderr.tail(50), ...service.stdout.tail(20)].filter(Boolean);
  const important = lines.filter((line) =>
    /(Error:|failed|EADDRINUSE|Port .* in use|address already in use|Database unavailable|Cannot find|NJS-|ORA-)/i.test(
      line,
    ),
  );
  const output = (important.length ? important : lines).slice(-8);
  if (output.length > 0) {
    process.stderr.write(`${output.join("\n")}\n`);
  }
}

function describePortUsage(port) {
  // Try using lsof first (Unix). If unavailable, fall back to Windows netstat+tasklist parsing.
  try {
    const result = spawnSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-Fpcn"], {
      encoding: "utf8",
    });

    if (!result.error && result.status === 0 && result.stdout) {
      const details = {};
      for (const line of result.stdout.split(/\r?\n/)) {
        if (!line) continue;
        const key = line[0];
        const value = line.slice(1);
        if (key === "p" && !details.pid) details.pid = value;
        if (key === "c" && !details.command) details.command = value;
        if (key === "n" && !details.name) details.name = value;
      }
      if (details.pid) return details;
    }
  } catch {
    // ignore and try windows fallback
  }

  if (process.platform === "win32") {
    try {
      // netstat -ano lists PID for connections; filter lines containing :<port>
      const ns = spawnSync("netstat", ["-ano"], { encoding: "utf8" });
      if (!ns.error && ns.status === 0 && ns.stdout) {
        const lines = ns.stdout.split(/\r?\n/);
        const match = lines
          .map((l) => l.trim())
          .find((l) => new RegExp(`:${port}\\b`, "i").test(l) && /LISTENING/i.test(l));
        if (match) {
          const parts = match.split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid) {
            const tl = spawnSync("tasklist", ["/FI", `PID eq ${pid}`], { encoding: "utf8" });
            const details = { pid };
            if (!tl.error && tl.status === 0 && tl.stdout) {
              const out = tl.stdout.split(/\r?\n/).slice(3).find(Boolean);
              if (out) {
                details.command = out.split(/\s+/)[0];
              }
            }
            return details;
          }
        }
      }
    } catch {
      // ignore windows fallback errors
    }
  }

  return null;
}

function ensurePortFree(port, label) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();

    server.once("error", (err) => {
      const e = err;
      const usage = describePortUsage(port);
      if (e && (e.code === "EADDRINUSE" || (e.code === "EPERM" && usage))) {
        const owner = usage
          ? `\nPort owner: ${usage.command || "unknown"} (PID ${usage.pid})${usage.name ? ` on ${usage.name}` : ""}`
          : "";
        const remedies = [];
        if (usage?.pid) {
          remedies.push(`Stop it (POSIX): kill ${usage.pid}`);
          remedies.push(`Stop it (Windows): taskkill /PID ${usage.pid} /F`);
        }
        remedies.push(
          `Run with a different port: API_PORT=<port> FRONTEND_PORT=<port> npm run dev`,
        );
        remedies.push(
          `On Windows, prefix env with 'cross-env' or use PowerShell: $env:API_PORT=${port}; $env:FRONTEND_PORT=<port>; npm run dev`,
        );

        reject(
          new Error(`${label} port ${port} is already in use${owner}\n${remedies.join("\n")}`),
        );
      } else {
        reject(new Error(`Unable to check ${label} port ${port}`));
      }
    });

    server.listen(port, () => {
      server.close(() => resolve());
    });
  });
}

function terminate(service) {
  if (!service || service.child.exitCode != null) return;
  try {
    service.child.kill();
  } catch {
    // best-effort
    try {
      service.child.kill("SIGTERM");
    } catch {}
  }
}

async function main() {
  await ensurePortFree(API_PORT, "API server");
  await ensurePortFree(FRONTEND_PORT, "Frontend");

  const api = spawnQuiet("api", "pnpm", ["--filter", "@workspace/api-server", "run", "dev:quiet"], {
    API_PORT: String(API_PORT),
    PORT: String(API_PORT),
    QUIET_STARTUP: "1",
    LOG_LEVEL: "error",
    ESBUILD_LOG_LEVEL: "error",
  });

  const frontend = spawnQuiet(
    "frontend",
    "pnpm",
    ["--filter", "@workspace/milk-bill-dashboard", "run", "dev:quiet"],
    {
      API_PORT: String(API_PORT),
      PORT: String(FRONTEND_PORT),
      FRONTEND_PORT: String(FRONTEND_PORT),
      BASE_PATH: "/",
      VITE_API_URL: `http://localhost:${API_PORT}/api`,
      NODE_ENV: "development",
    },
  );

  const cleanup = () => {
    terminate(frontend);
    terminate(api);
  };

  let shuttingDown = false;
  for (const sig of ["SIGINT", "SIGTERM"]) {
    process.on(sig, () => {
      if (shuttingDown) return;
      shuttingDown = true;
      cleanup();
      process.exit(0);
    });
  }

  const apiReady = await waitFor(`http://${HOST}:${API_PORT}/api/healthz`, STARTUP_TIMEOUT_MS, api);
  if (!apiReady) {
    cleanup();
    printFailure(api);
    process.exit(1);
  }

  const frontendReady = await waitFor(
    `http://${HOST}:${FRONTEND_PORT}`,
    STARTUP_TIMEOUT_MS,
    frontend,
  );
  if (!frontendReady) {
    cleanup();
    printFailure(frontend);
    process.exit(1);
  }

  let dbStatus = "Failed";
  try {
    const health = await fetch(`http://${HOST}:${API_PORT}/api/healthz`);
    dbStatus = health.ok ? "Connected" : "Failed";
  } catch {
    dbStatus = "Failed";
  }

  const ip = getLocalIp();
  const summary = [
    "[SERVER]",
    "Status: Started",
    `Local: http://localhost:${API_PORT}`,
    `Network: http://${ip}:${API_PORT}`,
    "",
    "[DATABASE]",
    `Status: ${dbStatus}`,
    "",
    "[FRONTEND]",
    "Status: Running",
    `Local: http://localhost:${FRONTEND_PORT}`,
    `Network: http://${ip}:${FRONTEND_PORT}`,
  ].join("\n");

  process.stdout.write(`${summary}\n`);

  api.child.on("exit", (code) => {
    if (shuttingDown) return;
    shuttingDown = true;
    terminate(frontend);
    if (code && code !== 0) {
      printFailure(api);
      process.exit(code);
    }
    process.exit(0);
  });

  frontend.child.on("exit", (code) => {
    if (shuttingDown) return;
    shuttingDown = true;
    terminate(api);
    if (code && code !== 0) {
      printFailure(frontend);
      process.exit(code);
    }
    process.exit(0);
  });
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
