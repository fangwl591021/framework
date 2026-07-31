import { describe, expect, it } from "vitest";
import {
  assertUniqueManifestKeys,
  moduleDashboardManifests,
  moduleNavigationManifests,
  ModuleAccessError,
} from "../src/application-assembly";

describe("application assembly static contracts", () => {
  it("has unique manifest keys", () =>
    expect(() => assertUniqueManifestKeys()).not.toThrow());
  it("declares four Event navigation entries", () =>
    expect(moduleNavigationManifests.event_engine).toHaveLength(4));
  it("declares five Network navigation entries", () =>
    expect(moduleNavigationManifests.business_network_engine).toHaveLength(5));
  it("orders Event navigation deterministically", () =>
    expect(moduleNavigationManifests.event_engine!.map((x) => x.order)).toEqual(
      [10, 20, 30, 40],
    ));
  it("orders Network navigation deterministically", () =>
    expect(
      moduleNavigationManifests.business_network_engine!.map((x) => x.order),
    ).toEqual([100, 110, 120, 130, 140]));
  it("requires a permission on every navigation entry", () =>
    expect(
      Object.values(moduleNavigationManifests)
        .flat()
        .every((x) => x.requiredPermission.length > 2),
    ).toBe(true));
  it("requires a feature on every navigation entry", () =>
    expect(
      Object.values(moduleNavigationManifests)
        .flat()
        .every((x) => x.requiredFeature.length > 2),
    ).toBe(true));
  it("marks navigation module controlled", () =>
    expect(
      Object.values(moduleNavigationManifests)
        .flat()
        .every((x) => x.visibility === "module_enabled"),
    ).toBe(true));
  it("provides Event dashboard manifest", () =>
    expect(moduleDashboardManifests.event_engine![0]?.cardKey).toBe(
      "event.summary",
    ));
  it("provides Network dashboard manifest", () =>
    expect(moduleDashboardManifests.business_network_engine![0]?.cardKey).toBe(
      "network.summary",
    ));
  it("does not expose Core services as purchasable manifests", () =>
    expect(Object.keys(moduleNavigationManifests)).toEqual([
      "event_engine",
      "business_network_engine",
    ]));
  it("exposes deterministic access codes", () =>
    expect(new ModuleAccessError("MODULE_NOT_ENABLED").code).toBe(
      "MODULE_NOT_ENABLED",
    ));
  it("uses internal routes", () =>
    expect(
      Object.values(moduleNavigationManifests)
        .flat()
        .every((x) => x.route.startsWith("/")),
    ).toBe(true));
  it("does not duplicate destinations within one module", () =>
    expect(
      new Set(moduleNavigationManifests.event_engine!.map((x) => x.route)).size,
    ).toBe(4));
  it("keeps dashboard summaries query-key based", () =>
    expect(
      Object.values(moduleDashboardManifests)
        .flat()
        .every((x) => x.summaryQueryKey.length > 0),
    ).toBe(true));
});
