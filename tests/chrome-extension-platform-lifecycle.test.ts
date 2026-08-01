import { describe, expect, it } from "vitest";
// @ts-expect-error Chrome extension modules are intentionally plain JavaScript.
import { LOCAL_DEMO_EMAIL, LocalDevelopmentAuthAdapter, forgotPasswordPlaceholder, validateRegistration } from "../chrome-extension/shared/auth-adapter.js";
// @ts-expect-error Chrome extension modules are intentionally plain JavaScript.
import { LocalCredentialRegistrationAdapter, assertCredentialReceiptSafe, validateCredentialInput } from "../chrome-extension/shared/credential-adapter.js";
// @ts-expect-error Chrome extension modules are intentionally plain JavaScript.
import { LIVE_PLATFORM_ORIGIN, PLATFORM_ENDPOINT_CONFIGURATION, PlatformEndpointReasonCode, resolvePlatformEndpoints, validatePlatformOrigin } from "../chrome-extension/shared/platform-endpoints.js";
// @ts-expect-error Chrome extension modules are intentionally plain JavaScript.
import { LocalLineIntegrationAdapter, normalizeIntegrationInput } from "../chrome-extension/shared/integration-adapter.js";
// @ts-expect-error Chrome extension modules are intentionally plain JavaScript.
import { PlatformAccessError, PlatformLifecycle, applyIntegrationVerification, configureLineIntegration, createPlatformSnapshot, createWorkspaceForOwner, emptyPlatformSnapshot, evaluatePlatformLifecycle, lifecycleReasonCode, projectAuthenticatedPlatform, saveLineIntegrationDraft, selectBinding, selectWorkspace, withoutSession } from "../chrome-extension/shared/platform-model.js";
// @ts-expect-error Chrome extension modules are intentionally plain JavaScript.
import { serializePlatformState } from "../chrome-extension/shared/platform-store.js";
// @ts-expect-error Chrome extension modules are intentionally plain JavaScript.
import { validateStorageEntries } from "../chrome-extension/shared/storage.js";
// @ts-expect-error Chrome extension modules are intentionally plain JavaScript.
import { createLocalDemoSnapshot, localDemoPlatformData } from "../chrome-extension/shared/product-data.js";
// @ts-expect-error Chrome extension modules are intentionally plain JavaScript.
import { LocalIntegrationVerificationAdapter } from "../chrome-extension/shared/verification-adapter.js";

const TEST_NOW = Date.now() + 60_000;
const registration = { displayName: "  Tony   User  ", email: "TONY@EXAMPLE.COM", password: "LocalPass123", confirmPassword: "LocalPass123", termsAccepted: true };
const publicIntegration = { displayName: "Tony OA", lineBotAccount: "@tony.oa", environment: "sandbox", note: "Local only", lineLoginChannelId: "123456789", messagingChannelId: "987654321" };
const credentials = { lineLoginChannelSecret: "login-secret-local-value", messagingChannelSecret: "messaging-secret-local-value", channelAccessToken: "local-access-token-value-123456" };

async function authenticatedSnapshot(now = TEST_NOW) {
  const result = await new LocalDevelopmentAuthAdapter({ now: () => now }).register(registration);
  return createPlatformSnapshot({ users: [result.user], session: result.session });
}
async function workspaceSnapshot() { return createWorkspaceForOwner(await authenticatedSnapshot(), { name: "  Tony   Workspace  ", businessDisplayName: " Tony Co " }, TEST_NOW); }
async function pendingBindingSnapshot() {
  const snapshot = await workspaceSnapshot();
  const view = projectAuthenticatedPlatform(snapshot);
  const adapter = new LocalLineIntegrationAdapter(new LocalCredentialRegistrationAdapter());
  const result = await adapter.configure({ ...publicIntegration, workspaceRef: view.workspace.workspaceRef, applicationRef: view.applications[0].applicationRef }, credentials);
  return { snapshot: configureLineIntegration(snapshot, result.receipt, result.metadata, TEST_NOW), receipt: result.receipt };
}

