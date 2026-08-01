import { LineSandboxPlanError, type LineEgressAllowlistContract } from "./models";

const pathReferencePattern = /^line_path:[a-z][a-z0-9_]{2,47}$/;
export const canonicalLineEgressAllowlistContract: LineEgressAllowlistContract = Object.freeze({
  contractVersion: 1,
  mode: "allowlist_contract_only",
  networkEnabled: false,
  hostReference: "line_messaging_api_host",
  protocol: "https",
  port: 443,
  methods: Object.freeze(["POST"] as const),
  pathReferences: Object.freeze(["line_path:reply_message", "line_path:push_message"]),
  wildcardAllowed: false,
  redirectsAllowed: false,
  source: "trusted_repository",
});

export function validateLineEgressAllowlistContract(contract: LineEgressAllowlistContract): LineEgressAllowlistContract {
  if (contract.networkEnabled !== false) throw new LineSandboxPlanError("EGRESS_NETWORK_PROHIBITED");
  const keys = ["contractVersion", "mode", "networkEnabled", "hostReference", "protocol", "port", "methods", "pathReferences", "wildcardAllowed", "redirectsAllowed", "source"];
  if (Object.keys(contract).some((key) => !keys.includes(key)) || contract.contractVersion !== 1 || contract.mode !== "allowlist_contract_only" ||
      contract.hostReference !== "line_messaging_api_host" || contract.protocol !== "https" || contract.port !== 443 || contract.methods.length !== 1 || contract.methods[0] !== "POST" ||
      contract.pathReferences.length < 1 || contract.pathReferences.length > 8 || new Set(contract.pathReferences).size !== contract.pathReferences.length ||
      contract.pathReferences.some((item) => !pathReferencePattern.test(item)) || contract.wildcardAllowed !== false || contract.redirectsAllowed !== false || contract.source !== "trusted_repository") {
    throw new LineSandboxPlanError("EGRESS_CONTRACT_INVALID");
  }
  return Object.freeze({ ...contract, methods: Object.freeze([...contract.methods]) as readonly ["POST"], pathReferences: Object.freeze([...contract.pathReferences].sort()) });
}
