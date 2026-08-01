import { cp, mkdir, readFile, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "chrome-extension");
const destination = resolve(root, "dist", "line-oa-platform-console");

if (!destination.startsWith(resolve(root, "dist") + "\\") && !destination.startsWith(resolve(root, "dist") + "/")) {
  throw new Error("EXTENSION_OUTPUT_OUTSIDE_DIST");
}

await rm(destination, { recursive: true, force: true });
await mkdir(dirname(destination), { recursive: true });
await cp(source, destination, { recursive: true });

const manifest = JSON.parse(await readFile(resolve(destination, "manifest.json"), "utf8"));
if (manifest.manifest_version !== 3 || manifest.side_panel?.default_path !== "sidepanel/index.html") {
  throw new Error("EXTENSION_MANIFEST_INVALID");
}

console.log(`Built Chrome extension: ${destination}`);
