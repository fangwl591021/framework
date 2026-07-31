import { BusinessNetworkBase, type NetworkMutationContext } from "./business-network-base";
import {
  BusinessNetworkError, type BusinessRelationship, type NetworkPartner,
  type PartnerTeam, type PartnerType, type ReferralLink, type ReferralTouch,
  type RelationshipType,
} from "./models";

const ATTRIBUTION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export class PartnerReferralApplication extends BusinessNetworkBase {
  async createNetworkPartner(
    tenantId: string, actorMembershipId: string,
    input: { platformUserId: string; partnerType: PartnerType; displayName: string },
    context: NetworkMutationContext,
  ): Promise<NetworkPartner> {
    await this.requireNetworkPermission(tenantId, actorMembershipId, "networkManage");
    this.text("displayName", input.displayName, 120);
    const user = await this.repositories.platformUsers.getById(input.platformUserId);
    if (!user || user.status !== "active") throw new BusinessNetworkError("NETWORK_INVALID_STATE");
    const id = this.uuidv7.generate();
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId }, "network.partner.create", input, context,
      (now) => ({
        result: {
          id, tenantId, platformUserId: input.platformUserId, partnerType: input.partnerType,
          status: "active" as const, displayName: input.displayName, joinedAt: now,
        },
        statements: [this.db.prepare(
          `INSERT INTO network_partners (
             id, tenant_id, platform_user_id, partner_type, status, display_name,
             joined_at, created_at, updated_at
           ) VALUES (?1, ?2, ?3, ?4, 'active', ?5, ?6, ?6, ?6)`,
        ).bind(id, tenantId, input.platformUserId, input.partnerType, input.displayName, now)],
        audit: {
          action: "network.partner.create", resourceType: "network_partner",
          resourceReference: id, reasonCode: "CREATED",
        },
      }),
    );
  }

  async updateNetworkPartnerStatus(
    tenantId: string, actorMembershipId: string, partnerId: string,
    status: "suspended" | "closed", context: NetworkMutationContext,
  ): Promise<NetworkPartner> {
    await this.requireNetworkPermission(tenantId, actorMembershipId, "networkManage");
    const current = await this.requirePartner(tenantId, partnerId);
    if (current.status === "closed") throw new BusinessNetworkError("NETWORK_INVALID_STATE");
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId }, "network.partner.status",
      { partnerId, status }, context, (now) => ({
        result: { ...current, status },
        statements: [this.db.prepare(
          `UPDATE network_partners SET status = ?1, updated_at = ?2
           WHERE tenant_id = ?3 AND id = ?4 AND status <> 'closed'`,
        ).bind(status, now, tenantId, partnerId)],
        audit: {
          action: "network.partner.status", resourceType: "network_partner",
          resourceReference: partnerId, reasonCode: status.toUpperCase(),
        },
      }),
    );
  }

  async createBusinessRelationship(
    tenantId: string, actorMembershipId: string,
    input: { sourcePartnerId: string; targetPartnerId: string; relationshipType: RelationshipType },
    context: NetworkMutationContext,
  ): Promise<BusinessRelationship> {
    await this.requireNetworkPermission(tenantId, actorMembershipId, "networkManage");
    if (input.sourcePartnerId === input.targetPartnerId) {
      throw new BusinessNetworkError("NETWORK_INVALID_STATE");
    }
    await Promise.all([
      this.requirePartner(tenantId, input.sourcePartnerId, true),
      this.requirePartner(tenantId, input.targetPartnerId, true),
    ]);
    const id = this.uuidv7.generate();
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId }, "network.relationship.create", input, context,
      (now) => ({
        result: {
          id, tenantId, ...input, status: "active" as const,
          effectiveFrom: now, effectiveTo: null,
        },
        statements: [this.db.prepare(
          `INSERT INTO business_relationships (
             id, tenant_id, source_partner_id, target_partner_id, relationship_type,
             status, effective_from, effective_to, created_at, updated_at
           ) VALUES (?1, ?2, ?3, ?4, ?5, 'active', ?6, NULL, ?6, ?6)`,
        ).bind(
          id, tenantId, input.sourcePartnerId, input.targetPartnerId,
          input.relationshipType, now,
        )],
        audit: {
          action: "network.relationship.create", resourceType: "business_relationship",
          resourceReference: id, reasonCode: "CREATED",
        },
      }),
    );
  }

  async closeBusinessRelationship(
    tenantId: string, actorMembershipId: string, relationshipId: string,
    context: NetworkMutationContext,
  ): Promise<BusinessRelationship> {
    await this.requireNetworkPermission(tenantId, actorMembershipId, "networkManage");
    const current = await this.networkRepository.getRelationship(tenantId, relationshipId);
    if (!current || current.status !== "active") {
      throw new BusinessNetworkError("NETWORK_INVALID_STATE");
    }
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId }, "network.relationship.close",
      { relationshipId }, context, (now) => ({
        result: { ...current, status: "closed" as const, effectiveTo: now },
        statements: [this.db.prepare(
          `UPDATE business_relationships
           SET status = 'closed', effective_to = ?1, updated_at = ?1
           WHERE tenant_id = ?2 AND id = ?3 AND status = 'active'`,
        ).bind(now, tenantId, relationshipId)],
        audit: {
          action: "network.relationship.close", resourceType: "business_relationship",
          resourceReference: relationshipId, reasonCode: "CLOSED",
        },
      }),
    );
  }

  async createReferralLink(
    tenantId: string, actorMembershipId: string, partnerId: string,
    input: { referralCode: string; targetType: string; targetReference: string; validUntil?: number },
    context: NetworkMutationContext,
  ): Promise<ReferralLink> {
    await this.requireNetworkPermission(tenantId, actorMembershipId, "referralManage");
    await this.requirePartner(tenantId, partnerId, true);
    this.text("referralCode", input.referralCode, 80);
    this.text("targetType", input.targetType, 80);
    this.text("targetReference", input.targetReference, 255);
    const id = this.uuidv7.generate();
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId }, "network.referral_link.create",
      { partnerId, ...input }, context, (now) => ({
        result: {
          id, tenantId, partnerId, referralCode: input.referralCode,
          targetType: input.targetType, targetReference: input.targetReference,
          status: "active" as const, validFrom: now, validUntil: input.validUntil ?? null,
        },
        statements: [this.db.prepare(
          `INSERT INTO referral_links (
             id, tenant_id, partner_id, referral_code, target_type, target_reference,
             status, valid_from, valid_until, created_at, updated_at
           ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'active', ?7, ?8, ?7, ?7)`,
        ).bind(
          id, tenantId, partnerId, input.referralCode, input.targetType,
          input.targetReference, now, input.validUntil ?? null,
        )],
        audit: {
          action: "network.referral_link.create", resourceType: "referral_link",
          resourceReference: id, reasonCode: "CREATED",
        },
      }),
    );
  }

  async updateReferralLinkStatus(
    tenantId: string, actorMembershipId: string, referralLinkId: string,
    status: "suspended" | "expired" | "revoked", context: NetworkMutationContext,
  ): Promise<ReferralLink> {
    await this.requireNetworkPermission(tenantId, actorMembershipId, "referralManage");
    const current = await this.networkRepository.getReferralLink(tenantId, referralLinkId);
    if (!current || current.status !== "active") {
      throw new BusinessNetworkError("NETWORK_INVALID_STATE");
    }
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId }, "network.referral_link.status",
      { referralLinkId, status }, context, (now) => ({
        result: { ...current, status },
        statements: [this.db.prepare(
          `UPDATE referral_links SET status = ?1, updated_at = ?2
           WHERE tenant_id = ?3 AND id = ?4 AND status = 'active'`,
        ).bind(status, now, tenantId, referralLinkId)],
        audit: {
          action: "network.referral_link.status", resourceType: "referral_link",
          resourceReference: referralLinkId, reasonCode: status.toUpperCase(),
        },
      }),
    );
  }
  async recordReferralTouch(
    tenantId: string, actorMembershipId: string,
    input: {
      referralLinkId: string; visitorReference: string; sourceChannel: string; touchedAt?: number;
    },
    context: NetworkMutationContext,
  ): Promise<ReferralTouch> {
    await this.requireNetworkPermission(tenantId, actorMembershipId, "referralManage");
    const referral = await this.networkRepository.getReferralLink(tenantId, input.referralLinkId);
    if (!referral || referral.status !== "active") {
      throw new BusinessNetworkError("NETWORK_INVALID_STATE");
    }
    this.validateReference(input.visitorReference);
    this.text("sourceChannel", input.sourceChannel, 80);
    const id = this.uuidv7.generate();
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId }, "network.referral_touch.record", input, context,
      (now) => {
        const touchedAt = input.touchedAt ?? now;
        if (touchedAt < referral.validFrom || (
          referral.validUntil !== null && touchedAt > referral.validUntil
        )) throw new BusinessNetworkError("NETWORK_INVALID_STATE");
        const result = {
          id, tenantId, referralLinkId: referral.id, referrerPartnerId: referral.partnerId,
          visitorReference: "redacted", sourceChannel: input.sourceChannel,
          touchedAt, expiresAt: touchedAt + ATTRIBUTION_WINDOW_MS,
        };
        return {
          result,
          statements: [this.db.prepare(
            `INSERT INTO referral_touches (
               id, tenant_id, referral_link_id, referrer_partner_id, visitor_reference,
               source_channel, touched_at, expires_at, created_at
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
          ).bind(
            id, tenantId, referral.id, referral.partnerId, input.visitorReference,
            input.sourceChannel, touchedAt, result.expiresAt, now,
          )],
          audit: {
            action: "network.referral_touch.record", resourceType: "referral_touch",
            resourceReference: id, reasonCode: "RECORDED",
          },
        };
      },
    );
  }

  async createPartnerTeam(
    tenantId: string, actorMembershipId: string,
    input: { teamKey: string; name: string }, context: NetworkMutationContext,
  ): Promise<PartnerTeam> {
    await this.requireNetworkPermission(tenantId, actorMembershipId, "teamManage");
    this.text("teamKey", input.teamKey, 80);
    this.text("name", input.name, 120);
    const id = this.uuidv7.generate();
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId }, "network.team.create", input, context,
      (now) => ({
        result: { id, tenantId, teamKey: input.teamKey, name: input.name, status: "active" as const },
        statements: [this.db.prepare(
          `INSERT INTO partner_teams (
             id, tenant_id, team_key, name, status, created_at, updated_at
           ) VALUES (?1, ?2, ?3, ?4, 'active', ?5, ?5)`,
        ).bind(id, tenantId, input.teamKey, input.name, now)],
        audit: {
          action: "network.team.create", resourceType: "partner_team",
          resourceReference: id, reasonCode: "CREATED",
        },
      }),
    );
  }

  async addPartnerToTeam(
    tenantId: string, actorMembershipId: string, teamId: string, partnerId: string,
    roleInTeam: string, context: NetworkMutationContext,
  ): Promise<{ readonly id: string; readonly teamId: string; readonly partnerId: string }> {
    await this.requireNetworkPermission(tenantId, actorMembershipId, "teamManage");
    await this.requirePartner(tenantId, partnerId, true);
    if (!await this.networkRepository.getTeam(tenantId, teamId)) {
      throw new BusinessNetworkError("NETWORK_NOT_FOUND");
    }
    this.text("roleInTeam", roleInTeam, 80);
    const id = this.uuidv7.generate();
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId }, "network.team_member.add",
      { teamId, partnerId, roleInTeam }, context, (now) => ({
        result: { id, teamId, partnerId },
        statements: [this.db.prepare(
          `INSERT INTO partner_team_memberships (
             id, tenant_id, team_id, partner_id, role_in_team, status,
             joined_at, left_at, created_at, updated_at
           ) VALUES (?1, ?2, ?3, ?4, ?5, 'active', ?6, NULL, ?6, ?6)`,
        ).bind(id, tenantId, teamId, partnerId, roleInTeam, now)],
        audit: {
          action: "network.team_member.add", resourceType: "partner_team_membership",
          resourceReference: id, reasonCode: "ADDED",
        },
      }),
    );
  }

  private validateReference(value: string): void {
    if (!/^digest:[0-9a-f]{32,128}$/.test(value) && !/^user:[0-9a-f-]{36}$/.test(value)) {
      throw new TypeError("reference must be a digest or Platform User reference");
    }
  }
}
