import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { NoopRuntimeLogger } from "../src/core/logger";
import {
  DependencyRegistry,
  DependencyStatusAggregator,
  StaticDependencyProbe,
  type RuntimeFailureObservation,
  type RuntimeObservationPort,
} from "../src/platform-observability";
import { createReadinessHandler } from "../src/runtime/readiness";
import { Router } from "../src/runtime/router";
import { FixedClock, readJson, SequenceUuidV7 } from "./helpers";

const checks = {
  router: true,
  requestContext: true,
  uuidv7: true,
  moduleBoundaries: true,
  reliabilityFoundation: true,
} as const;

class CaptureObservation implements RuntimeObservationPort {
  readonly events: RuntimeFailureObservation[] = [];
  async recordFailure(observation: RuntimeFailureObservation): Promise<void> {
    this.events.push(observation);
  }
}

describe("Runtime diagnostics side path", () => {
  it("creates a safe observation when a request fails", async () => {
    const router = new Router();
    router.register({ method: "GET", path: "/explode", handler: () => {
      throw new Error("raw token and internal stack");
    } });
    const observations = new CaptureObservation();
    const response = await createApp({
      router, clock: new FixedClock(), uuidv7: new SequenceUuidV7(),
      logger: new NoopRuntimeLogger(), observations,
    }).fetch(new Request("https://runtime.test/explode"));
    const body = await readJson<{ error: Record<string, unknown> }>(response);
    expect(observations.events).toHaveLength(1);
    expect(observations.events[0]).toMatchObject({
      eventType: "request.failed", reasonCode: "UNHANDLED_RUNTIME_ERROR",
    });
    expect(JSON.stringify(observations.events)).not.toContain("raw token");
    expect(body.error).toMatchObject({
      retryable: true, actionRequired: false, statusCategory: "failed",
    });
    expect(body.error.supportCode).toMatch(/^SUP-[0-9A-F]{10}$/);
  });

  it("keeps the original error response when observation recording fails", async () => {
    const router = new Router();
    router.register({ method: "GET", path: "/explode", handler: () => {
      throw new Error("failure");
    } });
    const response = await createApp({
      router, clock: new FixedClock(), uuidv7: new SequenceUuidV7(),
      logger: new NoopRuntimeLogger(),
      observations: { recordFailure: async () => { throw new Error("observer unavailable"); } },
    }).fetch(new Request("https://runtime.test/explode"));
    expect(response.status).toBe(500);
  });

  it("fails readiness closed for a required unavailable dependency", async () => {
    const registry = new DependencyRegistry();
    registry.register({ dependencyKey: "d1", required: true });
    const health = new DependencyStatusAggregator(new FixedClock(), registry,
      [new StaticDependencyProbe("d1", "unavailable", "D1_UNAVAILABLE")]);
    const router = new Router();
    router.register({ method: "GET", path: "/ready",
      handler: createReadinessHandler(new FixedClock(), checks, health) });
    const response = await createApp({
      router, clock: new FixedClock(), uuidv7: new SequenceUuidV7(),
      logger: new NoopRuntimeLogger(),
    }).fetch(new Request("https://runtime.test/ready"));
    expect(response.status).toBe(503);
  });
});