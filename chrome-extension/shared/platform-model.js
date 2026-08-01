export const PlatformLifecycle = Object.freeze({ UNAUTHENTICATED: "unauthenticated", AUTHENTICATED_WITHOUT_WORKSPACE: "authenticated_without_workspace", AUTHENTICATED_WITHOUT_BINDING: "authenticated_without_binding", BINDING_PENDING_VERIFICATION: "binding_pending_verification", ACTIVE: "active", SESSION_EXPIRED: "session_expired", ACCOUNT_SUSPENDED: "account_suspended" });
export const PlatformReasonCode = Object.freeze({ AUTH_REQUIRED: "AUTH_REQUIRED", SESSION_EXPIRED: "SESSION_EXPIRED", ACCOUNT_SUSPENDED: "ACCOUNT_SUSPENDED", WORKSPACE_REQUIRED: "WORKSPACE_REQUIRED", WORKSPACE_ACCESS_DENIED: "WORKSPACE_ACCESS_DENIED", BINDING_REQUIRED: "BINDING_REQUIRED", BINDING_PENDING: "BINDING_PENDING", INTEGRATION_ACTIVE: "INTEGRATION_ACTIVE" });
export const MembershipRole = Object.freeze({ OWNER: "owner", ADMIN: "admin", OPERATOR: "operator", VIEWER: "viewer" });

export class PlatformAccessError extends Error { constructor(reasonCode) { super(reasonCode); this.name = "PlatformAccessError"; this.reasonCode = reasonCode; } }
function freezeCollection(values = []) { return Object.freeze(values.map((value) => Object.freeze({ ...value }))); }
function normalizeName(value, limit = 80) { return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, limit) : ""; }

export function createPlatformSnapshot(value = {}) {
  return Object.freeze({
    users: freezeCollection(value.users), memberships: freezeCollection(value.memberships), workspaces: freezeCollection(value.workspaces), applications: freezeCollection(value.applications),
    lineIntegrations: freezeCollection(value.lineIntegrations), loginChannels: freezeCollection(value.loginChannels), messagingChannels: freezeCollection(value.messagingChannels), credentialReferences: freezeCollection(value.credentialReferences),
    channelBindings: freezeCollection(value.channelBindings), featureEntitlements: freezeCollection(value.featureEntitlements), verificationResults: freezeCollection(value.verificationResults), auditEvents: freezeCollection(value.auditEvents),
    session: value.session ? Object.freeze({ ...value.session }) : null,
    currentWorkspaceRef: typeof value.currentWorkspaceRef === "string" ? value.currentWorkspaceRef : null,
    currentBindingRef: typeof value.currentBindingRef === "string" ? value.currentBindingRef : null,
  });
}
export function emptyPlatformSnapshot() { return createPlatformSnapshot(); }

export function evaluatePlatformLifecycle(snapshot, now = Date.now()) {
  if (!snapshot?.session) return PlatformLifecycle.UNAUTHENTICATED;
  if (Number(snapshot.session.expiresAt) <= now) return PlatformLifecycle.SESSION_EXPIRED;
  const user = snapshot.users.find((entry) => entry.userRef === snapshot.session.userRef);
  if (!user) return PlatformLifecycle.UNAUTHENTICATED;
  if (user.status === "suspended") return PlatformLifecycle.ACCOUNT_SUSPENDED;
  const memberships = snapshot.memberships.filter((entry) => entry.userRef === user.userRef && entry.status === "active");
  if (!memberships.length) return PlatformLifecycle.AUTHENTICATED_WITHOUT_WORKSPACE;
  const workspaceRef = memberships.some((entry) => entry.workspaceRef === snapshot.currentWorkspaceRef) ? snapshot.currentWorkspaceRef : memberships[0].workspaceRef;
  const bindings = snapshot.channelBindings.filter((entry) => entry.workspaceRef === workspaceRef);
  if (!bindings.length) return PlatformLifecycle.AUTHENTICATED_WITHOUT_BINDING;
  if (!bindings.some((entry) => entry.overallStatus === "active" && entry.status === "active")) return PlatformLifecycle.BINDING_PENDING_VERIFICATION;
  return PlatformLifecycle.ACTIVE;
}

export function lifecycleReasonCode(lifecycle) {
  const map = { [PlatformLifecycle.UNAUTHENTICATED]: PlatformReasonCode.AUTH_REQUIRED, [PlatformLifecycle.AUTHENTICATED_WITHOUT_WORKSPACE]: PlatformReasonCode.WORKSPACE_REQUIRED, [PlatformLifecycle.AUTHENTICATED_WITHOUT_BINDING]: PlatformReasonCode.BINDING_REQUIRED, [PlatformLifecycle.BINDING_PENDING_VERIFICATION]: PlatformReasonCode.BINDING_PENDING, [PlatformLifecycle.ACTIVE]: PlatformReasonCode.INTEGRATION_ACTIVE, [PlatformLifecycle.SESSION_EXPIRED]: PlatformReasonCode.SESSION_EXPIRED, [PlatformLifecycle.ACCOUNT_SUSPENDED]: PlatformReasonCode.ACCOUNT_SUSPENDED };
  return map[lifecycle] ?? PlatformReasonCode.AUTH_REQUIRED;
}

