(() => {
  const category = location.pathname === "/" ? "root"
    : /^\/account(?:\/|$)/.test(location.pathname) ? "account"
      : /^\/(insight|analytics)(?:\/|$)/.test(location.pathname) ? "insights"
        : /^\/settings?(?:\/|$)/.test(location.pathname) ? "settings"
          : "other";
  chrome.runtime.sendMessage({
    type: "platform.page_context",
    context: { hostname: "manager.line.biz", pathnameCategory: category, pageType: "line_oa_manager" },
  }).catch(() => {});
})();
