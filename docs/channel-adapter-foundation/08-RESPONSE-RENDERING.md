# Response Rendering

The channel-neutral response supports bounded text, confirmation, cards, unsupported, error, and no-reply outcomes. Each renderer applies server-owned channel capabilities, output limits, and unsafe-markup rejection. Unsupported provider features degrade to a safe text or no-reply result.

No response renderer can issue a network request in this phase. Rendered output is bounded safe evidence, not a provider delivery receipt.

