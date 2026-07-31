import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest(async () => ({
      remoteBindings: false,
      miniflare: {
        d1Databases: ["DB"],
        bindings: {
          TEST_MIGRATIONS: await readD1Migrations("migrations"),
        },
      },
    })),
  ],
  test: {
    include: ["tests/d1/**/*.test.ts"],
    clearMocks: true,
  },
});