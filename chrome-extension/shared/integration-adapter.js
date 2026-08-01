const CHANNEL_ID = /^[0-9]{6,32}$/;
const BOT_ACCOUNT = /^@[A-Za-z0-9._-]{3,32}$/;
const ENVIRONMENTS = new Set(["sandbox", "production"]);

export class IntegrationInputError extends Error {
  constructor(reasonCodes) { super(reasonCodes[0] ?? "INTEGRATION_INPUT_INVALID"); this.name = "IntegrationInputError"; this.reasonCodes = Object.freeze([...reasonCodes]); }
}

export function normalizeIntegrationInput(input) {
  const normalized = Object.freeze({
    workspaceRef: typeof input?.workspaceRef === "string" ? input.workspaceRef : "",
    applicationRef: typeof input?.applicationRef === "string" ? input.applicationRef : "",
    displayName: typeof input?.displayName === "string" ? input.displayName.trim().slice(0, 80) : "",
    lineBotAccount: typeof input?.lineBotAccount === "string" ? input.lineBotAccount.trim().slice(0, 40) : "",
    environment: ENVIRONMENTS.has(input?.environment) ? input.environment : "",
    note: typeof input?.note === "string" ? input.note.trim().slice(0, 200) : "",
    lineLoginChannelId: typeof input?.lineLoginChannelId === "string" ? input.lineLoginChannelId.trim() : "",
    messagingChannelId: typeof input?.messagingChannelId === "string" ? input.messagingChannelId.trim() : "",
  });
  const errors = [];
  if (!/^workspace-[a-z0-9-]{3,48}$/.test(normalized.workspaceRef)) errors.push("WORKSPACE_REFERENCE_INVALID");
  if (!/^application-[a-z0-9-]{3,48}$/.test(normalized.applicationRef)) errors.push("APPLICATION_REFERENCE_INVALID");
  if (normalized.displayName.length < 2) errors.push("OA_DISPLAY_NAME_INVALID");
  if (!BOT_ACCOUNT.test(normalized.lineBotAccount)) errors.push("LINE_BOT_ACCOUNT_INVALID");
  if (!normalized.environment) errors.push("ENVIRONMENT_INVALID");
  if (!CHANNEL_ID.test(normalized.lineLoginChannelId)) errors.push("LINE_LOGIN_CHANNEL_ID_INVALID");
  if (!CHANNEL_ID.test(normalized.messagingChannelId)) errors.push("MESSAGING_CHANNEL_ID_INVALID");
  if (errors.length) throw new IntegrationInputError(errors);
  return normalized;
}

/** @typedef {{configure(publicInput: object, credentialInput: object): Promise<object>}} LineIntegrationAdapter */
export class LocalLineIntegrationAdapter {
  constructor(credentialAdapter) { this.credentialAdapter = credentialAdapter; this.descriptor = Object.freeze({ adapterKey: "local_line_integration", networkUsed: false, productionAllowed: false }); }
  async configure(publicInput, credentialInput) {
    const metadata = normalizeIntegrationInput(publicInput);
    const receipt = await this.credentialAdapter.register({ ...metadata, ...credentialInput });
    return Object.freeze({ metadata, receipt });
  }
}
