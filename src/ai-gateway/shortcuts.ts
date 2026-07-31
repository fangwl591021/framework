import type { AiProviderRequest } from "./models";
export interface AiShortcutResult { readonly source:"deterministic_rule"|"exact_registry"|"cache"|"knowledge"; readonly output:Readonly<Record<string,unknown>>; }
export interface AiShortcutPort { resolve(request:AiProviderRequest):Promise<AiShortcutResult|null>; }
export class DeterministicRuleShortcut implements AiShortcutPort {
  async resolve(request:AiProviderRequest):Promise<AiShortcutResult|null>{const text=String(request.input.text??"").normalize("NFKC").trim().toLowerCase();if(request.taskKey==="workbench.clarification_suggestion"&&!text)return{source:"deterministic_rule",output:{text:"請補充要執行的動作。"}};if(request.taskKey==="workbench.intent_resolution"&&["活動列表","list events"].includes(text))return{source:"exact_registry",output:{intentKey:"event.list",confidence:1,choices:[]}};return null;}
}
/** Cache persistence remains tenant-scoped inside AiGatewayRepository. */
export class CacheShortcut implements AiShortcutPort { async resolve(_request?:AiProviderRequest):Promise<AiShortcutResult|null>{return null;} }
export class DisabledKnowledgeShortcut implements AiShortcutPort { async resolve(_request?:AiProviderRequest):Promise<AiShortcutResult|null>{return null;} }
