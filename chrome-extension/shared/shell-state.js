import { sanitizeHealthResponse } from "./sanitizer.js";

export function renderSharedHealth(root, value) {
  let health;
  try { health = sanitizeHealthResponse(value); } catch { health = null; }
  const status = health && ["ok", "online"].includes(health.status) ? "Online" : "Unavailable";
  root.querySelectorAll("[data-health-state]").forEach((node) => { node.textContent = status; });
  const note = root.querySelector("#health-note");
  if (note) note.textContent = health ? "Bounded health response" : "HEALTH_OFFLINE";
}
