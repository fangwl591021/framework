import {
  type EnvironmentName,
  ReliabilityError,
} from "./models";

const ENVIRONMENT_REFERENCE = /^env:[A-Z][A-Z0-9_]{2,79}$/;
const SECRET_REFERENCE = /^secret:[A-Z][A-Z0-9_]{2,79}$/;
const RETENTION_REFERENCE = /^policy:[a-z0-9][a-z0-9-]{2,79}$/;

export interface GoogleDriveBackupConfiguration {
  readonly providerKey: "google_drive";
  readonly folderIdReference: string;
  readonly credentialSecretReference: string;
  readonly encryptionRequired: boolean;
  readonly retentionPolicyReference: string;
  readonly enabled: boolean;
}

export interface TrustedGoogleDriveConfigurationContext {
  readonly source: "trusted_environment_configuration";
  readonly environment: EnvironmentName;
  readonly folderAuthorizationConfirmed: boolean;
}

export class GoogleDriveBackupConfigurationGuard {
  validate(
    configuration: Partial<GoogleDriveBackupConfiguration>,
    context: TrustedGoogleDriveConfigurationContext,
  ): GoogleDriveBackupConfiguration {
    if (
      configuration.providerKey !== "google_drive"
      || typeof configuration.folderIdReference !== "string"
      || !ENVIRONMENT_REFERENCE.test(configuration.folderIdReference)
      || typeof configuration.credentialSecretReference !== "string"
      || !SECRET_REFERENCE.test(configuration.credentialSecretReference)
      || typeof configuration.retentionPolicyReference !== "string"
      || !RETENTION_REFERENCE.test(configuration.retentionPolicyReference)
      || typeof configuration.encryptionRequired !== "boolean"
      || typeof configuration.enabled !== "boolean"
      || context.source !== "trusted_environment_configuration"
      || !context.folderAuthorizationConfirmed
      || (
        context.environment === "production"
        && !configuration.encryptionRequired
      )
    ) {
      throw new ReliabilityError("INVALID_BACKUP_STORAGE_CONFIGURATION");
    }

    return Object.freeze({
      providerKey: configuration.providerKey,
      folderIdReference: configuration.folderIdReference,
      credentialSecretReference: configuration.credentialSecretReference,
      encryptionRequired: configuration.encryptionRequired,
      retentionPolicyReference: configuration.retentionPolicyReference,
      enabled: configuration.enabled,
    });
  }
}
