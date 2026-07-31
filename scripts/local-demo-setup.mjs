import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import { resolve, sep } from "node:path";
const root = resolve(import.meta.dirname, "..");
const command = process.execPath;
const wrangler = resolve(
  root,
  "node_modules",
  "wrangler",
  "bin",
  "wrangler.js",
);
const run = (args) =>
  new Promise((ok, fail) => {
    const child = spawn(command, [wrangler, ...args], {
      cwd: root,
      stdio: "inherit",
    });
    child.on("exit", (code) =>
      code === 0 ? ok() : fail(new Error(`wrangler exited ${code}`)),
    );
  });
if (process.argv.includes("--reset")) {
  const stateRoot = resolve(root, ".wrangler", "state"),
    target = resolve(stateRoot, "v3", "d1");
  if (!target.startsWith(stateRoot + sep))
    throw new Error("Unsafe local reset path");
  await rm(target, { recursive: true, force: true });
}
const common = ["LOCAL_DEMO_DB", "--local", "--config", "wrangler.local.jsonc"];
await run(["d1", "migrations", "apply", ...common]);
await run(["d1", "execute", ...common, "--file", "local-demo/schema.sql"]);
console.log(
  "Local database ready. Start the demo and seed fixtures from /local/setup.",
);
