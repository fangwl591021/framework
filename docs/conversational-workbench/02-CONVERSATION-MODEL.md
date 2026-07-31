# Conversation Model

Session 永久綁定 `tenantId`、`applicationId`、`actorMembershipId` 與 `channelKey`；訊息不得覆寫這些可信欄位。Active session 以 optimistic `version` 更新並具 TTL；completed、cancelled、expired 為 terminal。

Message 只保存 SHA-256 digest、resolved intent 與 bounded safe response，不保存原始對話或 Provider payload。相同可信 Context＋message key＋digest 回放原結果；相同 key 不同 digest 拒絕。完成 Session 後的重送仍可找到原 Message evidence，不重複執行 Domain mutation。
