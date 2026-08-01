import { lineDashboardData as data } from "./data.js";

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  return node;
}

const summary = document.querySelector("#summary");
for (const item of data.summary) {
  const card = element("article", `summary-card ${item.tone}`);
  card.append(element("span", "summary-label", item.label), element("strong", "summary-value", item.value));
  summary.append(card);
}

const hierarchy = document.querySelector("#hierarchy");
data.hierarchy.forEach((label, index) => {
  hierarchy.append(element("span", "hierarchy-node", label));
  if (index < data.hierarchy.length - 1) hierarchy.append(element("span", "hierarchy-arrow", "→"));
});

const bindingRows = document.querySelector("#binding-rows");
for (const binding of data.bindings) {
  const row = element("tr");
  for (const value of [
    binding.bindingKey,
    binding.provider,
    binding.environment,
    binding.status,
    binding.webhookUrl,
    binding.credentialStorage,
    binding.lastVerifiedResult,
  ]) row.append(element("td", "", value));
  bindingRows.append(row);
}

function renderList(selector, items, ordered = false) {
  const target = document.querySelector(selector);
  const list = element(ordered ? "ol" : "ul");
  items.forEach((item) => list.append(element("li", "", item)));
  target.append(list);
}

renderList("#usage", data.usageSteps, true);
renderList("#completed", data.completed);
renderList("#limitations", data.limitations);
renderList("#security", data.security);

const webhookField = document.querySelector("#webhook-url");
webhookField.value = data.bindings[0].webhookUrl;
document.querySelector("#health-link").href = data.healthUrl;

document.querySelector("#copy-webhook").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  try {
    await navigator.clipboard.writeText(webhookField.value);
    button.textContent = "Copied";
  } catch {
    webhookField.select();
    button.textContent = "Select to copy";
  }
  window.setTimeout(() => { button.textContent = "Copy URL"; }, 1600);
});
