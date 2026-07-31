import type { Clock } from "../core/clock";
import type { UuidV7 } from "../core/uuidv7";
import type { AuditPort } from "../ports/audit-port";
import type { DeploymentGateEvidence } from "./deployment-gates";
import { DeploymentGateEvaluator } from "./deployment-gates";
import { EnvironmentGuard } from "./environment";
import {
  type EnvironmentName,
  type ReleasePreparation,
  type ReleaseRecord,
  type ReleaseStatus,
  ReliabilityError,
  type ReliabilityOperationContext,
} from "./models";
import type {
  IdempotentOperationPort,
  ReleaseRepositoryPort,
} from "./ports";

const SHA40 = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const VERSION = /^[0-9A-Za-z][0-9A-Za-z._+-]{0,79}$/;

const transitions: Readonly<Record<ReleaseStatus, readonly ReleaseStatus[]>> = {
  prepared: ["validating", "failed"],
  validating: ["approved", "failed"],
  approved: ["deploying", "failed"],
  deploying: ["healthy", "failed"],
  healthy: ["rolled_back"],
  failed: [],
  rolled_back: [],
};

export class ReleaseManager {
  constructor(
    private readonly releases: ReleaseRepositoryPort,
    private readonly idempotency: IdempotentOperationPort,
    private readonly audit: AuditPort,
    private readonly clock: Clock,
    private readonly uuidv7: UuidV7,
    private readonly environments = new EnvironmentGuard(),
    private readonly gates = new DeploymentGateEvaluator(),
  ) {}

  async prepare(
    input: ReleasePreparation,
    context: ReliabilityOperationContext,
  ): Promise<ReleaseRecord> {
    this.validatePreparation(input);
    return this.idempotency.execute("release.prepare", context, async () => {
      const previous = await this.releases.findHealthy(input.environment);
      const timestamp = this.clock.now().getTime();
      const record: ReleaseRecord = Object.freeze({
        releaseId: this.uuidv7.generate(),
        gitCommitSha: input.gitCommitSha,
        applicationVersion: input.applicationVersion,
        migrationVersion: input.migrationVersion,
        buildArtifactDigest: input.buildArtifactDigest,
        environment: input.environment,
        releaseStatus: "prepared",
        previousStableReleaseId: previous?.releaseId ?? null,
        createdAt: timestamp,
        promotedAt: null,
        rolledBackAt: null,
      });
      await this.releases.save(record);
      await this.recordAudit("release.prepare", record.releaseId, context);
      return record;
    });
  }

  async transition(
    releaseId: string,
    status: ReleaseStatus,
    context: ReliabilityOperationContext,
  ): Promise<ReleaseRecord> {
    return this.idempotency.execute(`release.${status}`, context, async () => {
      const current = await this.requireRelease(releaseId);
      if (!transitions[current.releaseStatus].includes(status)) {
        throw new ReliabilityError("INVALID_RELEASE_TRANSITION");
      }
      const updated = Object.freeze({
        ...current,
        releaseStatus: status,
      });
      await this.releases.save(updated);
      if (status === "approved") {
        await this.recordAudit("release.approve", releaseId, context);
      }
      return updated;
    });
  }

  async promote(
    releaseId: string,
    target: EnvironmentName,
    evidence: DeploymentGateEvidence,
    context: ReliabilityOperationContext,
  ): Promise<ReleaseRecord> {
    return this.idempotency.execute("release.promotion", context, async () => {
      const current = await this.requireRelease(releaseId);
      if (current.releaseStatus !== "approved") {
        throw new ReliabilityError("INVALID_RELEASE_TRANSITION");
      }
      this.environments.assertPromotion(current.environment, target);
      this.gates.assertAccepted(target, evidence);
      const previousStable = await this.releases.findHealthy(target);
      const promoted = Object.freeze({
        ...current,
        environment: target,
        releaseStatus: "deploying" as const,
        previousStableReleaseId: previousStable?.releaseId ?? null,
        promotedAt: this.clock.now().getTime(),
      });
      await this.releases.save(promoted);
      await this.recordAudit("release.promotion", releaseId, context);
      return promoted;
    });
  }

  private validatePreparation(input: ReleasePreparation): void {
    if (
      !input.workingTreeClean
      || !input.commitKnown
      || !SHA40.test(input.gitCommitSha)
      || !SHA256.test(input.buildArtifactDigest)
      || !VERSION.test(input.applicationVersion)
      || !VERSION.test(input.migrationVersion)
      || input.applicationVersion.toLowerCase() === "latest"
    ) {
      throw new ReliabilityError("INVALID_RELEASE_MANIFEST");
    }
  }

  private async requireRelease(releaseId: string): Promise<ReleaseRecord> {
    const release = await this.releases.getRelease(releaseId);
    if (!release) throw new ReliabilityError("INVALID_RELEASE_MANIFEST");
    return release;
  }

  private recordAudit(
    action: string,
    releaseId: string,
    context: ReliabilityOperationContext,
  ): Promise<void> {
    return this.audit.record({
      action,
      resourceType: "release",
      resourceId: releaseId,
      correlationId: context.correlationId,
    });
  }
}
