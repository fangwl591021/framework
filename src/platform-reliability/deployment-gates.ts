import type { EnvironmentName } from "./models";
import { ReliabilityError } from "./models";

export interface DeploymentGateEvidence {
  readonly build: boolean;
  readonly test: boolean;
  readonly migration: boolean;
  readonly security: boolean;
  readonly backup: boolean;
  readonly stagingHealth: boolean;
  readonly productionApproval: boolean;
  readonly postDeploymentHealth: boolean;
  readonly rollback: boolean;
}

export interface DeploymentGateResult {
  readonly accepted: boolean;
  readonly target: EnvironmentName;
  readonly failedGates: readonly string[];
}

const gateNames: ReadonlyArray<keyof DeploymentGateEvidence> = [
  "build",
  "test",
  "migration",
  "security",
  "backup",
  "stagingHealth",
  "productionApproval",
  "postDeploymentHealth",
  "rollback",
];

export class DeploymentGateEvaluator {
  evaluate(
    target: EnvironmentName,
    evidence: DeploymentGateEvidence,
  ): DeploymentGateResult {
    const required = target === "production"
      ? gateNames
      : gateNames.filter(
          (gate) =>
            gate !== "productionApproval"
            && gate !== "stagingHealth"
            && gate !== "postDeploymentHealth",
        );
    const failedGates = required.filter((gate) => !evidence[gate]);
    return Object.freeze({
      accepted: failedGates.length === 0,
      target,
      failedGates,
    });
  }

  assertAccepted(
    target: EnvironmentName,
    evidence: DeploymentGateEvidence,
  ): void {
    if (!this.evaluate(target, evidence).accepted) {
      throw new ReliabilityError("RELEASE_GATE_REJECTED");
    }
  }
}
