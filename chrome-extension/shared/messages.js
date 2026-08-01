export const MessageType = Object.freeze({
  PAGE_CONTEXT: "platform.page_context",
  GET_CONTEXT: "platform.get_context",
  CHECK_HEALTH: "platform.check_health",
  OPEN_PANEL: "platform.open_panel",
});

export function isKnownMessage(value) {
  return Boolean(value && typeof value === "object" && Object.values(MessageType).includes(value.type));
}