export function resolveAuthorizedWorkspace(snapshot, workspaceRef) {
  if (!snapshot?.session) throw new PlatformAccessError(PlatformReasonCode.AUTH_REQUIRED);
  const membership = snapshot.memberships.find((entry) => entry.userRef === snapshot.session.userRef && entry.workspaceRef === workspaceRef && entry.status === "active");
  if (!membership) throw new PlatformAccessError(PlatformReasonCode.WORKSPACE_ACCESS_DENIED);
  const workspace = snapshot.workspaces.find((entry) => entry.workspaceRef === workspaceRef && entry.status === "active");
  if (!workspace) throw new PlatformAccessError(PlatformReasonCode.WORKSPACE_ACCESS_DENIED);
  return Object.freeze({ workspace, membership });
}

export function projectAuthenticatedPlatform(snapshot, requestedWorkspaceRef, requestedBindingRef) {
  const lifecycle = evaluatePlatformLifecycle(snapshot);
  if (lifecycle === PlatformLifecycle.UNAUTHENTICATED) throw new PlatformAccessError(PlatformReasonCode.AUTH_REQUIRED);
  if (lifecycle === PlatformLifecycle.SESSION_EXPIRED) throw new PlatformAccessError(PlatformReasonCode.SESSION_EXPIRED);
  if (lifecycle === PlatformLifecycle.ACCOUNT_SUSPENDED) throw new PlatformAccessError(PlatformReasonCode.ACCOUNT_SUSPENDED);
  const memberships = snapshot.memberships.filter((entry) => entry.userRef === snapshot.session.userRef && entry.status === "active");
  const workspaceRef = requestedWorkspaceRef ?? snapshot.currentWorkspaceRef ?? memberships[0]?.workspaceRef;
  if (!workspaceRef) throw new PlatformAccessError(PlatformReasonCode.WORKSPACE_REQUIRED);
  const { workspace, membership } = resolveAuthorizedWorkspace(snapshot, workspaceRef);
  const bindings = snapshot.channelBindings.filter((entry) => entry.workspaceRef === workspaceRef);
  if (requestedBindingRef && !bindings.some((entry) => entry.bindingRef === requestedBindingRef)) throw new PlatformAccessError(PlatformReasonCode.WORKSPACE_ACCESS_DENIED);
  const currentBinding = bindings.find((entry) => entry.bindingRef === requestedBindingRef) ?? bindings.find((entry) => entry.bindingRef === snapshot.currentBindingRef) ?? bindings[0] ?? null;
  const integration = currentBinding ? snapshot.lineIntegrations.find((entry) => entry.integrationRef === currentBinding.integrationRef) ?? null : snapshot.lineIntegrations.find((entry) => entry.workspaceRef === workspaceRef && entry.status === "draft") ?? null;
  return Object.freeze({
    lifecycle, user: snapshot.users.find((entry) => entry.userRef === snapshot.session.userRef), membership, workspace,
    applications: freezeCollection(snapshot.applications.filter((entry) => entry.workspaceRef === workspaceRef)), bindings: freezeCollection(bindings), currentBinding, integration,
    loginChannel: integration ? snapshot.loginChannels.find((entry) => entry.integrationRef === integration.integrationRef) ?? null : null,
    messagingChannel: integration ? snapshot.messagingChannels.find((entry) => entry.integrationRef === integration.integrationRef) ?? null : null,
    credentialReference: integration ? snapshot.credentialReferences.find((entry) => entry.integrationRef === integration.integrationRef) ?? null : null,
    verificationResults: freezeCollection(snapshot.verificationResults.filter((entry) => entry.workspaceRef === workspaceRef)),
    entitlements: freezeCollection(snapshot.featureEntitlements.filter((entry) => entry.workspaceRef === workspaceRef)),
    auditEvents: freezeCollection(snapshot.auditEvents.filter((entry) => entry.workspaceRef === workspaceRef)),
  });
}

