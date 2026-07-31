import type { IntentResolutionResult } from "./models";
import { workbenchIntents } from "./registry";

export interface IntentResolverPort {
  resolve(text: string): Promise<IntentResolutionResult>;
}

const aliases: Readonly<Record<string, readonly string[]>> = Object.freeze({
  "event.create": [
    "我要建立活動",
    "我要辦活動",
    "建立一個活動",
    "新增活動",
    "create event",
  ],
  "event.registration_summary": [
    "我要查看活動報名狀況",
    "活動報名狀況",
    "報名統計",
    "registration summary",
  ],
  "event.list": ["活動列表", "查看活動", "list events"],
  "event.cancel": ["取消活動", "cancel event"],
  "network.my_commission": [
    "我要查我的佣金",
    "看我的佣金",
    "我這個月可以領多少",
    "my commission",
  ],
  "network.my_performance": [
    "我要查看推薦業績",
    "推薦業績",
    "我的業績",
    "my performance",
  ],
  "network.my_referrals": ["我的推薦", "推薦名單", "my referrals"],
  "module.list_available": [
    "我要查看目前可使用的功能",
    "可使用的功能",
    "可用功能",
    "available features",
  ],
  "module.enable": ["開啟活動模組", "啟用活動模組", "enable event module"],
  "module.disable": ["關閉活動模組", "停用活動模組", "disable event module"],
  "diagnostics.today_summary": [
    "我要查看今天的系統異常",
    "今天系統有問題嗎",
    "今日系統異常",
    "system issues today",
  ],
  "diagnostics.lookup_support_code": ["查詢支援碼", "lookup support code"],
});

function normalize(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[，。！？,.!?\s]+/g, "");
}

const injection =
  /(忽略|繞過).*(權限|規則)|切換.*tenant|tenantid\s*[:=]|applicationid\s*[:=]|直接.*sql|drop\s+table|internal\s*method|role\s*[:=]|permission\s*[:=]/i;

export class DeterministicIntentResolver implements IntentResolverPort {
  async resolve(text: string): Promise<IntentResolutionResult> {
    if (!text.trim() || text.length > 2000)
      return {
        status: "unsupported",
        intentKey: null,
        confidence: 0,
        choices: [],
        reasonCode: "INPUT_UNSUPPORTED",
      };
    if (injection.test(text))
      return {
        status: "security_rejected",
        intentKey: null,
        confidence: 1,
        choices: [],
        reasonCode: "COMMAND_INJECTION_REJECTED",
      };
    const input = normalize(text);
    const scores = Object.entries(aliases)
      .map(([intentKey, values]) => ({
        intentKey,
        score: Math.max(
          ...values.map((value) => {
            const alias = normalize(value);
            if (input === alias) return 1;
            if (input.includes(alias) || alias.includes(input)) return 0.8;
            const tokens = [...new Set(alias.match(/[\p{L}\p{N}]+/gu) ?? [])];
            return tokens.length
              ? (tokens.filter((token) => input.includes(token)).length /
                  tokens.length) *
                  0.6
              : 0;
          }),
        ),
      }))
      .filter((value) => value.score >= 0.55)
      .sort(
        (a, b) => b.score - a.score || a.intentKey.localeCompare(b.intentKey),
      );
    if (!scores.length)
      return {
        status: "unsupported",
        intentKey: null,
        confidence: 0,
        choices: [],
        reasonCode: "INTENT_UNSUPPORTED",
      };
    const best = scores[0];
    if (!best)
      return {
        status: "unsupported",
        intentKey: null,
        confidence: 0,
        choices: [],
        reasonCode: "INTENT_UNSUPPORTED",
      };
    const second = scores[1];
    if (second && best.score - second.score < 0.15) {
      return {
        status: "ambiguous",
        intentKey: null,
        confidence: best.score,
        choices: scores.slice(0, 3).map((x) => x.intentKey),
        reasonCode: "INTENT_AMBIGUOUS",
      };
    }
    const intent = workbenchIntents.find(
      (value) => value.intentKey === best.intentKey,
    );
    if (!intent)
      return {
        status: "unsupported",
        intentKey: null,
        confidence: 0,
        choices: [],
        reasonCode: "INTENT_NOT_ALLOWLISTED",
      };
    return {
      status: "resolved",
      intentKey: intent.intentKey,
      confidence: best.score,
      choices: [],
      reasonCode: "INTENT_RESOLVED",
    };
  }
}

export class DisabledAiIntentResolver implements IntentResolverPort {
  async resolve(): Promise<IntentResolutionResult> {
    return {
      status: "unsupported",
      intentKey: null,
      confidence: 0,
      choices: [],
      reasonCode: "AI_RESOLVER_DISABLED",
    };
  }
}
