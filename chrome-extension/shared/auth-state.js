import { PlatformLifecycle, evaluatePlatformLifecycle, lifecycleReasonCode } from "./platform-model.js";
export function resolveAuthenticationState(snapshot, now = Date.now()) {
  const lifecycle = evaluatePlatformLifecycle(snapshot, now);
  return Object.freeze({ lifecycle, reasonCode: lifecycleReasonCode(lifecycle), authenticated: ![PlatformLifecycle.UNAUTHENTICATED, PlatformLifecycle.SESSION_EXPIRED].includes(lifecycle), actionsAllowed: lifecycle !== PlatformLifecycle.ACCOUNT_SUSPENDED && lifecycle !== PlatformLifecycle.SESSION_EXPIRED && lifecycle !== PlatformLifecycle.UNAUTHENTICATED });
}