export function createWorkspaceForOwner(snapshot, input, now = Date.now()) {
  if (!snapshot?.session) throw new PlatformAccessError(PlatformReasonCode.AUTH_REQUIRED);
  const name = normalizeName(input?.name);
  const businessDisplayName = normalizeName(input?.businessDisplayName);
  if (name.length < 2) throw new PlatformAccessError("WORKSPACE_NAME_INVALID");
  const ordinal = snapshot.workspaces.length + 1;
  const workspaceRef = `workspace-${String(ordinal).padStart(3, "0")}`;
  const applicationRef = `application-${String(snapshot.applications.length + 1).padStart(3, "0")}`;
  return createPlatformSnapshot({ ...snapshot,
    workspaces: [...snapshot.workspaces, { workspaceRef, name, businessDisplayName: businessDisplayName || null, status: "active" }],
    memberships: [...snapshot.memberships, { membershipRef: `membership-${ordinal}`, userRef: snapshot.session.userRef, workspaceRef, role: MembershipRole.OWNER, status: "active" }],
    applications: [...snapshot.applications, { applicationRef, workspaceRef, name: `${businessDisplayName || name} LINE Platform`, status: "active" }],
    featureEntitlements: [...snapshot.featureEntitlements, { entitlementRef: `entitlement-${ordinal}`, workspaceRef, featureKey: "line_integration", status: "included" }],
    auditEvents: [...snapshot.auditEvents, { auditRef: `audit-workspace-${ordinal}`, workspaceRef, action: "workspace_created", result: "completed", occurredAt: now }], currentWorkspaceRef: workspaceRef,
  });
}

export function saveLineIntegrationDraft(snapshot, metadata, now = Date.now()) {
  const { workspace } = resolveAuthorizedWorkspace(snapshot, metadata.workspaceRef ?? snapshot.currentWorkspaceRef);
  const application = snapshot.applications.find((entry) => entry.workspaceRef === workspace.workspaceRef && entry.status === "active");
  if (!application) throw new PlatformAccessError("APPLICATION_REQUIRED");
  const integrationRef = `integration-draft-${workspace.workspaceRef}`;
  const replace = (values, key, next) => [...values.filter((entry) => entry[key] !== next[key]), next];
  return createPlatformSnapshot({ ...snapshot,
    lineIntegrations: replace(snapshot.lineIntegrations, "integrationRef", { integrationRef, workspaceRef: workspace.workspaceRef, applicationRef: application.applicationRef, displayName: metadata.displayName, lineBotAccount: metadata.lineBotAccount, environment: metadata.environment, note: metadata.note || null, status: "draft", updatedAt: now }),
    loginChannels: replace(snapshot.loginChannels, "integrationRef", { loginChannelRef: `login-draft-${workspace.workspaceRef}`, integrationRef, workspaceRef: workspace.workspaceRef, channelId: metadata.lineLoginChannelId, callbackUrl: null, verificationStatus: "not_configured" }),
    messagingChannels: replace(snapshot.messagingChannels, "integrationRef", { messagingChannelRef: `messaging-draft-${workspace.workspaceRef}`, integrationRef, workspaceRef: workspace.workspaceRef, channelId: metadata.messagingChannelId, webhookUrl: null, messagingVerification: "not_configured", webhookVerification: "not_configured" }),
    auditEvents: [...snapshot.auditEvents, { auditRef: `audit-draft-${workspace.workspaceRef}-${now}`, workspaceRef: workspace.workspaceRef, action: "line_integration_draft_saved", result: "completed", occurredAt: now }],
  });
}
export function configureLineIntegration(snapshot, receipt, metadata, now = Date.now()) {
  const { workspace } = resolveAuthorizedWorkspace(snapshot, snapshot.currentWorkspaceRef);
  const application = snapshot.applications.find((entry) => entry.workspaceRef === workspace.workspaceRef && entry.status === "active");
  if (!application) throw new PlatformAccessError("APPLICATION_REQUIRED");
  const integrationRef = `integration-${receipt.bindingKey}`;
  const draftRefs = new Set(snapshot.lineIntegrations.filter((entry) => entry.workspaceRef === workspace.workspaceRef && entry.status === "draft").map((entry) => entry.integrationRef));
  const cleanLineIntegrations = snapshot.lineIntegrations.filter((entry) => !draftRefs.has(entry.integrationRef));
  const cleanLoginChannels = snapshot.loginChannels.filter((entry) => !draftRefs.has(entry.integrationRef));
  const cleanMessagingChannels = snapshot.messagingChannels.filter((entry) => !draftRefs.has(entry.integrationRef));
  const bindingRef = `binding-${receipt.bindingKey}`;
  const replace = (values, key, next) => [...values.filter((entry) => entry[key] !== next[key]), next];
  return createPlatformSnapshot({ ...snapshot,
    lineIntegrations: replace(cleanLineIntegrations, "integrationRef", { integrationRef, workspaceRef: workspace.workspaceRef, applicationRef: application.applicationRef, displayName: metadata.displayName, lineBotAccount: metadata.lineBotAccount, environment: metadata.environment, note: metadata.note || null, status: "pending", updatedAt: now }),
    loginChannels: replace(cleanLoginChannels, "integrationRef", { loginChannelRef: `login-${receipt.bindingKey}`, integrationRef, workspaceRef: workspace.workspaceRef, channelId: metadata.lineLoginChannelId, callbackUrl: receipt.callbackUrl, verificationStatus: receipt.loginVerification }),
    messagingChannels: replace(cleanMessagingChannels, "integrationRef", { messagingChannelRef: `messaging-${receipt.bindingKey}`, integrationRef, workspaceRef: workspace.workspaceRef, channelId: metadata.messagingChannelId, webhookUrl: receipt.webhookUrl, messagingVerification: receipt.messagingVerification, webhookVerification: receipt.webhookVerification }),
    credentialReferences: replace(snapshot.credentialReferences, "integrationRef", { credentialReference: receipt.credentialReference, integrationRef, workspaceRef: workspace.workspaceRef, credentialStatus: receipt.credentialStatus, updatedAt: now }),
    channelBindings: replace(snapshot.channelBindings, "integrationRef", { bindingRef, bindingKey: receipt.bindingKey, integrationRef, workspaceRef: workspace.workspaceRef, applicationRef: application.applicationRef, provider: "LINE", status: "pending", overallStatus: "pending_verification" }),
    verificationResults: [...snapshot.verificationResults.filter((entry) => entry.integrationRef !== integrationRef), { verificationRef: `verification-${receipt.bindingKey}`, integrationRef, workspaceRef: workspace.workspaceRef, loginStatus: receipt.loginVerification, messagingStatus: receipt.messagingVerification, webhookStatus: receipt.webhookVerification, overallStatus: "pending_verification", checkedAt: now }],
    auditEvents: [...snapshot.auditEvents, { auditRef: `audit-credential-${receipt.bindingKey}-${now}`, workspaceRef: workspace.workspaceRef, action: "line_credentials_locally_validated", result: "completed", occurredAt: now }], currentBindingRef: bindingRef,
  });
}

