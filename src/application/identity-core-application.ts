import { digestIdentitySubject } from "../persistence/crypto";
import {
  DomainConflictError,
  DomainNotFoundError,
  type IdentityMapping,
  type PlatformUser,
} from "../persistence/models";
import { CoreApplicationBase, type MutationContext } from "./core-application-base";

export class IdentityCoreApplication extends CoreApplicationBase {  async createPlatformUser(
    context: MutationContext,
  ): Promise<PlatformUser> {
    const id = this.uuidv7.generate();
    const result = await this.executeIdempotent(
      { scopeType: "platform", tenantId: null },
      "platform_user.create",
      {},
      context,
      (timestamp) => ({
        result: {
          id,
          status: "active",
          mergedIntoUserId: null,
          createdAt: timestamp,
          updatedAt: timestamp,
          anonymizedAt: null,
        } satisfies PlatformUser,
        statements: [
          this.db
            .prepare(
              `INSERT INTO platform_users (
                id, status, merged_into_user_id, created_at, updated_at, anonymized_at
              ) VALUES (?1, 'active', NULL, ?2, ?2, NULL)`,
            )
            .bind(id, timestamp),
        ],
        audit: {
          action: "platform_user.create",
          resourceType: "platform_user",
          resourceReference: id,
          reasonCode: "CREATED",
        },
      }),
    );
    return result;
  }

  async changePlatformUserStatus(
    userId: string,
    status: "suspended" | "merged" | "anonymized",
    context: MutationContext,
    mergedIntoUserId?: string,
  ): Promise<PlatformUser> {
    const current = await this.repositories.platformUsers.getById(userId);
    if (!current) throw new DomainNotFoundError("platform_user");
    if (current.status === "merged" || current.status === "anonymized") {
      throw new DomainConflictError("LIFECYCLE_CONFLICT");
    }
    if (status === "merged") {
      if (!mergedIntoUserId || mergedIntoUserId === userId) {
        throw new DomainConflictError("LIFECYCLE_CONFLICT");
      }
      const target = await this.repositories.platformUsers.getById(mergedIntoUserId);
      if (!target || target.status !== "active") {
        throw new DomainConflictError("LIFECYCLE_CONFLICT");
      }
    }
    const result = await this.executeIdempotent(
      { scopeType: "platform", tenantId: null },
      `platform_user.${status}`,
      { userId, status, mergedIntoUserId: mergedIntoUserId ?? null },
      context,
      (timestamp) => ({
        result: {
          ...current,
          status,
          mergedIntoUserId: status === "merged" ? (mergedIntoUserId as string) : null,
          updatedAt: timestamp,
          anonymizedAt: status === "anonymized" ? timestamp : null,
        } satisfies PlatformUser,
        statements: [
          this.db
            .prepare(
              `UPDATE platform_users
               SET status = ?1, merged_into_user_id = ?2,
                   anonymized_at = ?3, updated_at = ?4
               WHERE id = ?5 AND status IN ('active', 'suspended')`,
            )
            .bind(
              status,
              status === "merged" ? mergedIntoUserId : null,
              status === "anonymized" ? timestamp : null,
              timestamp,
              userId,
            ),
        ],
        audit: {
          action: `platform_user.${status}`,
          resourceType: "platform_user",
          resourceReference: userId,
          reasonCode: status.toUpperCase(),
        },
      }),
    );
    return result;
  }

  async linkExternalIdentity(
    platformUserId: string,
    provider: string,
    issuerContext: string,
    subject: string,
    context: MutationContext,
  ): Promise<IdentityMapping> {
    const user = await this.repositories.platformUsers.getById(platformUserId);
    if (!user) throw new DomainNotFoundError("platform_user");
    if (user.status !== "active") {
      throw new DomainConflictError("LIFECYCLE_CONFLICT");
    }
    const keys = [this.identityKeys.current(), ...this.identityKeys.previous()];
    for (const key of keys) {
      const digest = await digestIdentitySubject(
        key,
        provider,
        issuerContext,
        subject,
      );
      const existing = await this.repositories.identities.findActive(
        provider,
        issuerContext,
        digest,
      );
      if (existing) {
        if (existing.platformUserId !== platformUserId) {
          throw new DomainConflictError("IDENTITY_ALREADY_LINKED");
        }
        return existing;
      }
    }

    const currentKey = this.identityKeys.current();
    const digest = await digestIdentitySubject(
      currentKey,
      provider,
      issuerContext,
      subject,
    );
    const id = this.uuidv7.generate();
    return this.executeIdempotent(
      { scopeType: "platform", tenantId: null },
      "identity.link",
      { platformUserId, provider, issuerContext, subjectDigest: digest },
      context,
      (timestamp) => ({
        result: {
          id,
          platformUserId,
          provider,
          issuerContext,
          subjectDigest: digest,
          digestKeyVersion: currentKey.version,
          status: "active",
        } satisfies IdentityMapping,
        statements: [
          this.db
            .prepare(
              `INSERT INTO identity_mappings (
                id, platform_user_id, provider, issuer_context, subject_digest,
                digest_key_version, status, linked_at, revoked_at, created_at, updated_at
              ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'active', ?7, NULL, ?7, ?7)`,
            )
            .bind(
              id,
              platformUserId,
              provider,
              issuerContext,
              digest,
              currentKey.version,
              timestamp,
            ),
        ],
        audit: {
          action: "identity.link",
          resourceType: "identity_mapping",
          resourceReference: id,
          reasonCode: "LINKED",
        },
      }),
    );
  }

  async resolveExternalIdentity(
    provider: string,
    issuerContext: string,
    subject: string,
  ): Promise<PlatformUser | null> {
    for (const key of [
      this.identityKeys.current(),
      ...this.identityKeys.previous(),
    ]) {
      const digest = await digestIdentitySubject(
        key,
        provider,
        issuerContext,
        subject,
      );
      const mapping = await this.repositories.identities.findActive(
        provider,
        issuerContext,
        digest,
      );
      if (mapping) {
        return this.repositories.platformUsers.getById(mapping.platformUserId);
      }
    }
    return null;
  }

}
