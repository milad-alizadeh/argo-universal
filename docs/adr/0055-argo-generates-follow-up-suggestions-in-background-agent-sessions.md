---
status: superseded by ADR-0056
---

# Argo generates Follow-up suggestions in background Agent sessions

Superseded by [ADR-0056](0056-agents-send-follow-up-suggestions-and-argo-predicts-only-as-a-fallback.md) (owner, 2026-11-17). Its background prediction remains only as ADR-0056's fallback.

Argo generates Follow-up suggestions through ordinary background ACP sessions using the same Installed Agent and existing sign-in (owner, 2026-11-14). A bounded copy of recent Session context keeps suggestion requests outside the Session and its Feed, without provider-specific code or upstream extensions. This replaces ADR-0052’s shared-capability requirement and accepts extra Agent usage and latency for broader compatibility.

Amended 2026-11-17 (owner, #2296): a background session may carry an Agent-specific `_meta` hint when other Agents ignore it and Argo does not branch on the Agent, such as `_meta.claudeCode.options.persistSession: false`, which keeps Claude from saving the prediction session.
