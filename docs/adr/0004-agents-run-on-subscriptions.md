# Agents run on subscription logins through ACP

Argo runs Sessions on the subscription the user already pays for: no Anthropic API key and no `OPENAI_API_KEY`. Spec 0009 replaces Argo's native protocol adapters with registry-discovered upstream ACP adapters behind the public ACP SDK (owner, 2026-10-09). Spec 0009 #359 removes the native package and its remaining consumers (owner, 2026-10-13). Registry metadata and SQLite selections are the catalog and launch authorities. Retained artwork lives under `packages/engine/src/agents/assets`; it supplies no second static catalog.

Engine owns one connecting promise per Agent and Project, as Zed's AgentConnectionStore does. Sessions share that process until removal, save, a newer Registry version, Retry, exit, or Engine shutdown. The Agent runs through `$SHELL -c` in the Engine process group. Its environment comes from the Project main Checkout's login shell and is cached for the Engine's life. Launch extras apply next. The one vendor module clears `ANTHROPIC_API_KEY` for the Registry Agent `claude-acp` (owner, 2026-10-15, #717).

A process exit ends each active Turn with `error` and an exit Notice containing the final contiguous stderr block. The Server collects stderr for up to 250 ms after exit. It closes the Sessions and forgets the connection. The next Send uses `session/resume`; there is no automatic reopen, retry delay or crash budget.

The Server accepts protocol version 1 or newer. `session/close` is optional. Close sends it when advertised, then drains under the five-second deadline. Error or timeout logs and releases without killing the process. Missing authenticated upstream checks remain explicit gates under #360. Scripted tests prove Argo's supplied scenarios, not authenticated upstream compatibility or descendant containment across Engine death.

## Considered Options

- Argo-owned native adapters. Superseded by Spec 0009: public upstream adapters and the SDK own protocol behavior.
- Off-the-shelf ACP adapters. Rejected earlier because paged history, Subagents and usage were incomplete; Spec 0009 accepts upstream protocol support and defines honest product outcomes for unavailable capabilities instead of maintaining another native strategy.
