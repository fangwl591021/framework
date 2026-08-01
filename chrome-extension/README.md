# LINE OA 管理平台 Chrome Extension

這個 Manifest V3 Extension 是 Platform Core 的使用者入口。Extension-owned full-page Dashboard 是主要管理介面；`manager.line.biz` 與 `chat.line.biz` 的右下角浮動工具只提供 bounded status 與返回 Dashboard 的捷徑。Chrome native Side Panel 已移除。

## Platform lifecycle

Dashboard 由 Session、User、Membership、Workspace、Application、LINE Integration 與 Channel Binding 投影七個互斥狀態：

1. `unauthenticated`：只顯示登入／註冊。
2. `authenticated_without_workspace`：只顯示 Workspace onboarding。
3. `authenticated_without_binding`：LINE OA 串接設定成為主要畫面。
4. `binding_pending_verification`：顯示待驗證狀態，營運功能保持不可用。
5. `active`：顯示完整且 Workspace-scoped 的管理導覽。
6. `session_expired`：回到登入，不顯示平台資料。
7. `account_suspended`：停用操作，不投影 Workspace 或 LINE OA 資料。

每個 Workspace 必須由目前使用者的 active Membership 授權。角色模型為 `owner`、`admin`、`operator`、`viewer`；建立 Workspace 的使用者會成為 owner。

## Local Development Authentication

目前沒有正式 Authentication API。`LocalDevelopmentAuthAdapter` 只提供確定性本機流程，畫面會明確標示 **Local Development Authentication**。

- 註冊驗證顯示名稱、正規化 email、至少 10 字元且含字母與數字的密碼、確認密碼與條款。
- 密碼與確認密碼只存在於 submit handler 的 transient `FormData`，不會寫入 storage、URL、log、diagnostics 或 adapter result。
- Session 只含 opaque references 與期限，不含 credential。
- 忘記密碼固定回報尚需 Backend Password Reset API。
- `demo@platform.local` 是明確的本機 demo 帳號；可搭配任一符合本機密碼政策的值登入。只有這個明確登入動作會載入 `workspace-demo` 與 `oa-primary`。
- Local simulation 可驗證 active、expired 與 suspended 狀態；不代表 Production authentication security。

## One-page LINE integration setup

`LINE OA 串接` 是單一全頁表單，不是 multi-step wizard：

- 基本資料：Workspace、LINE OA 顯示名稱、LINE Bot `@` account、sandbox／production environment、選填備註。
- LINE Login：Channel ID、Channel Secret、Callback endpoint capability 與 verification status。
- Messaging API：Channel ID、Channel Secret、Channel Access Token、Webhook endpoint capability、Messaging 與 Webhook status。
- 狀態摘要：Credential、LINE Login、Messaging API、Webhook 與 Overall status，使用 `configured`、`verified`、`pending`、`failed`、`not_configured`。

`儲存草稿` 只保存公開 metadata；Secret 與 Token 會立即清除。`儲存並驗證全部` 只驗證本機輸入、產生 opaque local reference，並評估平台能力；它不會把缺少的後端端點判定為成功。已輸入的 secret/token 欄位永遠保持空白，可使用「更新憑證」與「重新驗證」重新評估。

平台能力設定只承認現有 live origin `https://platform-core-line-sandbox-live.fangwl591021.workers.dev` 的 `/health` 與 `/webhook/oa-primary`。目前沒有 LINE Login callback、dynamic webhook provisioning 或 credential registration endpoint。因此：

- Callback URL 為 `null`，畫面顯示「尚未建立」與 `CALLBACK_ENDPOINT_NOT_CONFIGURED`，Copy disabled。
- 新使用者的 Webhook URL 為 `null`，顯示 `DYNAMIC_BINDING_PROVISIONING_NOT_CONFIGURED`，Copy disabled。
- Seeded `oa-primary` 只保留已實際驗證的 live webhook；它沒有 Callback URL。
- Local credential receipt 不足以讓 Overall status 變成 `active`。
- `.invalid`、localhost、loopback、private network、non-HTTPS 與 arbitrary production origin 都 fail closed。localhost 只可在明確 local test mode 使用，且永遠不是可複製的 LINE production URL。

