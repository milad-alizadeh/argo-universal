# Argo generates Follow-up suggestions in background Agent sessions

Argo generates Follow-up suggestions through ordinary background ACP sessions using the same Installed Agent and existing sign-in (owner, 2026-11-14). A bounded copy of recent conversation context keeps suggestion requests outside the main conversation and Feed, without provider-specific code or upstream extensions. This replaces ADR-0052’s shared-capability requirement and accepts extra Agent usage and latency for broader compatibility.
