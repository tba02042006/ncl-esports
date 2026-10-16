import { createServer } from "node:net";
import { spawn } from "node:child_process";
import { setTimeout as pause } from "node:timers/promises";
const children = [];
function start(args, env = {}) {
  const child = spawn(process.execPath, args, {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  children.push(child);
  child.stdout.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  return child;
}
async function ready(url) {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(url)).status < 500) return;
    } catch {}
    await pause(200);
  }
  throw new Error("Test server did not become ready: " + url);
}
async function freePort(port) {
  await new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", () =>
      reject(
        new Error(
          `Port ${port} is already in use. Stop the existing process before running isolated browser tests.`,
        ),
      ),
    );
    server.listen(port, "127.0.0.1", () => server.close(resolve));
  });
}
function stop() {
  children.forEach((child) => {
    if (child.exitCode === null) child.kill("SIGTERM");
  });
}
process.once("SIGINT", () => {
  stop();
  process.exit(130);
});
try {
  await freePort(54329);
  await freePort(3100);
  start(["tests/e2e/provider.mjs"], { NCL_E2E_FIXTURE: "1" });
  await ready("http://localhost:54329/auth/v1/user");
  start(
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3100",
    ],
    {
      NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54329",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "local-fixture-key",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
    },
  );
  await ready("http://localhost:3100/admin/login");
  const test = start(["tests/e2e/admin.mjs"], {
    NCL_E2E_APP_URL: "http://localhost:3100",
  });
  const code = await new Promise((resolve) => test.once("exit", resolve));
  if (code !== 0) throw new Error("Admin browser checks failed");
} finally {
  stop();
}
