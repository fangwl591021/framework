export const MessageType = Object.freeze({
  PAGE_CONTEXT: "platform.page_context",
  GET_CONTEXT: "platform.get_context",
  CHECK_HEALTH: "platform.check_health",
  GET_FLOATING_WIDGET_STATE: "platform.get_floating_widget_state",
  UPDATE_FLOATING_WIDGET_PREFERENCE: "platform.update_floating_widget_preference",
  OPEN_DASHBOARD: "platform.open_dashboard",
  RETURN_TO_LINE: "platform.return_to_line",
});

export function isKnownMessage(value) {
  return Boolean(value && typeof value === "object" && Object.values(MessageType).includes(value.type));
}
