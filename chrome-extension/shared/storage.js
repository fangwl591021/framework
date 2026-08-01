import { assertNoSensitiveFields } from "./sanitizer.js";

export const ALLOWED_STORAGE_KEYS = Object.freeze([
  "selectedView",
  "uiPreferences",
  "lastHealthSummary",
  "lastPageContext",
]);

export function validateStorageEntries(entries) {
  if (!entries || typeof entries !== "object" || Array.isArray(entries)) throw new Error("STORAGE_VALUE_INVALID");
  for (const [key, value] of Object.entries(entries)) {
    if (!ALLOWED_STORAGE_KEYS.includes(key)) throw new Error("STORAGE_KEY_NOT_ALLOWED");
    assertNoSensitiveFields(value);
  }
  return true;
}

export async function setSafeStorage(entries, storageArea = chrome.storage.local) {
  validateStorageEntries(entries);
  await storageArea.set(entries);
}

export async function getSafeStorage(keys, storageArea = chrome.storage.local) {
  const requested = Array.isArray(keys) ? keys : [keys];
  if (requested.some((key) => !ALLOWED_STORAGE_KEYS.includes(key))) throw new Error("STORAGE_KEY_NOT_ALLOWED");
  const result = await storageArea.get(requested);
  validateStorageEntries(result);
  return result;
}
