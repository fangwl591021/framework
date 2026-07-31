const page = document.body.dataset.page,
  actor = document.querySelector("#actor"),
  notice = document.querySelector("#notice"),
  trustedContext = document.querySelector("#trusted-context");
let csrf = "";

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  return node;
}

function safeValue(value) {
  if (value === null || value === undefined) return "not available";
  if (Array.isArray(value)) return value.map(safeValue).join(" - ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function renderData(target, values) {
  if (!target) return;
  target.replaceChildren();
  for (const [key, value] of Object.entries(values || {})) {
    const row = el("div", "data-row");
    row.append(el("span", "", key), el("strong", "", safeValue(value)));
    target.append(row);
  }
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(options.body - { "Content-Type": "application/json" } : {}),
      ...(csrf - { "X-Local-CSRF": csrf } : {}),
      ...(options.headers || {}),
    },
  });
  const type = response.headers.get("Content-Type") || "";
  const data = type.includes("application/json")
    - await response.json()
    : { code: "NON_JSON_RESPONSE" };
  if (!response.ok)
    throw Object.assign(new Error(data.code || "REQUEST_FAILED"), {
      payload: data,
    });
  return data;
}

async function createSession() {
  const result = await api("/local/api/session", {
    method: "POST",
    body: JSON.stringify({ fixtureKey: actor.value }),
  });
  csrf = result.csrf;
  const context = result.context;
  trustedContext.textContent = [
    context.tenant,
    context.application,
    result.actor,
    context.aiLab?.authority || "deterministic_only",
  ].join(" - ");
  return result;
}

function renderTimeline(entries) {
  const target = document.querySelector("#timeline");
  if (!target) return;
  target.replaceChildren();
  for (const entry of entries || []) {
    const item = el("li", entry.outcome);
    item.append(
      el("span"),
      el("code", "", entry.stage),
      el("small", "", entry.reasonCode),
    );
    target.append(item);
  }
}

function renderResult(result) {
  renderTimeline(result.timeline);
  renderData(document.querySelector("#comparison"), result.summary.comparison);
  renderData(document.querySelector("#route"), result.summary.route);
  const budget = result.summary.budget;
  renderData(document.querySelector("#budget-card"), {
    fixture: budget.fixture,
    decision: budget.decision,
    claimedUnits: budget.claimedUnits,
    remainingUnits: budget.remainingUnits,
    leaseExpiry: budget.leaseExpiry,
    retryAfter: budget.retryAfter,
    scopes: (budget.levels || []).map(
      (level) =>
        `${level.scope_type}:${level.used_requests}/${level.max_requests} - concurrent ${level.concurrent_claims}/${level.max_concurrent}`,
    ),
  });
  renderData(
    document.querySelector("#provider-attempt"),
    result.summary.providerAttempt,
  );
  renderData(document.querySelector("#cache-card"), result.summary.cache);
  renderData(document.querySelector("#validation"), result.summary.validation);
  renderData(document.querySelector("#usage-card"), {
    ...result.summary.usage,
    cost: result.summary.costLabel,
  });
  renderData(document.querySelector("#safe-result"), {
    requestId: result.requestId,
    status: result.status,
    replayed: result.replayed,
    supportCode: result.supportCode,
    finalAuthority: result.summary.authority.final,
    shadowCanCreatePlan: result.summary.authority.shadowCanCreatePlan,
    shadowCanInvokeTool: result.summary.authority.shadowCanInvokeTool,
    shadowCanMutate: result.summary.authority.shadowCanMutate,
    shadowCanConfirm: result.summary.authority.shadowCanConfirm,
  });
}

function renderCatalog(providers) {
  const target = document.querySelector("#catalog");
  if (!target) return;
  target.replaceChildren();
  for (const provider of providers) {
    const card = el("article", "provider-card"),
      status = el("span", "pill", provider.status);
    card.append(
      el("h3", "", provider.provider),
      status,
      el("p", "", `Adapter ${provider.adapterVersion} - ${provider.dataRegion}`),
      el("p", "", `Retention: ${provider.retentionPolicy}`),
      el("p", "", `Capabilities: ${safeValue(provider.capabilities)}`),
    );
    for (const model of provider.models || []) {
      const box = el("div", "model");
      box.append(
        el("strong", "", `${model.model}@${model.version}`),
        el("p", "", `${model.status} - quality ${model.qualityScore} - latency ${model.latencyScore}`),
        el("p", "", `Estimated unit cost ${model.estimatedUnitCostMicros} - structured ${model.structuredOutput} - tools ${model.toolCalling}`),
      );
      card.append(box);
    }
    target.append(card);
  }
}

