import { createPlatformSnapshot, emptyPlatformSnapshot } from "./platform-model.js";
import { getSafeStorage, setSafeStorage } from "./storage.js";
const COLLECTION_KEYS = Object.freeze(["users", "memberships", "workspaces", "applications", "lineIntegrations", "loginChannels", "messagingChannels", "credentialReferences", "channelBindings", "featureEntitlements", "verificationResults", "auditEvents"]);
export function serializePlatformState(snapshot) {
  const safe = Object.fromEntries(COLLECTION_KEYS.map((key) => [key, snapshot[key]]));
  safe.session = snapshot.session; safe.currentWorkspaceRef = snapshot.currentWorkspaceRef; safe.currentBindingRef = snapshot.currentBindingRef;
  const encoded = JSON.stringify(safe); if (encoded.length > 65_536) throw new Error("PLATFORM_STATE_TOO_LARGE");
  return Object.freeze(JSON.parse(encoded));
}
export async function loadPlatformState() { const stored = await getSafeStorage(["platformState"]); return stored.platformState ? createPlatformSnapshot(stored.platformState) : emptyPlatformSnapshot(); }
export async function savePlatformState(snapshot) { const safe = serializePlatformState(snapshot); await setSafeStorage({ platformState: safe }); return createPlatformSnapshot(safe); }
