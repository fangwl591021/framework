import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { isValidCorrelationId } from "../src/core/correlation-id";
import { NoopRuntimeLogger } from "../src/core/logger";
import { createRequestContext } from "../src/core/request-context";
import worker from "../src/index";
import { createCompositionRoot } from "../src/runtime/composition-root";
import { Router } from "../src/runtime/router";
import { FixedClock, readJson, SequenceUuidV7 } from "./helpers";

interface SuccessBody {
  readonly ok: true;
  readonly data: Record<string, unknown>;
  readonly meta: {
    readonly correlationId: string;
    readonly timestamp: string;
  };
}

interface ErrorBody {
  readonly ok: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
  readonly meta: {
    readonly correlationId: string;
    readonly timestamp: string;
  };
}

describe("Runtime composition", () => {
  it("exposes an executable Worker fetch entry", async () => {
    const response = await worker.fetch(
      new Request("https://runtime.test/health"),
    );

    expect(response.status).toBe(200);
  });
  it("starts without a D1 Binding or Secret", () => {
    const runtime = createCompositionRoot();

    expect(runtime.app).toBeDefined();
    expect(runtime.modules).toHaveLength(4);
    expect(runtime.readiness).toEqual({
      router: true,
      requestContext: true,
      uuidv7: true,
      moduleBoundaries: true,
    });
  });

  it("creates independent request contexts with no trusted actor or Tenant", () => {
    const dependencies = {
      clock: new FixedClock(),
      uuidv7: new SequenceUuidV7(),
    };
    const first = createRequestContext(
      new Request("https://runtime.test/health", {
        headers: { "x-tenant-id": "tenant-from-client" },
      }),
      dependencies,
    );
    const second = createRequestContext(
      new Request("https://runtime.test/health"),
      dependencies,
    );

    expect(first).not.toBe(second);
    expect(first.correlationId).not.toBe(second.correlationId);
    expect(first.trustedTenantContext).toBeNull();
    expect(first.authenticatedActor).toBeNull();
    expect(second.trustedTenantContext).toBeNull();
    expect(second.authenticatedActor).toBeNull();
  });

  it("accepts only bounded safe correlation IDs", () => {
    expect(isValidCorrelationId("client.request-01:retry_2")).toBe(true);
    expect(isValidCorrelationId("contains whitespace")).toBe(false);
    expect(isValidCorrelationId("control\nbreak")).toBe(false);
    expect(isValidCorrelationId("x".repeat(65))).toBe(false);
  });

  it("ignores an invalid client correlation ID and generates a new one", () => {
    const context = createRequestContext(
      new Request("https://runtime.test/health", {
        headers: { "x-correlation-id": "invalid correlation" },
      }),
      {
        clock: new FixedClock(),
        uuidv7: new SequenceUuidV7(),
      },
    );

    expect(context.correlationId).toBe("0198-0000-7000-8000-000000000001");
  });
});

describe("Operational endpoints", () => {
  it("returns a safe health envelope", async () => {
    const response = await createCompositionRoot().app.fetch(
      new Request("https://runtime.test/health"),
    );
    const body = await readJson<SuccessBody>(response);
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data).toMatchObject({
      status: "healthy",
      service: "platform-core-framework",
      runtimeVersion: "0.1.0-foundation",
    });
    expect(body.meta.correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(Number.isNaN(Date.parse(body.meta.timestamp))).toBe(false);
    expect(serialized).not.toMatch(/stack|environment|binding|secret/i);
  });

  it("returns Runtime Foundation-only readiness", async () => {
    const response = await createCompositionRoot().app.fetch(
      new Request("https://runtime.test/ready"),
    );
    const body = await readJson<SuccessBody>(response);

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      status: "ready",
      scope: "runtime-foundation-only",
      checks: {
        router: true,
        requestContext: true,
        uuidv7: true,
        moduleBoundaries: true,
      },
      excludedReadiness: ["D1", "provider", "production"],
    });
    expect(Number.isNaN(Date.parse(body.meta.timestamp))).toBe(false);
  });
});

describe("Router and safe errors", () => {
  it("returns ROUTE_NOT_FOUND for an unknown route", async () => {
    const response = await createCompositionRoot().app.fetch(
      new Request("https://runtime.test/unknown"),
    );
    const body = await readJson<ErrorBody>(response);

    expect(response.status).toBe(404);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("ROUTE_NOT_FOUND");
  });

  it("returns METHOD_NOT_ALLOWED for a known path with the wrong method", async () => {
    const response = await createCompositionRoot().app.fetch(
      new Request("https://runtime.test/health", { method: "POST" }),
    );
    const body = await readJson<ErrorBody>(response);

    expect(response.status).toBe(405);
    expect(body.error.code).toBe("METHOD_NOT_ALLOWED");
  });

  it("converts unknown exceptions to a safe INTERNAL_ERROR", async () => {
    const router = new Router();
    router.register({
      method: "GET",
      path: "/explode",
      handler: () => {
        throw new Error(
          "secret-like-value token_very_sensitive C:\\internal\\worker.ts",
        );
      },
    });
    const app = createApp({
      router,
      clock: new FixedClock(),
      uuidv7: new SequenceUuidV7(),
      logger: new NoopRuntimeLogger(),
    });

    const response = await app.fetch(
      new Request("https://runtime.test/explode"),
    );
    const body = await readJson<ErrorBody>(response);
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(500);
    expect(body.error).toEqual({
      code: "INTERNAL_ERROR",
      message: "The service could not complete the request.",
    });
    expect(serialized).not.toContain("token_very_sensitive");
    expect(serialized).not.toContain("worker.ts");
    expect(serialized).not.toContain("stack");
  });
});