本次不建立 callback、dynamic webhook 或 credential backend，也不修改 live LINE Worker。

## Data and security boundary

本機 immutable snapshot 為未來多 Workspace／多 OA 準備，包含 User、Membership、Workspace、Application、LineIntegration、LoginChannel、MessagingChannel、CredentialReference、ChannelBinding、FeatureEntitlement、Session、VerificationResult 與 AuditEvent。

- 所有 Workspace projection 都要求目前 User 的 active Membership；跨 Workspace 與跨 Binding access fail closed。
- `chrome.storage` 只接受 allowlisted UI/context/health keys 與 bounded safe platform snapshot。
- 遞迴檢查拒絕 password、secret、token、authorization、cookie、replyToken、userId、rawBody、rawPayload、channelAccessToken、channelSecret、loginChannelSecret 與 credentialValue。
- Credential adapter 只回傳 status、opaque references、generated URLs 與 verification states。
- 所有 Extension executable code 為本機檔案；沒有 CDN、remote script、`eval` 或 `new Function`。
- Content scripts 只送出 allowlisted host、page type 與 path category，不讀聊天內容、客戶名稱、LINE identifiers、Cookie 或 host storage。
- Live LINE Worker、Remote D1、production Binding、Secret 與 Deployment 均未修改。

## Navigation

Active 狀態才顯示完整導覽：營運中心、自動化、內容工具、平台管理與帳戶。尚未完成或尚未取得 entitlement 的功能會保持 disabled 並顯示原因，不會宣稱已可用。

浮動工具會將七種 lifecycle 映射為：登入平台、建立工作區、完成 LINE 串接、等待驗證、目前 OA、重新登入、帳號停權。它仍使用 closed Shadow DOM、固定定位與 bounded runtime messaging。

## Backend contracts still required

正式使用前仍須另行設計、審查與實作：

- Authentication API：registration、sign-in、session refresh/revocation、password reset、account suspension。
- Workspace API：Workspace CRUD、Membership invitation、role assignment、current Workspace synchronization。
- Credential Registration API：在受治理 Secret provider 安全寫入 credential，只回傳 opaque reference；目前尚未實作。
- LINE Login Callback API：建立真實 HTTPS callback route 與 state/nonce validation。
- Dynamic Messaging Webhook Provisioning API：建立並驗證 `/webhook/<binding-key>`，包含 trusted binding resolution。
- Channel Binding／Verification API：binding lifecycle、provider verification、failure evidence。
- Entitlement／Usage API：Workspace/Application feature grants、usage accounting 與 backend enforcement。
- Audit／Idempotency API：所有 mutation 的 immutable evidence 與 replay protection。

因此目前沒有 Production authentication、任意 OA onboarding backend、正式 credential storage、真實 LINE verification 或 production deployment。

## Build and Chrome reload

1. 在 repository 執行 `npm.cmd run build:chrome-extension`。
2. 開啟 `chrome://extensions`，啟用 **Developer mode**。
3. 第一次載入：按 **Load unpacked**，選擇 `dist/line-oa-platform-console`。
4. 已載入：在 **LINE OA Platform Console** 卡片按 **Reload**。
5. 重新整理已開啟的 `https://manager.line.biz/*` 與 `https://chat.line.biz/*` 分頁，讓 content script 重新注入。
6. 點 Chrome toolbar 的 Extension icon，開啟或聚焦 full-page Dashboard。

## Permissions

- `storage`：allowlisted local state。
- `tabs`：開啟／聚焦固定 Extension Dashboard，或返回已知 LINE tab。
- `activeTab`：只在使用者觸發動作時協調目前支援頁面。

沒有新增 permission；`sidePanel` permission 與 `side_panel.default_path` 均不存在。
