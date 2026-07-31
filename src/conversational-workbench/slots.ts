import type { IntentDefinition, SlotDefinition } from "./models";
import { WorkbenchError } from "./models";
import { slotDefinitions } from "./registry";

export interface SlotCollectionState {
  readonly values: Readonly<Record<string, unknown>>;
  readonly missing: readonly string[];
}

export class SlotValidator {
  validate(definition: SlotDefinition, value: unknown): unknown {
    if (
      definition.sensitive ||
      /secret|token|password|cookie|raw_uid/i.test(definition.slotKey)
    )
      throw new WorkbenchError("INVALID_SLOT");
    if (definition.type === "integer") {
      if (
        !Number.isInteger(value) ||
        (definition.minimum !== undefined &&
          Number(value) < definition.minimum) ||
        (definition.maximum !== undefined && Number(value) > definition.maximum)
      )
        throw new WorkbenchError("INVALID_SLOT");
      return value;
    }
    if (definition.type === "boolean") {
      if (typeof value !== "boolean") throw new WorkbenchError("INVALID_SLOT");
      return value;
    }
    if (definition.type === "date" || definition.type === "datetime") {
      const parsed =
        typeof value === "number" ? value : Date.parse(String(value));
      if (!Number.isSafeInteger(parsed) || parsed < (definition.minimum ?? 0))
        throw new WorkbenchError("INVALID_SLOT");
      return parsed;
    }
    if (
      typeof value !== "string" ||
      !value.trim() ||
      value.length > (definition.maximumLength ?? 500)
    )
      throw new WorkbenchError("INVALID_SLOT");
    const normalized = value.trim();
    if (definition.values && !definition.values.includes(normalized))
      throw new WorkbenchError("INVALID_SLOT");
    if (
      definition.type === "support_code" &&
      !/^[A-Z0-9-]{6,32}$/i.test(normalized)
    )
      throw new WorkbenchError("INVALID_SLOT");
    return normalized;
  }

  collect(
    intent: IntentDefinition,
    existing: Readonly<Record<string, unknown>>,
    incoming: Readonly<Record<string, unknown>> = {},
  ): SlotCollectionState {
    const allowed = new Set([...intent.requiredSlots, ...intent.optionalSlots]);
    const values: Record<string, unknown> = { ...existing };
    for (const [key, value] of Object.entries(incoming)) {
      if (!allowed.has(key)) throw new WorkbenchError("INVALID_SLOT");
      const definition = slotDefinitions[key];
      if (!definition) throw new WorkbenchError("INVALID_SLOT");
      values[key] = this.validate(definition, value);
    }
    if (
      intent.intentKey === "event.create" &&
      values.start_time !== undefined &&
      values.end_time !== undefined &&
      Number(values.end_time) <= Number(values.start_time)
    )
      throw new WorkbenchError("INVALID_SLOT");
    return {
      values: Object.freeze(values),
      missing: intent.requiredSlots.filter((key) => values[key] === undefined),
    };
  }
}

export function missingSlotPrompt(keys: readonly string[]): string {
  return `還需要：${keys.map((key) => slotDefinitions[key]?.label ?? key).join("、")}`;
}
