declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    LOCAL_DEMO_SCHEMA: string;
    TEST_MIGRATIONS: readonly {
      readonly name: string;
      readonly queries: readonly string[];
    }[];
  }
}