describe("Chrome extension platform lifecycle", () => {
  it("starts unauthenticated with immutable model collections", () => {
    const snapshot = emptyPlatformSnapshot();
    expect(evaluatePlatformLifecycle(snapshot)).toBe(PlatformLifecycle.UNAUTHENTICATED);
    expect(Object.isFrozen(snapshot)).toBe(true);
    for (const key of ["users", "memberships", "workspaces", "applications", "lineIntegrations", "loginChannels", "messagingChannels", "credentialReferences", "channelBindings", "featureEntitlements", "verificationResults", "auditEvents"]) expect(Object.isFrozen(snapshot[key])).toBe(true);
  });

  it("normalizes registration and enforces password, confirmation, and terms", () => {
    expect(validateRegistration(registration)).toMatchObject({ ok: true, normalized: { displayName: "Tony User", email: "tony@example.com" } });
    expect(validateRegistration({ ...registration, password: "short", confirmPassword: "different", termsAccepted: false }).errors).toEqual(expect.arrayContaining(["PASSWORD_POLICY_FAILED", "PASSWORD_CONFIRMATION_MISMATCH", "TERMS_REQUIRED"]));
  });

  it("handles duplicate demo email deterministically", async () => {
    const result = await new LocalDevelopmentAuthAdapter().register({ ...registration, email: LOCAL_DEMO_EMAIL });
    expect(result).toEqual({ ok: false, reasonCodes: ["DUPLICATE_EMAIL"] });
  });

  it("returns only a user and opaque session after registration", async () => {
    const result = await new LocalDevelopmentAuthAdapter({ now: () => TEST_NOW }).register(registration);
    expect(result.ok).toBe(true);
    expect(result.session.sessionReference).toMatch(/^ses-/);
    expect(JSON.stringify(result)).not.toContain(registration.password);
    expect(result.session).not.toHaveProperty("credentials");
  });

  it("supports invalid, expired, and suspended local sign-in states", async () => {
    const adapter = new LocalDevelopmentAuthAdapter({ now: () => TEST_NOW });
    expect((await adapter.signIn({ email: "missing@example.com", password: "LocalPass123" }, [])).reasonCodes).toEqual(["INVALID_CREDENTIALS"]);
    const expired = await adapter.signIn({ email: LOCAL_DEMO_EMAIL, password: "LocalPass123", simulation: "expired" }, []);
    expect(evaluatePlatformLifecycle(createLocalDemoSnapshot(expired.session, expired.user), TEST_NOW)).toBe(PlatformLifecycle.SESSION_EXPIRED);
    const suspended = await adapter.signIn({ email: LOCAL_DEMO_EMAIL, password: "LocalPass123", simulation: "suspended" }, []);
    expect(evaluatePlatformLifecycle(createLocalDemoSnapshot(suspended.session, suspended.user), TEST_NOW)).toBe(PlatformLifecycle.ACCOUNT_SUSPENDED);
  });

  it("moves authenticated users without membership to workspace onboarding", async () => {
    expect(evaluatePlatformLifecycle(await authenticatedSnapshot())).toBe(PlatformLifecycle.AUTHENTICATED_WITHOUT_WORKSPACE);
    expect(lifecycleReasonCode(PlatformLifecycle.AUTHENTICATED_WITHOUT_WORKSPACE)).toBe("WORKSPACE_REQUIRED");
  });

  it("creates a normalized workspace and assigns the creator owner role", async () => {
    const snapshot = await workspaceSnapshot();
    expect(snapshot.workspaces[0]).toMatchObject({ name: "Tony Workspace", businessDisplayName: "Tony Co", status: "active" });
    expect(snapshot.memberships[0]).toMatchObject({ role: "owner", status: "active", userRef: snapshot.session.userRef, workspaceRef: snapshot.workspaces[0].workspaceRef });
    expect(evaluatePlatformLifecycle(snapshot)).toBe(PlatformLifecycle.AUTHENTICATED_WITHOUT_BINDING);
  });

  it("requires membership and denies cross-workspace projection", async () => {
    const snapshot = await workspaceSnapshot();
    const foreign = createPlatformSnapshot({ ...snapshot, workspaces: [...snapshot.workspaces, { workspaceRef: "workspace-foreign", name: "Foreign", status: "active" }] });
    expect(() => projectAuthenticatedPlatform(foreign, "workspace-foreign")).toThrowError(expect.objectContaining({ reasonCode: "WORKSPACE_ACCESS_DENIED" }));
    expect(() => selectWorkspace(foreign, "workspace-foreign")).toThrow(PlatformAccessError);
  });

  it("validates and safely saves a public integration draft only", async () => {
    const snapshot = await workspaceSnapshot(); const view = projectAuthenticatedPlatform(snapshot);
    const metadata = normalizeIntegrationInput({ ...publicIntegration, workspaceRef: view.workspace.workspaceRef, applicationRef: view.applications[0].applicationRef });
    const draft = saveLineIntegrationDraft(snapshot, metadata, TEST_NOW);
    const projected = projectAuthenticatedPlatform(draft);
    expect(projected.integration).toMatchObject({ displayName: "Tony OA", status: "draft" });
    expect(JSON.stringify(draft)).not.toMatch(/login-secret-local-value|messaging-secret-local-value|local-access-token/);
    expect(evaluatePlatformLifecycle(draft)).toBe(PlatformLifecycle.AUTHENTICATED_WITHOUT_BINDING);
  });

  it("validates all three credential values without retaining them", async () => {
    expect(validateCredentialInput(credentials)).toEqual({ ok: true, errors: [] });
    const snapshot = await workspaceSnapshot(); const view = projectAuthenticatedPlatform(snapshot);
    const receipt = await new LocalCredentialRegistrationAdapter().register({ ...credentials, ...publicIntegration, workspaceRef: view.workspace.workspaceRef, applicationRef: view.applications[0].applicationRef });
    expect(assertCredentialReceiptSafe(receipt)).toBe(true);
    expect(receipt).toMatchObject({ credentialStatus: "not_configured", callbackUrl: null, webhookUrl: null, loginVerification: "not_configured", messagingVerification: "configured", webhookVerification: "not_configured", reasonCode: "CALLBACK_ENDPOINT_NOT_CONFIGURED" });
    expect(Object.keys(receipt).sort()).toEqual(["bindingKey", "callbackUrl", "credentialReference", "credentialStatus", "loginVerification", "messagingVerification", "reasonCode", "reasonCodes", "webhookUrl", "webhookVerification"].sort());
    expect(JSON.stringify(receipt)).not.toMatch(/login-secret-local-value|messaging-secret-local-value|local-access-token/);
  });

  it("exposes only real endpoint capabilities and typed unavailable reasons", () => {
    expect(PLATFORM_ENDPOINT_CONFIGURATION).toMatchObject({ platformOrigin: LIVE_PLATFORM_ORIGIN, capabilities: { health: true, messagingWebhook: true, lineLoginCallback: false, credentialRegistration: false, dynamicBindingProvisioning: false } });
    const dynamic = resolvePlatformEndpoints("line-abc12345");
    expect(dynamic.callback).toEqual({ url: null, status: "not_configured", reasonCode: "CALLBACK_ENDPOINT_NOT_CONFIGURED" });
    expect(dynamic.webhook).toEqual({ url: null, status: "not_configured", reasonCode: "DYNAMIC_BINDING_PROVISIONING_NOT_CONFIGURED" });
    const known = resolvePlatformEndpoints("oa-primary");
    expect(known.callback.url).toBeNull();
    expect(known.webhook).toEqual({ url: `${LIVE_PLATFORM_ORIGIN}/webhook/oa-primary`, status: "verified", reasonCode: null });
  });

  it("rejects placeholder, local, private, non-HTTPS, and arbitrary origins", () => {
    for (const origin of ["https://platform.example.invalid", "http://localhost:8787", "https://127.0.0.1", "https://192.168.1.4", "http://example.com"]) expect(() => validatePlatformOrigin(origin)).toThrow(PlatformEndpointReasonCode.PLATFORM_ORIGIN_NOT_ALLOWED);
    expect(validatePlatformOrigin("http://localhost:8787", { localTesting: true })).toMatchObject({ localTesting: true, copyableProductionUrl: false });
    expect(() => new LocalCredentialRegistrationAdapter({ endpointConfiguration: { ...PLATFORM_ENDPOINT_CONFIGURATION, platformOrigin: "https://example.com" } })).toThrow(PlatformEndpointReasonCode.PLATFORM_ORIGIN_NOT_ALLOWED);
  });

  it("does not activate integration from local credential receipt alone", async () => {
    const { snapshot, receipt } = await pendingBindingSnapshot();
    expect(evaluatePlatformLifecycle(snapshot)).toBe(PlatformLifecycle.BINDING_PENDING_VERIFICATION);
    expect(receipt.callbackUrl).toBeNull(); expect(receipt.webhookUrl).toBeNull();
    const result = await new LocalIntegrationVerificationAdapter({ now: () => TEST_NOW }).verify({ credentialReference: receipt.credentialReference, bindingKey: receipt.bindingKey, callbackUrl: receipt.callbackUrl, webhookUrl: receipt.webhookUrl });
    const verified = applyIntegrationVerification(snapshot, snapshot.currentBindingRef, result, TEST_NOW);
    expect(result).toMatchObject({ loginVerification: "not_configured", messagingVerification: "configured", webhookVerification: "not_configured", overallStatus: "not_configured", reasonCode: "CALLBACK_ENDPOINT_NOT_CONFIGURED" });
    expect(evaluatePlatformLifecycle(verified)).toBe(PlatformLifecycle.BINDING_PENDING_VERIFICATION);
    expect(projectAuthenticatedPlatform(verified).currentBinding).toMatchObject({ status: "pending", overallStatus: "not_configured" });
  });

  it("removes superseded public draft records when credentials are configured", async () => {
    const base = await workspaceSnapshot(); const view = projectAuthenticatedPlatform(base);
    const metadata = normalizeIntegrationInput({ ...publicIntegration, workspaceRef: view.workspace.workspaceRef, applicationRef: view.applications[0].applicationRef });
    const draft = saveLineIntegrationDraft(base, metadata, TEST_NOW);
    const adapter = new LocalLineIntegrationAdapter(new LocalCredentialRegistrationAdapter());
    const result = await adapter.configure(metadata, credentials);
    const configured = configureLineIntegration(draft, result.receipt, result.metadata, TEST_NOW);
    expect(configured.lineIntegrations.filter((entry: { status: string }) => entry.status === "draft")).toHaveLength(0);
    expect(configured.loginChannels.some((entry: { integrationRef: string }) => entry.integrationRef.startsWith("integration-draft-"))).toBe(false);
  });

  it("rejects binding selection outside the active workspace", async () => {
    const { snapshot } = await pendingBindingSnapshot();
    const foreign = createPlatformSnapshot({ ...snapshot, channelBindings: [...snapshot.channelBindings, { ...snapshot.channelBindings[0], bindingRef: "binding-foreign", workspaceRef: "workspace-foreign" }] });
    expect(() => projectAuthenticatedPlatform(foreign, snapshot.currentWorkspaceRef, "binding-foreign")).toThrowError(expect.objectContaining({ reasonCode: "WORKSPACE_ACCESS_DENIED" }));
    expect(() => selectBinding(foreign, "binding-foreign")).toThrow(PlatformAccessError);
  });

  it("sign-out clears session and selections without deleting tenant data", async () => {
    const signedOut = withoutSession(await workspaceSnapshot());
    expect(evaluatePlatformLifecycle(signedOut)).toBe(PlatformLifecycle.UNAUTHENTICATED);
    expect(signedOut.workspaces).toHaveLength(1);
    expect(signedOut.session).toBeNull(); expect(signedOut.currentWorkspaceRef).toBeNull(); expect(signedOut.currentBindingRef).toBeNull();
  });

  it("serializes bounded safe platform state", async () => {
    const safe = serializePlatformState(await workspaceSnapshot());
    expect(() => validateStorageEntries({ platformState: safe })).not.toThrow();
    expect(JSON.stringify(safe)).not.toMatch(/LocalPass123|channelSecret|channelAccessToken/);
  });

  it.each(["password", "confirmPassword", "secret", "token", "authorization", "cookie", "replyToken", "userId", "rawBody", "rawPayload", "channelAccessToken", "channelSecret", "loginChannelSecret", "credentialValue"])("recursively rejects sensitive storage field %s", (key) => {
    expect(() => validateStorageEntries({ platformState: { users: [{ profile: { [key]: "blocked" } }] } })).toThrow("SENSITIVE_FIELD_REJECTED");
  });

  it("keeps oa-primary scoped to demo and retains only its known webhook", async () => {
    expect(localDemoPlatformData).toMatchObject({ seededDemo: true, user: { userRef: "usr-demo-local" }, workspace: { workspaceRef: "workspace-demo" }, membership: { role: "owner", workspaceRef: "workspace-demo" }, loginChannel: { callbackUrl: null, verificationStatus: "not_configured" }, messagingChannel: { webhookUrl: `${LIVE_PLATFORM_ORIGIN}/webhook/oa-primary`, webhookVerification: "verified" }, binding: { bindingKey: "oa-primary", workspaceRef: "workspace-demo", overallStatus: "not_configured" } });
    const auth = await new LocalDevelopmentAuthAdapter({ now: () => TEST_NOW }).signIn({ email: LOCAL_DEMO_EMAIL, password: "LocalPass123", simulation: "active" }, []);
    const demo = createLocalDemoSnapshot(auth.session, auth.user);
    expect(projectAuthenticatedPlatform(demo).currentBinding.bindingKey).toBe("oa-primary");
    expect(evaluatePlatformLifecycle(demo)).toBe(PlatformLifecycle.BINDING_PENDING_VERIFICATION);
    expect(JSON.stringify(emptyPlatformSnapshot())).not.toContain("oa-primary");
  });

  it("keeps forgot password as a bounded backend placeholder", () => {
    expect(forgotPasswordPlaceholder("tony@example.com")).toEqual({ ok: false, reasonCode: "BACKEND_PASSWORD_RESET_NOT_IMPLEMENTED", emailAccepted: true });
  });
});
