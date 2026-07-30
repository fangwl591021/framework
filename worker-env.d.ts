declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    TEST_MIGRATIONS: readonly {
      readonly name: string;
      readonly queries: readonly string[];
    }[];
  }
}