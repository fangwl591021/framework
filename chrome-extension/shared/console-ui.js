export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  return node;
}

export function bindCopyWebhook(root = document) {
  root.querySelector("#copy-webhook")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    const field = root.querySelector("#webhook-url");
    try {
      await navigator.clipboard.writeText(field.value);
      button.textContent = "已複製";
    } catch {
      field.select();
      button.textContent = "請手動複製";
    }
    setTimeout(() => { button.textContent = "複製"; }, 1500);
  });
}