async function loadLab() {
  const [tasks, catalog] = await Promise.all([
    api("/local/api/ai-lab/tasks"),
    api("/local/api/ai-lab/catalog"),
  ]);
  const task = document.querySelector("#task");
  task.replaceChildren();
  for (const item of tasks.tasks) {
    const option = el("option", "", item.task_key);
    option.value = item.task_key;
    option.dataset.quality = item.quality_tier;
    task.append(option);
  }
  task.value = "workbench.intent_resolution";
  const showQuality = () => {
    const selected = task.selectedOptions[0];
    document.querySelector("#quality").value = selected?.dataset.quality || "server-selected";
  };
  task.addEventListener("change", showQuality);
  showQuality();
  renderCatalog(catalog.providers);

  document.querySelector("#simulation").addEventListener("submit", async (event) => {
    event.preventDefault();
    notice.textContent = "Running local shadow simulation...";
    const button = event.submitter;
    if (button) button.disabled = true;
    try {
      const result = await api("/local/api/ai-lab/simulate", {
        method: "POST",
        body: JSON.stringify({
          taskKey: task.value,
          scenario: document.querySelector("#scenario").value,
          budgetFixture: document.querySelector("#budget").value,
          cacheDirective: document.querySelector("#cache").value,
          text: document.querySelector("#input").value,
          idempotencyKey: `local-lab:${crypto.randomUUID()}`,
        }),
      });
      renderResult(result.result);
      notice.textContent = `${result.result.status} - ${result.result.supportCode}`;
    } catch (error) {
      notice.textContent = `${error.payload?.code || "AI_LAB_FAILED"} - ${error.payload?.supportCode || "LOCAL-SUPPORT"}`;
    } finally {
      if (button) button.disabled = false;
    }
  });
  document.querySelector("#reset").addEventListener("click", async () => {
    await api("/local/api/ai-lab/reset", { method: "POST", body: "{}" });
    notice.textContent = "Local Lab evidence cleared. Immutable formal usage retained.";
    renderTimeline([]);
  });
}

async function loadRequests() {
  const result = await api("/local/api/ai-lab/requests?limit=50"),
    tbody = document.querySelector("#requests");
  tbody.replaceChildren();
  for (const item of result.requests) {
    const row = el("tr");
    for (const value of [
      new Date(item.createdAt).toLocaleString(),
      item.taskKey,
      item.scenario,
      item.status,
      item.supportCode,
    ])
      row.append(el("td", "", value));
    row.addEventListener("click", async () => {
      const detail = await api(`/local/api/ai-lab/requests/${encodeURIComponent(item.requestId)}`);
      renderData(document.querySelector("#request-detail"), {
        requestId: detail.request.requestId,
        task: detail.request.taskKey,
        scenario: detail.request.scenario,
        status: detail.request.status,
        supportCode: detail.request.supportCode,
        timeline: detail.request.timeline.map((entry) => entry.stage),
        finalAuthority: detail.request.summary.comparison?.finalAuthority,
      });
    });
    tbody.append(row);
  }
  notice.textContent = `${result.requests.length} bounded request records`;
}

function metric(label, value) {
  const card = el("article", "metric");
  card.append(el("span", "", label), el("strong", "", value ?? 0));
  return card;
}

function renderBars(target, rows) {
  target.replaceChildren();
  const max = Math.max(1, ...rows.map((row) => Number(row.requests) || 0));
  for (const row of rows) {
    const wrap = el("div", "bar-row"),
      label = el("div", "bar-label"),
      track = el("div", "bar-track"),
      fill = el("div", "bar-fill");
    label.append(el("span", "", row.label), el("strong", "", row.requests));
    fill.style.width = `${Math.max(3, (Number(row.requests) / max) * 100)}%`;
    track.append(fill);
    wrap.append(label, track);
    target.append(wrap);
  }
}

async function loadUsage() {
  const result = await api("/local/api/ai-lab/usage"),
    usage = result.usage,
    totals = usage.totals,
    target = document.querySelector("#totals");
  target.replaceChildren(
    metric("Requests", totals.requests),
    metric("Succeeded", totals.succeeded),
    metric("Cached", totals.cached),
    metric("Rejected", totals.rejected),
    metric("Fallback", totals.fallback),
    metric("Input units", totals.input_units),
    metric("Output units", totals.output_units),
    metric("Estimated cost", totals.estimated_cost_micros),
  );
  renderBars(document.querySelector("#by-task"), usage.byTask);
  renderBars(document.querySelector("#by-provider"), usage.byProvider);
  renderBars(document.querySelector("#by-outcome"), usage.byOutcome);
  notice.textContent = `${usage.scope} scope - ${usage.costLabel}`;
}

async function boot() {
  try {
    await createSession();
    if (page === "lab") await loadLab();
    if (page === "requests") await loadRequests();
    if (page === "usage") await loadUsage();
  } catch (error) {
    notice.textContent = `Setup required - ${error.payload?.supportCode || "LOCAL-AI-LAB"}`;
  }
}

actor.addEventListener("change", async () => {
  csrf = "";
  await createSession();
  if (page === "requests") await loadRequests();
  if (page === "usage") await loadUsage();
});

boot();
