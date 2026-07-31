# Local Trusted Context

瀏覽器只能送出 allowlisted fixture key：`owner_a`、`owner_b`、`member_a`、`operator_a`。Server 從 Local D1 fixture state 映射 Tenant、Application 與 Membership；請求若包含 tenantId、applicationId、membership、role 或 permission 欄位會拒絕。

Session token 使用 Web Crypto 產生，D1 只保存 SHA-256 digest；Cookie 為 HttpOnly、SameSite=Strict、限 `/local`。Mutation 同時要求 exact same-origin 與獨立 CSRF token。切換角色會建立新 session，不接受任意 ID。