# The Server owns the Prompt queue

A Session owns its durable, ordered Queued Prompts so prepared work survives Apps disconnecting and the Server restarting. App submission queues while a Turn runs or the queue is paused; existing Agent and Plugin Prompt callers keep their busy behavior. Queue records go through the Writer, never persisted machine snapshots (ADR-0002, ADR-0003).

Normal completion starts one Queued Prompt per Turn in current order. Stop, error and restart preserve remaining work and pause processing until Resume queue; adding work never resumes it. A Prompt that cannot start stays queued and pauses processing. Once its Turn starts it stays in the Feed on failure and is never automatically repeated. Dispatch respects the cancelled request boundary in ADR-0024, applies held configuration, runs prompt Hooks at execution time and preserves attachments and user provenance (ADR-0012).

Editing holds a Prompt at its queue position on the Server until Save or Cancel; stale Apps cannot edit a Prompt that has started. Editing leaves the Composer draft alone. Steering is distinct from queuing: it requires an adapter’s real active-Turn guidance capability and acknowledgement before removing a Prompt. Cancel-and-resend is never steering; unsupported Agents show no steering control.
