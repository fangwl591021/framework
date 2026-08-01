# LINE OA Platform Console

LINE OA Platform Console is a Chrome Manifest V3 side-panel extension for viewing the existing Platform Core LINE integration beside LINE Official Account Manager and LINE Chat. It presents one verified live OA binding as a product console without placing provider credentials in the browser.

## Architecture

- The full-page dashboard is the primary admin console, with grouped operations, platform, and system navigation. The Side Panel is a compact status and quick-control companion. Both shells share the same immutable product model, route registry, current OA, bounded health state, storage, API client, sanitizer, and runtime messages; storage changes synchronize without a reload.
- Content scripts run only on `manager.line.biz` and `chat.line.biz`. They send a bounded page type and allowlisted path category; they never scrape messages, people, identifiers, browser storage, cookies, or private page content.
- The background service worker opens the side panel, validates page context, stores allowlisted non-sensitive preferences, and performs an unauthenticated bounded health check against the existing sandbox Worker.
- The API client accepts only the exact Platform health endpoint. It rejects arbitrary URLs, omits credentials, enforces timeout and response-size limits, and normalizes failure reason codes.
- The live LINE Worker remains the delivery proof and is not modified or deployed by this extension.

## Permissions

| Permission | Purpose |
| --- | --- |
| `sidePanel` | Hosts the product console beside LINE pages. |
| `storage` | Saves selected view, UI preferences, bounded health summary, and bounded page context. |
| `tabs` | Opens explicitly listed secondary local tools and supports current-tab context. |
| `activeTab` | Allows the user-invoked side panel to coordinate with the active supported page. |

Host permissions include the requested LINE and Platform domains for explicit future platform integration boundaries. Content scripts are restricted to `https://manager.line.biz/*` and `https://chat.line.biz/*`; API hosts never receive content-script injection. The current API client calls only the exact unauthenticated Platform health endpoint and makes no authenticated LINE API request.

## Load unpacked

1. Run `npm.cmd run build:chrome-extension`.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Choose `dist/line-oa-platform-console`.

Click the extension action to open the side panel. If the browser does not open it automatically, select the extension and choose **Open side panel**.

The maximize button (`⛶`) is in the upper-right side-panel header, immediately left of the refresh button. It opens `dashboard/index.html` in a new Chrome tab through `chrome.runtime.getURL()` and `chrome.tabs.create()`; it never navigates or replaces the active LINE tab.

## Reload after a local change

1. Run `npm.cmd run build:chrome-extension` from the repository root.
2. Open `chrome://extensions`.
3. Find **LINE OA Platform Console** and click **Reload**.
4. Refresh any open `manager.line.biz` or `chat.line.biz` tab so its content script is current.
5. Open the extension side panel and click the `⛶` button in the header to verify the full-page dashboard.

## Test on LINE pages

1. Open `https://manager.line.biz/` and open the side panel. Home should show **LINE OA Manager** as the bounded current-page context.
2. Open `https://chat.line.biz/` and open the side panel. Home should show **LINE Chat**.
3. Open **官方帳號** and inspect `oa-primary`, then open its binding detail or copy the public webhook URL.
4. Open **訊息** to view the deterministic proof `測試` → `收到：測試`.

## Security boundaries

- Provider credential values are never requested, rendered, logged, or stored by the extension.
- `chrome.storage.local` accepts only an explicit key allowlist and rejects sensitive field names recursively.
- Content scripts send only hostname, page type, and a fixed path category.
- No chat text, customer names, identifiers, cookies, browser storage, private page data, webhook payloads, or delivery credentials are collected.
- No remote executable script, dynamic code evaluation, provider SDK, or authenticated Messaging API call exists.
- Platform operations remain routed through governed Worker/API boundaries; Workbench remains the intent, confirmation, permission, and mutation authority.

## Current limitations

One live OA binding (`oa-primary`) is active. Arbitrary OA onboarding, a governed multi-binding registry, self-service credential setup, authenticated platform operations, Production rollout, and Chrome Web Store packaging/review are not yet available. This build is not Chrome Web Store submission-ready.
