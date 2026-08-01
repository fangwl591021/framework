export const DraftStatus = Object.freeze({ EMPTY: "empty", SAVED: "saved" });
export const SensitiveInputStatus = Object.freeze({ EMPTY: "empty", ENTERED_IN_CURRENT_SESSION: "entered_in_current_session", CLEARED_AFTER_SUBMISSION: "cleared_after_submission" });
export const CredentialStorageStatus = Object.freeze({ NOT_CONFIGURED: "not_configured", BACKEND_UNAVAILABLE: "backend_unavailable", SECURELY_STORED: "securely_stored" });

const STATUS_LABELS = Object.freeze({
  empty: "尚未儲存",
  saved: "草稿已儲存",
  entered_in_current_session: "本次工作階段已輸入",
  cleared_after_submission: "送出後已清除",
  not_configured: "尚未建立",
  backend_unavailable: "後端尚未開放",
  securely_stored: "安全儲存完成",
  configured: "等待驗證",
  pending: "等待驗證",
  pending_verification: "等待驗證",
  verified: "驗證成功",
  active: "驗證成功",
  failed: "驗證失敗",
});

export function localizedIntegrationStatus(status) {
  return STATUS_LABELS[status] ?? "尚未建立";
}

export function resolveCredentialStorageStatus(credentialReference, credentialRegistrationAvailable) {
  if (!credentialRegistrationAvailable) return CredentialStorageStatus.BACKEND_UNAVAILABLE;
  if (credentialReference?.credentialStorageStatus === CredentialStorageStatus.SECURELY_STORED && typeof credentialReference.credentialReference === "string" && credentialReference.credentialReference.length > 0) return CredentialStorageStatus.SECURELY_STORED;
  return CredentialStorageStatus.NOT_CONFIGURED;
}
