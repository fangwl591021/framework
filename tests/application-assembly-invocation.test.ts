import { describe, expect, it } from "vitest";
import {
  ModuleAccessError,
  ModuleInvocationGuard,
  type ModuleAccessSnapshot,
  type ModuleEligibilityPort,
  type ModuleTrafficAdmissionPort,
  type TrustedModuleContext,
} from "../src/application-assembly";

const context: TrustedModuleContext = {
  source: "trusted_runtime_context",
  tenantId: "tenant",
  applicationId: "application",
  moduleKey: "event_engine",
  actorMembershipId: "membership",
  requiredPermission: "tenant:read",
  operation: "event.create",
  correlationId: "correlation",
};

const snapshot: ModuleAccessSnapshot = {
  tenantId: "tenant",
  applicationId: "application",
  moduleKey: "event_engine",
  actorMembershipId: "membership",
  requiredPermission: "tenant:read",
  applicationVersion: 1,
  entitlementId: "entitlement",
  entitlementVersion: 1,
  enablementVersion: 1,
  evaluatedAt: 1,
  accessFence: "fence:1",
};

function harness(current: readonly boolean[] = [true]) {
  const order: string[] = [];
  let admissions = 0;
  let releases = 0;
  let evaluations = 0;
  const traffic: ModuleTrafficAdmissionPort = {
    admit: async () => {
      admissions += 1;
      order.push("traffic");
      return {
        admitted: true,
        release: async () => {
          releases += 1;
          order.push("release");
        },
      };
    },
  };
  const eligibility: ModuleEligibilityPort = {
    requireEligible: async () => {
      evaluations += 1;
      order.push("eligibility");
      return snapshot;
    },
    isSnapshotCurrent: async () => {
      order.push("fence");
      return current[Math.min(evaluations - 1, current.length - 1)] ?? false;
    },
  };
  return {
    guard: new ModuleInvocationGuard(traffic, eligibility),
    order,
    counts: () => ({ admissions, releases, evaluations }),
  };
}

describe("Module Invocation ordering and release", () => {
  it("runs Traffic before eligibility, fence, and domain", async () => {
    const h = harness();
    await h.guard.invokeMutation(context, async () => {
      h.order.push("domain");
    });
    expect(h.order).toEqual([
      "traffic",
      "eligibility",
      "fence",
      "domain",
      "release",
    ]);
  });

  it("claims admission exactly once", async () => {
    const h = harness();
    await h.guard.invokeMutation(context, async () => "ok");
    expect(h.counts().admissions).toBe(1);
  });

  it("does not run domain when the access fence is stale", async () => {
    const h = harness([false]);
    let called = false;
    await expect(
      h.guard.invokeMutation(context, async () => {
        called = true;
      }),
    ).rejects.toMatchObject({ code: "STALE_MODULE_ACCESS" });
    expect(called).toBe(false);
  });

  it("releases a claimed budget once after stale fence", async () => {
    const h = harness([false]);
    await expect(
      h.guard.invokeMutation(context, async () => undefined),
    ).rejects.toBeInstanceOf(ModuleAccessError);
    expect(h.counts().releases).toBe(1);
  });

  it("releases once when eligibility rejects", async () => {
    const h = harness();
    const eligibility: ModuleEligibilityPort = {
      requireEligible: async () => {
        throw new ModuleAccessError("MODULE_NOT_ENABLED");
      },
      isSnapshotCurrent: async () => true,
    };
    const guard = new ModuleInvocationGuard(
      {
        admit: async () => ({
          admitted: true,
          release: async () => {
            h.order.push("release");
          },
        }),
      },
      eligibility,
    );
    await expect(
      guard.invokeMutation(context, async () => h.order.push("domain")),
    ).rejects.toMatchObject({ code: "MODULE_NOT_ENABLED" });
    expect(h.order).toEqual(["release"]);
  });

  it("read query retries eligibility once without a second admission", async () => {
    const h = harness([false, true]);
    await expect(
      h.guard.invokeQuery(context, async () => "query-ok"),
    ).resolves.toBe("query-ok");
    expect(h.counts()).toEqual({ admissions: 1, releases: 1, evaluations: 2 });
  });

  it("mutation never retries a stale snapshot", async () => {
    const h = harness([false, true]);
    await expect(
      h.guard.invokeMutation(context, async () => "bad"),
    ).rejects.toMatchObject({ code: "STALE_MODULE_ACCESS" });
    expect(h.counts().evaluations).toBe(1);
  });

  it("untrusted context is rejected before Traffic admission", async () => {
    const h = harness();
    await expect(
      h.guard.invokeMutation(
        { ...context, source: "client_header" as never },
        async () => "bad",
      ),
    ).rejects.toMatchObject({ code: "APPLICATION_NOT_FOUND" });
    expect(h.counts().admissions).toBe(0);
  });
});

describe("Traffic budget release safety", () => {
  it("repeated guard cleanup never underflows a releasable budget", async () => {
    let budget = 1;
    const traffic: ModuleTrafficAdmissionPort = {
      admit: async () => {
        let released = false;
        return {
          admitted: true,
          release: async () => {
            if (released) return;
            released = true;
            budget -= 1;
            if (budget < 0) throw new Error("budget underflow");
          },
        };
      },
    };
    const eligibility: ModuleEligibilityPort = {
      requireEligible: async () => snapshot,
      isSnapshotCurrent: async () => false,
    };
    const guard = new ModuleInvocationGuard(traffic, eligibility);
    await expect(
      guard.invokeMutation(context, async () => "bad"),
    ).rejects.toMatchObject({ code: "STALE_MODULE_ACCESS" });
    expect(budget).toBe(0);
  });

  it("release adapter failure never overwrites a completed domain result", async () => {
    const guard = new ModuleInvocationGuard(
      {
        admit: async () => ({
          admitted: true,
          release: async () => {
            throw new Error("release failed");
          },
        }),
      },
      {
        requireEligible: async () => snapshot,
        isSnapshotCurrent: async () => true,
      },
    );
    await expect(
      guard.invokeMutation(context, async () => "completed"),
    ).resolves.toBe("completed");
  });
});
