import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DisabledAuditAdapter } from "../src/adapters/disabled-audit-adapter";
import { DisabledIdempotencyAdapter } from "../src/adapters/disabled-idempotency-adapter";
import { PersistenceUnavailableError } from "../src/core/errors";
import { authorizationBoundary } from "../src/modules/authorization";
import { coreOperationsBoundary } from "../src/modules/core-operations";
import { identityCoreBoundary } from "../src/modules/identity-core";
import type { ModuleBoundary } from "../src/modules/module-boundary";
import { tenantAccessBoundary } from "../src/modules/tenant-access";

const modules: readonly ModuleBoundary[] = [
  identityCoreBoundary,
  tenantAccessBoundary,
  authorizationBoundary,
  coreOperationsBoundary,
];

describe("Module boundary skeletons", () => {
  it("loads four approved Candidate contracts without claiming implementation", () => {
    expect(modules.map(({ id }) => id)).toEqual([
      "identity-core",
      "tenant-access",
      "authorization",
      "core-operations",
    ]);
    for (const module of modules) {
      expect(module).toMatchObject({
        lifecycle: "Candidate",
        contract: "Approved",
        implementation: "Not Implemented",
        verification: "Not Verified",
        deployment: "Not Deployed",
      });
    }
  });

  it("has no circular Module dependencies", () => {
    const graph = new Map(modules.map((module) => [module.id, module.dependencies]));
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const visit = (id: ModuleBoundary["id"]): void => {
      if (visiting.has(id)) {
        throw new Error(`Circular module dependency: ${id}`);
      }
      if (visited.has(id)) {
        return;
      }
      visiting.add(id);
      for (const dependency of graph.get(id) ?? []) {
        visit(dependency);
      }
      visiting.delete(id);
      visited.add(id);
    };

    for (const module of modules) {
      visit(module.id);
    }
    expect(visited.size).toBe(4);
  });

  it("keeps Domain Module contracts independent from Adapter implementations", () => {
    const contractPaths = [
      "../src/modules/identity-core/contract.ts",
      "../src/modules/tenant-access/contract.ts",
      "../src/modules/authorization/contract.ts",
      "../src/modules/core-operations/contract.ts",
    ];

    for (const relativePath of contractPaths) {
      const source = readFileSync(
        resolve(process.cwd(), relativePath.replace("../", "")),
        "utf8",
      );
      expect(source).not.toContain("/adapters/");
      expect(source).not.toContain("disabled-");
    }
  });
});

describe("Disabled persistence adapters", () => {
  it("fails closed for Audit persistence", async () => {
    await expect(
      new DisabledAuditAdapter().record({
        action: "test",
        resourceType: "test",
        resourceId: "test",
        correlationId: "test",
      }),
    ).rejects.toBeInstanceOf(PersistenceUnavailableError);
  });

  it("fails closed for Idempotency persistence", async () => {
    await expect(
      new DisabledIdempotencyAdapter().claim({
        operationScope: "test",
        key: "test",
        fingerprint: "test",
      }),
    ).rejects.toBeInstanceOf(PersistenceUnavailableError);
  });

  it("does not use UUIDv4 or non-cryptographic randomness for UUIDv7", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/core/uuidv7.ts"),
      "utf8",
    );
    expect(source).not.toContain("crypto.randomUUID(");
    expect(source).not.toContain("Math.random(");
    expect(source).toContain("crypto.getRandomValues(");
  });
});
