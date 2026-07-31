import type { ReleaseRecord } from "./models";

export interface DependencyHealthResult {
  readonly dependency: string;
  readonly healthy: boolean;
  readonly reasonCode: string;
  readonly checkedAt: number;
}

export interface DeploymentVerificationReport {
  readonly healthy: boolean;
  readonly releaseStatus: ReleaseRecord["releaseStatus"];
  readonly dependencyCount: number;
  readonly failedDependencyCount: number;
  readonly reasonCodes: readonly string[];
}

export class ReleaseHealthEvaluator {
  evaluate(
    release: Pick<ReleaseRecord, "releaseStatus">,
    dependencies: readonly DependencyHealthResult[],
  ): DeploymentVerificationReport {
    const failures = dependencies.filter(({ healthy }) => !healthy);
    return Object.freeze({
      healthy: release.releaseStatus === "healthy" && failures.length === 0,
      releaseStatus: release.releaseStatus,
      dependencyCount: dependencies.length,
      failedDependencyCount: failures.length,
      reasonCodes: Object.freeze(failures.map(({ reasonCode }) => reasonCode)),
    });
  }

  safeOutput(report: DeploymentVerificationReport): Readonly<{
    healthy: boolean;
    releaseStatus: ReleaseRecord["releaseStatus"];
    dependencyCount: number;
    failedDependencyCount: number;
    reasonCodes: readonly string[];
  }> {
    return Object.freeze({
      healthy: report.healthy,
      releaseStatus: report.releaseStatus,
      dependencyCount: report.dependencyCount,
      failedDependencyCount: report.failedDependencyCount,
      reasonCodes: report.reasonCodes,
    });
  }
}
