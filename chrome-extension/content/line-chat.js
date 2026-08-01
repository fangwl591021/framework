(() => {
  const category = location.pathname === "/" ? "root"
    : /^\/(chat|room)(?:\/|$)/.test(location.pathname) ? "chat"
      : /^\/settings?(?:\/|$)/.test(location.pathname) ? "settings"
        : "other";
  chrome.runtime.sendMessage({
    type: "platform.page_context",
    context: { hostname: "chat.line.biz", pathnameCategory: category, pageType: "line_chat" },
  }).catch(() => {});
})();
