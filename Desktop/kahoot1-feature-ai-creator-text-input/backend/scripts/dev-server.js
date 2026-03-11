const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const nextBin = require.resolve("next/dist/bin/next");
const pidFile = path.join(process.cwd(), ".backend-dev-server.pid");
const backendPort = String(
  process.env.BACKEND_PORT || process.env.PORT || "4100",
);

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
  if (!fs.existsSync(pidFile)) {
    return;
  }

  const previousPid = Number.parseInt(fs.readFileSync(pidFile, "utf8"), 10);
  if (!isProcessAlive(previousPid)) {
    fs.rmSync(pidFile, { force: true });
    return;
  }

  try {
    process.kill(previousPid, "SIGINT");
  } catch {
    // ignore and continue startup; Next will report if port is still occupied.
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

  // Best effort for Unix-like systems.
  spawnSync("sh", ["-lc", `lsof -ti:${port} | xargs -r kill -9`], {
    stdio: "ignore",
  });
}

stopPreviousInstanceIfAny();
forceFreePort(backendPort);

const child = spawn(process.execPath, [nextBin, "dev", "-p", backendPort], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: backendPort },
  stdio: ["pipe", "pipe", "pipe"],
});

try {
  fs.writeFileSync(pidFile, String(child.pid), "utf8");
} catch {
  // Best effort only.
}

const stripAnsi = (value) => value.replace(/\u001b\[[0-9;]*m/g, "");

function shouldHideLine(line) {
  const clean = stripAnsi(line).trim();
  if (!clean) return false;
  return (
    clean.startsWith("▲ Next.js") ||
    clean.startsWith("- Local:") ||
    clean.startsWith("- Network:") ||
    clean.startsWith("- Environments:")
  );
}

function pipeFiltered(stream, target) {
  let buffer = "";
  stream.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!shouldHideLine(line)) {
        target.write(`${line}\n`);
      }
    }
  });

  stream.on("end", () => {
    if (buffer && !shouldHideLine(buffer)) {
      target.write(buffer);
    }
  });
}

pipeFiltered(child.stdout, process.stdout);
pipeFiltered(child.stderr, process.stderr);

process.stdin.on("data", (chunk) => {
  if (!child.killed) {
    child.stdin.write(chunk);
  }
});

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
