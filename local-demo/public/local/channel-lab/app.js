const scenarios = [
  "valid_text_event",
  "invalid_signature",
  "missing_signature",
  "duplicate_replay",
  "duplicate_conflict",
  "stale_lease_completion",
  "unknown_identity",
  "suspended_identity",
  "cross_tenant_identity_mismatch",
  "unsupported_event",
  "confirmation_required",
  "confirmation_reply",
  "workbench_failure",
  "response_truncation",
  "disabled_line_adapter",
  "disabled_telegram_adapter",
];

const select = document.querySelector("#scenario");
const output = document.querySelector("#result");
const button = document.querySelector("#run");

let csrf = "";

for (const name of scenarios) {
  const option = document.createElement("option");
  option.value = name;
  option.textContent = name;
  select.append(option);
}

async function createSession() {
  const response = await fetch("/local/api/session", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fixtureKey: "operator_a" }),
  });

  const result = await response.json();

  if (!response.ok || !result.csrf) {
    throw new Error(result.code || "SESSION_FAILED");
  }

  csrf = result.csrf;
}

button.addEventListener("click", async () => {
  button.disabled = true;
  output.textContent = "Running local fixture…";

  try {
    if (!csrf) await createSession();

    const response = await fetch("/local/api/channel-lab/simulate", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-Local-CSRF": csrf,
      },
      body: JSON.stringify({ scenario: select.value }),
    });

    const value = await response.json();
    output.textContent = JSON.stringify(value, null, 2);
  } catch {
    output.textContent = "Local fixture failed safely.";
  } finally {
    button.disabled = false;
  }
});