export function applyIntegrationVerification(snapshot, bindingRef, result, now = Date.now()) {
  const view = projectAuthenticatedPlatform(snapshot, snapshot.currentWorkspaceRef, bindingRef);
  if (!view.currentBinding || !view.integration) throw new PlatformAccessError(PlatformReasonCode.BINDING_REQUIRED);
  const integrationRef = view.integration.integrationRef;
  return createPlatformSnapshot({ ...snapshot,
    lineIntegrations: snapshot.lineIntegrations.map((entry) => entry.integrationRef === integrationRef ? { ...entry, status: result.overallStatus === "active" ? "active" : "pending", updatedAt: now } : entry),
    loginChannels: snapshot.loginChannels.map((entry) => entry.integrationRef === integrationRef ? { ...entry, verificationStatus: result.loginVerification } : entry),
    messagingChannels: snapshot.messagingChannels.map((entry) => entry.integrationRef === integrationRef ? { ...entry, messagingVerification: result.messagingVerification, webhookVerification: result.webhookVerification } : entry),
    channelBindings: snapshot.channelBindings.map((entry) => entry.bindingRef === bindingRef ? { ...entry, status: result.overallStatus === "active" ? "active" : "pending", overallStatus: result.overallStatus } : entry),
    verificationResults: snapshot.verificationResults.map((entry) => entry.integrationRef === integrationRef ? { ...entry, loginStatus: result.loginVerification, messagingStatus: result.messagingVerification, webhookStatus: result.webhookVerification, overallStatus: result.overallStatus, checkedAt: result.verifiedAt } : entry),
    auditEvents: [...snapshot.auditEvents, { auditRef: `audit-verification-${view.currentBinding.bindingKey}-${now}`, workspaceRef: view.workspace.workspaceRef, action: "line_integration_verified", result: result.overallStatus, occurredAt: now }],
  });
}

export function selectWorkspace(snapshot, workspaceRef) { resolveAuthorizedWorkspace(snapshot, workspaceRef); const binding = snapshot.channelBindings.find((entry) => entry.workspaceRef === workspaceRef); return createPlatformSnapshot({ ...snapshot, currentWorkspaceRef: workspaceRef, currentBindingRef: binding?.bindingRef ?? null }); }
export function selectBinding(snapshot, bindingRef) {
  const view = projectAuthenticatedPlatform(snapshot, snapshot.currentWorkspaceRef, bindingRef);
  if (!view.currentBinding) throw new PlatformAccessError(PlatformReasonCode.BINDING_REQUIRED);
  return createPlatformSnapshot({ ...snapshot, currentWorkspaceRef: view.workspace.workspaceRef, currentBindingRef: view.currentBinding.bindingRef });
}
export function withoutSession(snapshot) { return createPlatformSnapshot({ ...snapshot, session: null, currentWorkspaceRef: null, currentBindingRef: null }); }
