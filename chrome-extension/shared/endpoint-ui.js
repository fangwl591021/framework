export function renderEndpointStateSafely(root, fieldSelector, buttonSelector, noteSelector, url, warn = console.warn) {
  const field = root.querySelector(fieldSelector);
  const button = root.querySelector(buttonSelector);
  const note = root.querySelector(noteSelector);

  if (field) field.value = url ?? "尚未建立";
  if (button) button.disabled = !url;
  if (note) {
    note.hidden = Boolean(url);
    note.textContent = url ? "" : "平台後端尚未提供此端點";
  }

  if (!field || !button || !note) {
    warn("Missing endpoint UI element", { fieldSelector, buttonSelector, noteSelector });
  }

  return Object.freeze({ fieldFound: Boolean(field), buttonFound: Boolean(button), noteFound: Boolean(note) });
}