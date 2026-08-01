import { consoleData } from "./product-data.js";
import { sanitizeHealthResponse } from "./sanitizer.js";
import { getSafeStorage, setSafeStorage } from "./storage.js";

export const DEFAULT_OA_KEY = consoleData.bindings[0].bindingKey;

export function normalizeCurrentOaKey(value) {
  return consoleData.bindings.some((binding) => binding.bindingKey === value) ? value : DEFAULT_OA_KEY;
}

export function renderCurrentOa(root, currentOaKey) {
  const normalized = normalizeCurrentOaKey(currentOaKey);
  root.querySelectorAll("[data-current-oa]").forEach((node) => { node.textContent = normalized; });
  root.querySelectorAll("select[data-current-oa-select]").forEach((select) => { select.value = normalized; });
}

export function renderSharedHealth(root, value) {
  let health;
  try { health = sanitizeHealthResponse(value); } catch { health = null; }
  const status = health?.status === "ok" ? "Online" : "Unavailable";
  root.querySelectorAll("[data-health-state]").forEach((node) => { node.textContent = status; });
  const note = root.querySelector("#health-note");
  if (note) note.textContent = health ? "Bounded health response" : "HEALTH_OFFLINE";
}

export async function initializeSharedShellState(root, storage = { get: getSafeStorage, set: setSafeStorage }) {
  const stored = await storage.get(["currentOaKey", "lastHealthSummary"]);
  const currentOaKey = normalizeCurrentOaKey(stored.currentOaKey);
  if (stored.currentOaKey !== currentOaKey) await storage.set({ currentOaKey });
  renderCurrentOa(root, currentOaKey);
  if (stored.lastHealthSummary) renderSharedHealth(root, stored.lastHealthSummary);
  return Object.freeze({ currentOaKey, health: stored.lastHealthSummary ?? null });
}

export function bindCurrentOaControls(root) {
  root.querySelectorAll("select[data-current-oa-select]").forEach((select) => {
    select.replaceChildren(...consoleData.bindings.map((binding) => {
      const option = document.createElement("option");
      option.value = binding.bindingKey;
      option.textContent = binding.bindingKey;
      return option;
    }));
    select.addEventListener("change", () => void setSafeStorage({ currentOaKey: normalizeCurrentOaKey(select.value) }));
  });
}

export function bindSharedShellSynchronization(root, { onRouteChange } = {}) {
  const listener = (changes, areaName) => {
    if (areaName !== "local") return;
    if (changes.currentOaKey) renderCurrentOa(root, changes.currentOaKey.newValue);
    if (changes.lastHealthSummary) renderSharedHealth(root, changes.lastHealthSummary.newValue);
    const route = changes.uiPreferences?.newValue?.selectedAdminRoute;
    if (route && onRouteChange) onRouteChange(route);
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
