import {
  cloudflareTest,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";
import { readFile } from "node:fs/promises";

export default defineConfig({
  plugins: [
    cloudflareTest(async () => ({
      remoteBindings: false,
      miniflare: {
        d1Databases: ["DB"],
        bindings: {
          TEST_MIGRATIONS: await readD1Migrations("migrations"),
          LOCAL_DEMO_SCHEMA: await readFile("local-demo/schema.sql", "utf8"),
        },
      },
    })),
  ],
  test: {
    include: ["tests/d1/**/*.test.ts"],
    clearMocks: true,
  },
});
