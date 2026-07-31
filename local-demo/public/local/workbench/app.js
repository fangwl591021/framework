const messages = document.querySelector("#messages"),
  form = document.querySelector("#composer"),
  input = document.querySelector("#input"),
  notice = document.querySelector("#notice"),
  actor = document.querySelector("#actor");
let csrf = "",
  busy = false,
  lastRequest = null;
const flows = {
  "list-events": () => ({ text: "list events" }),
  "create-event": () => ({
    text: "create event",
    slots: {
      activity_name: "Local Community Meetup",
      start_time: Date.now() + 86400000,
      end_time: Date.now() + 90000000,
      capacity: 25,
      location: "Local Lab",
    },
  }),
  stats: () => ({
    text: "registration summary",
    slots: { event_reference: "fixture:event" },
  }),
  commission: () => ({ text: "my commission" }),
  performance: () => ({ text: "my performance" }),
  modules: () => ({ text: "available features" }),
  "disable-event": () => ({
    text: "disable event module",
    slots: { module_reference: "event_engine" },
  }),
  "enable-event": () => ({
    text: "enable event module",
    slots: { module_reference: "event_engine" },
  }),
  diagnostics: () => ({ text: "system issues today" }),
  support: () => ({
    text: "lookup support code",
    slots: { support_code: "fixture:support" },
  }),
};
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  return node;
}
function addMessage(kind, text, response) {
  const article = el(
      "article",
      `message ${kind}${response?.status === "failed" ? " error" : ""}`,
    ),
    avatar = el("div", "avatar", kind === "user" ? "YOU" : "PC"),
    bubble = el("div", "bubble");
  bubble.append(el("p", "", text));
  if (response) {
    const chips = el("div", "chips");
    [
      response.status,
      response.retryable ? "retryable" : null,
      response.supportCode,
    ]
      .filter(Boolean)
      .forEach((v) => chips.append(el("span", "", v)));
    bubble.append(chips);
    if (response.summary) {
      const card = el("div", "card"),
        dl = el("dl");
      Object.entries(response.summary)
        .slice(0, 20)
        .forEach(([key, value]) => {
          dl.append(
            el("dt", "", key),
            el(
              "dd",
              "",
              typeof value === "object" ? JSON.stringify(value) : value,
            ),
          );
        });
      card.append(dl);
      bubble.append(card);
    }
    if (response.status === "action_required" && response.choices?.length) {
      const slotForm = el("form", "slot-form");
      for (const slot of response.choices) {
        const label = el("label", "", slot.replaceAll("_", " "));
        const field = el("input");
        field.name = slot;
        field.required = true;
        field.type = ["capacity", "limit"].includes(slot)
          ? "number"
          : ["start_time", "end_time", "from", "until"].includes(slot)
            ? "datetime-local"
            : "text";
        label.append(field);
        slotForm.append(label);
      }
      const submit = el("button", "", "補齊並繼續");
      submit.type = "submit";
      slotForm.append(submit);
      slotForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const slots = Object.fromEntries(
          [...new FormData(slotForm)].map(([key, value]) => [
            key,
            ["capacity", "limit"].includes(key)
              ? Number(value)
              : ["start_time", "end_time", "from", "until"].includes(key)
                ? Date.parse(String(value))
                : String(value),
          ]),
        );
        send("continue", slots);
      });
      bubble.append(slotForm);
    } else if (
      response.choices?.length ||
      response.status === "confirmation_required"
    ) {
      const choices = el("div", "choices");
      if (response.status === "confirmation_required") {
        const yes = el("button", "", "確認執行"),
          no = el("button", "", "取消");
        yes.addEventListener("click", () => send("confirm", {}));
        no.addEventListener("click", () => send("cancel", {}));
        choices.append(yes, no);
      } else
        response.choices.forEach((choice) => {
          const btn = el("button", "", choice);
          btn.addEventListener("click", () => send(choice, {}));
          choices.append(btn);
        });
      bubble.append(choices);
    }
    if (response.retryable && lastRequest) {
      const retry = el("button", "ghost", "重試同一請求");
      retry.addEventListener("click", () =>
        send(lastRequest.text, lastRequest.slots, lastRequest.messageKey),
      );
      bubble.append(retry);
    }
  }
  article.append(avatar, bubble);
  messages.append(article);
  while (messages.children.length > 100) messages.firstElementChild?.remove();
  messages.scrollTop = messages.scrollHeight;
  return article;
}
async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(csrf ? { "X-Local-CSRF": csrf } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json();
  if (!response.ok)
    throw Object.assign(new Error(data.code || "REQUEST_FAILED"), {
      payload: data,
    });
  return data;
}
async function createSession() {
  const data = await api("/local/api/session", {
    method: "POST",
    body: JSON.stringify({ fixtureKey: actor.value }),
  });
  csrf = data.csrf;
  notice.textContent = `${data.actor} · trusted context resolved by server`;
  const details = document.querySelector("#context-details");
  details.replaceChildren();
  for (const [label, values] of Object.entries({
    Application: [data.context.application],
    Roles: data.context.roles,
    Permissions: data.context.permissions,
    Modules: data.context.modules,
  })) {
    const row = el("div", "context-row");
    row.append(
      el("strong", "", label),
      el("span", "", values.length ? values.join(" · ") : "None"),
    );
    details.append(row);
  }
}
async function runShadowComparison(text, messageKey) {
  const target = document.querySelector("#shadow-comparison"),
    enabled = document.querySelector("#shadow-enabled")?.checked;
  if (!target || !enabled) return;
  target.replaceChildren(el("span", "", "Running isolated local shadow…"));
  try {
    const data = await api("/local/api/ai-lab/simulate", {
      method: "POST",
      body: JSON.stringify({
        taskKey: "workbench.intent_resolution",
        scenario: "cache_miss_local_provider_success",
        budgetFixture: "generous",
        cacheDirective: "allow",
        text,
        idempotencyKey: `workbench-shadow:${messageKey}`,
      }),
    });
    const comparison = data.result.summary.comparison;
    target.replaceChildren();
    for (const [label, value, className] of [
      ["Deterministic", comparison.deterministicIntent || "clarification", ""],
      ["Confidence", comparison.deterministicConfidence, ""],
      ["Shadow", comparison.shadowIntent || "clarification", ""],
      ["Shadow confidence", comparison.shadowConfidence, ""],
      ["Comparison", comparison.match ? "MATCH" : "MISMATCH", comparison.match ? "" : "mismatch"],
      ["Validation", data.result.summary.validation.status, ""],
      ["Route", data.result.summary.route.provider || "shortcut", ""],
      ["Usage / cost", `${data.result.summary.usage.input_units || 0} / ${data.result.summary.usage.estimated_cost_micros || 0} μ estimate`, ""],
      ["Final authority", comparison.finalAuthority, ""],
    ]) {
      const item = el("span", className);
      item.append(el("strong", "", `${label}: `), document.createTextNode(String(value)));
      target.append(item);
    }
  } catch (error) {
    target.replaceChildren(
      el("span", "mismatch", `Shadow unavailable · ${error.payload?.supportCode || "LOCAL-SHADOW"}`),
      el("strong", "", "Final authority: deterministic_only"),
    );
  }
}
async function send(text, slots = {}, messageKey = crypto.randomUUID()) {
  if (busy || !text.trim()) return;
  busy = true;
  const request = { text: text.trim(), slots, messageKey };
  lastRequest = request;
  addMessage("user", request.text);
  const pending = addMessage("assistant", "處理中…");
  pending.classList.add("loading");
  try {
    const data = await api("/local/api/chat", {
      method: "POST",
      body: JSON.stringify(request),
    });
    pending.remove();
    addMessage("assistant", data.response.message || "已完成。", data.response);
    void runShadowComparison(request.text, request.messageKey);
  } catch (error) {
    pending.remove();
    addMessage("assistant", error.payload?.message || "操作未完成。", {
      status: "failed",
      supportCode: error.payload?.supportCode,
      retryable: true,
      choices: [],
      summary: null,
    });
  } finally {
    busy = false;
  }
}
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = input.value;
  input.value = "";
  send(value, {});
});
document.querySelectorAll("[data-flow]").forEach((button) =>
  button.addEventListener("click", () => {
    const request = flows[button.dataset.flow]();
    send(request.text, request.slots || {});
  }),
);
actor.addEventListener("change", async () => {
  csrf = "";
  await createSession();
  addMessage("assistant", "角色已切換；新的 trusted context 已由伺服器建立。");
});
document.querySelector("#reset").addEventListener("click", async () => {
  await api("/local/api/reset-conversation", { method: "POST", body: "{}" });
  messages.replaceChildren();
  addMessage("assistant", "對話已重設，正式業務資料仍保留。");
});
createSession().catch((error) => {
  notice.textContent = "請先前往 Setup 建立 Local fixtures。";
  addMessage("assistant", "Local fixture 尚未就緒。請開啟 Setup 頁面。", {
    status: "failed",
    supportCode: error.payload?.supportCode,
    retryable: false,
    choices: [],
    summary: null,
  });
});
