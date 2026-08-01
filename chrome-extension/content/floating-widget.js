(() => {
  const WIDGET_ID = "platform-line-oa-floating-widget";
  const STORAGE_KEYS = new Set(["floatingLauncherExpanded", "floatingLauncherHiddenHosts", "platformState", "lastHealthSummary"]);

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }

  async function message(type, values = {}) {
    return chrome.runtime.sendMessage({ type, ...values });
  }

  function bounded(value, fallback, limit = 80) {
    return typeof value === "string" ? value.slice(0, limit) : fallback;
  }

  function mount() {
    if (document.getElementById(WIDGET_ID)) return;
    const host = document.createElement("div");
    host.id = WIDGET_ID;
    host.setAttribute("data-platform-floating-widget", "true");
    const shadow = host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = `
      :host{all:initial;position:fixed;right:24px;bottom:24px;z-index:2147483000;font:14px/1.45 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:#1f2937;contain:layout style paint}
      *{box-sizing:border-box}button{font:inherit;cursor:pointer}button:focus-visible{outline:3px solid rgba(6,199,85,.35);outline-offset:2px}
      .panel{width:min(360px,calc(100vw - 32px));max-height:calc(100vh - 112px);margin-bottom:10px;overflow:auto;background:#fff;border:1px solid #d9e1dd;box-shadow:0 16px 42px rgba(15,23,42,.2)}
      .panel[hidden],.pill[hidden],.restore[hidden]{display:none}.header{min-height:58px;padding:11px 13px;display:flex;align-items:center;gap:9px;border-bottom:1px solid #e5e9e7}.logo{width:34px;height:34px;display:grid;place-items:center;flex:none;border-radius:50%;background:#06c755;color:#fff;font-weight:900}.title{display:grid;min-width:0;flex:1}.title strong{font-size:14px;color:#0f172a}.title small{color:#64748b;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.header-actions{display:flex;gap:5px}.icon{width:32px;height:32px;border:1px solid #d9e1dd;background:#fff;color:#334155}.body{padding:12px 13px}.status{margin:0;border-top:1px solid #e5e9e7}.status div{min-height:38px;display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid #edf1ef}.status dt{color:#64748b}.status dd{margin:0;color:#065f46;font-weight:750}.activity{margin:12px 0;padding:10px;background:#f7faf8;border-left:3px solid #06c755}.activity span{display:block;color:#64748b;font-size:10px}.activity strong{display:block;margin-top:2px;color:#1f2937;font-size:12px}.toolbar{display:flex;align-items:center;gap:7px}.primary{min-height:42px;flex:1;border:1px solid #06c755;background:#06c755;color:#fff;font-weight:800}.refresh{width:42px;height:42px;border:1px solid #cfd8d3;background:#fff;color:#047a38}.pill{width:148px;min-height:48px;padding:5px 12px 5px 6px;display:flex;align-items:center;gap:9px;border:0;border-radius:25px;background:#065f46;color:#fff;box-shadow:0 10px 28px rgba(15,23,42,.24);font-weight:800}.pill .logo{width:36px;height:36px}.restore{width:42px;height:42px;display:grid;place-items:center;border:0;border-radius:50%;background:#06c755;color:#fff;box-shadow:0 8px 22px rgba(15,23,42,.22);font-weight:900}
      @media(max-width:520px){:host{right:16px;bottom:16px}.panel{width:min(340px,calc(100vw - 32px));max-height:calc(100vh - 92px)}}
      @media(forced-colors:active){.panel,.pill,.restore,.icon,.primary,.refresh{border:1px solid ButtonText}}
    `;

    const panel = element("section", "panel");
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "LINE OA 管理平台快捷工具");
    const header = element("header", "header");
    header.append(element("span", "logo", "L"));
    const title = element("div", "title");
    title.append(element("strong", "", "LINE OA 管理平台"));
    const currentOa = element("small", "", "尚未登入");
    currentOa.dataset.currentOa = "true";
    title.append(currentOa);
    const headerActions = element("div", "header-actions");
    const minimize = element("button", "icon", "−");
    minimize.type = "button";
    minimize.setAttribute("aria-label", "最小化 LINE OA 工具");
    const close = element("button", "icon", "×");
    close.type = "button";
    close.setAttribute("aria-label", "隱藏 LINE OA 工具");
    headerActions.append(minimize, close);
    header.append(title, headerActions);

    const body = element("div", "body");
    const status = element("dl", "status");
    const platformValue = element("dd", "", "Offline");
    const webhookValue = element("dd", "", "未驗證");
    const bindingValue = element("dd", "", "not-configured");
    [["平台狀態", platformValue], ["Webhook 驗證", webhookValue], ["目前 Binding", bindingValue]].forEach(([label, value]) => {
      const row = element("div");
      row.append(element("dt", "", label), value);
      status.append(row);
    });
    const activity = element("div", "activity");
    activity.append(element("span", "", "最新單筆活動"));
    const activityText = element("strong", "", "目前沒有活動");
    activity.append(activityText);
    const toolbar = element("div", "toolbar");
    const openDashboard = element("button", "primary", "開啟完整後台");
    openDashboard.type = "button";
    const refresh = element("button", "refresh", "↻");
    refresh.type = "button";
    refresh.setAttribute("aria-label", "更新平台狀態");
    toolbar.append(openDashboard, refresh);
    body.append(status, activity, toolbar);
    panel.append(header, body);

    const pill = element("button", "pill");
    pill.type = "button";
    pill.setAttribute("aria-label", "展開 LINE OA 工具");
    pill.setAttribute("aria-expanded", "false");
    const pillLabel = element("span", "", "登入平台");
    pill.append(element("span", "logo", "L"), pillLabel);
    const restore = element("button", "restore", "L");
    restore.type = "button";
    restore.hidden = true;
    restore.setAttribute("aria-label", "恢復 LINE OA 工具");
    restore.title = "恢復 LINE OA";
    shadow.append(style, panel, pill, restore);
    document.documentElement.append(host);

    function render(state) {
      const hidden = state?.hidden === true;
      const expanded = !hidden && state?.expanded === true;
      panel.hidden = !expanded;
      pill.hidden = hidden || expanded;
      restore.hidden = !hidden;
      pill.setAttribute("aria-expanded", String(expanded));
      const oa = bounded(state?.currentOaLabel, "尚未登入", 80);
      currentOa.textContent = oa;
      bindingValue.textContent = bounded(state?.currentBinding, "not-configured", 48);
      pillLabel.textContent = bounded(state?.launcherLabel, "登入平台", 24);
      openDashboard.textContent = bounded(state?.primaryActionLabel, "登入平台", 32);
      panel.dataset.lifecycle = bounded(state?.lifecycle, "unauthenticated", 48);
      platformValue.textContent = state?.healthStatus === "online" ? "Online" : "Offline";
      webhookValue.textContent = state?.webhookVerification === "passed" ? "已通過" : "未驗證";
      activityText.textContent = bounded(state?.latestActivity, "目前沒有活動", 120);
    }

    async function load() {
      try {
        const result = await message("platform.get_floating_widget_state");
        if (result?.ok) render(result.state);
      } catch { render(null); }
    }

    async function preference(values) {
      try {
        const result = await message("platform.update_floating_widget_preference", values);
        if (result?.ok) render(result.state);
      } catch { /* keep the current safe visual state */ }
    }

    pill.addEventListener("click", () => void preference({ expanded: true, hidden: false }));
    minimize.addEventListener("click", () => void preference({ expanded: false }));
    close.addEventListener("click", () => void preference({ expanded: false, hidden: true }));
    restore.addEventListener("click", () => void preference({ expanded: false, hidden: false }));
    openDashboard.addEventListener("click", () => void message("platform.open_dashboard", { routeId: "overview" }));
    refresh.addEventListener("click", async () => { await message("platform.check_health").catch(() => null); await load(); });
    shadow.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !panel.hidden) {
        event.preventDefault();
        void preference({ expanded: false });
        pill.focus();
      }
    });
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "local" && Object.keys(changes).some((key) => STORAGE_KEYS.has(key))) void load();
    });
    void load();
  }

  globalThis.PlatformLineFloatingWidget = Object.freeze({ mount });
})();
