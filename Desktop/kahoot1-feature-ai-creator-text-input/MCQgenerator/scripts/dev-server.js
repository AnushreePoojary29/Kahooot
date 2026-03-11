const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const nodemonBin = require.resolve("nodemon/bin/nodemon.js");
const pidFile = path.join(process.cwd(), ".mcq-dev-server.pid");
const appPort = String(process.env.PORT || "3001");

function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function stopPreviousInstanceIfAny() {
  if (!fs.existsSync(pidFile)) return;

  const previousPid = Number.parseInt(fs.readFileSync(pidFile, "utf8"), 10);
  if (!isProcessAlive(previousPid)) {
    fs.rmSync(pidFile, { force: true });
    return;
  }

  try {
    process.kill(previousPid, "SIGINT");
  } catch {
    // Best effort.
  }

  fs.rmSync(pidFile, { force: true });
}

function forceFreePort(port) {
  if (process.platform === "win32") {
    const script = [
      `$connections = Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue`,
      "if ($connections) {",
      "  $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique",
      "  foreach ($p in $pids) {",
      "    if ($p) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue }",
      "  }",
      "}",
    ].join("; ");

    spawnSync("powershell", ["-NoProfile", "-Command", script], {
      stdio: "ignore",
    });
    return;
  }

  spawnSync("sh", ["-lc", `lsof -ti:${port} | xargs -r kill -9`], {
    stdio: "ignore",
  });
}

stopPreviousInstanceIfAny();
forceFreePort(appPort);

const child = spawn(
  process.execPath,
  [nodemonBin, "--signal", "SIGINT", "--delay", "750ms", "src/index.js"],
  {
    cwd: process.cwd(),
    env: { ...process.env, PORT: appPort },
    stdio: "inherit",
  },
);

try {
  fs.writeFileSync(pidFile, String(child.pid), "utf8");
} catch {
  // Best effort.
}

const shutdown = () => {
  if (!child.killed) {
    child.kill("SIGINT");
  }
  fs.rmSync(pidFile, { force: true });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

child.on("close", (code) => {
  fs.rmSync(pidFile, { force: true });
  process.exit(code || 0);
});
