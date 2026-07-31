import { AiGatewayError, type AiTaskKey, type ValidatedAiOutput } from "./models";

const forbiddenKey = /(prompt|provider|model|endpoint|url|secret|token|credential|authorization|cookie|raw.?uid|tenant.?id|application.?id|role|permission)/i;
const unsafeText = /<\/?(?:script|iframe|object)|javascript:|ignore .*permission|override .*role/i;
const allowedIntents = new Set(["event.create","event.registration_summary","event.list","event.cancel","network.my_commission","network.my_performance","network.my_referrals","module.list_available","module.enable","module.disable","diagnostics.today_summary","diagnostics.lookup_support_code"]);

export function assertSafeInput(value: Readonly<Record<string, unknown>>): void {
  const encoded = JSON.stringify(value);
  if (encoded.length > 8192 || Object.keys(value).some((key) => forbiddenKey.test(key)) || unsafeText.test(encoded)) throw new AiGatewayError("AI_INPUT_REJECTED");
}

export function validateAiOutput(taskKey: AiTaskKey, output: Readonly<Record<string, unknown>>, maxOutputUnits: number): ValidatedAiOutput {
  const encoded = JSON.stringify(output);
  if (encoded.length > Math.min(4096, maxOutputUnits * 8) || unsafeText.test(encoded)) throw new AiGatewayError("AI_OUTPUT_INVALID");
  if (taskKey === "workbench.intent_resolution") {
    const intentKey = output.intentKey;
    const confidence = typeof output.confidence === "number" ? output.confidence : 0;
    if (intentKey !== null && (typeof intentKey !== "string" || !allowedIntents.has(intentKey))) throw new AiGatewayError("AI_OUTPUT_INVALID");
    return { output, confidence, requiresClarification: confidence < 0.7 || intentKey === null };
  }
  if (typeof output.text !== "string") throw new AiGatewayError("AI_OUTPUT_INVALID");
  return { output, confidence: 1, requiresClarification: false };
}
