# Agents sign in through ACP

Argo signs in to an Agent the way Zed does (`c403bc6`): it offers the methods the Agent lists in `initialize`, in the Agent's order, and runs the one the user picks. An `agent` method is ACP `authenticate`; a `terminal` method runs the Agent's command with the method's args and env in a terminal the Engine owns. Argo filters methods by nothing but those two types. It checks no subscription or account: the Agent says when it needs sign-in by answering `auth_required`, on an open or on a Turn, and Argo then offers its methods. There is no readiness gate before a Session opens (#717). Spec 0009 replaced Argo's native protocol adapters with registry-discovered upstream ACP adapters behind the public ACP SDK (owner, 2026-10-09; native package removed under #359). Registry metadata and SQLite selections are the catalog and launch authorities. Retained artwork lives under `packages/engine/src/agents/assets`; it supplies no second static catalog.

Only the vendor module, `packages/engine/src/agents/vendor.ts`, branches on a vendor. It clears `ANTHROPIC_API_KEY` for the Registry Agent `claude-acp`, so Claude runs on the user's subscription (owner, 2026-10-15, #717). It also holds Zed's `claude-login` output patterns, which finish that terminal sign-in before the program exits. Everywhere else branches on negotiated ACP capabilities; the oxlint `vendor-name` rule enforces this.

A sign-in belongs to one Agent and Project. Every App watching them sees it pending and can cancel it, and its finish runs the open again. A sign-in after a Turn ended `auth_required` only clears that card; the user resends. Closing a terminal method's terminal before its command exits cancels the sign-in, which counts as a failure.

Engine owns one connecting promise per Agent and Project, as Zed's AgentConnectionStore does. Sessions share that process until removal, save, a newer Registry version, Retry, exit, or Engine shutdown. The Agent runs through `$SHELL -c` in the Engine process group. Its environment comes from the Project main Checkout's login shell and is cached for the Engine's life. Launch extras apply next, then the vendor module's.

A process exit ends each active Turn with `error` and an exit Notice containing the final contiguous stderr block. The Server collects stderr for up to 250 ms after exit. It closes the Sessions and forgets the connection. An open that fails shows Failed to Launch with Retry, which opens the Session again without a Turn. The next Send uses `session/resume`; there is no automatic reopen, retry delay or crash budget.

The Server accepts protocol version 1 or newer. `session/close` is optional. Close sends it when advertised, then drains under the five-second deadline. Error or timeout logs and releases without killing the process. Missing authenticated upstream checks remain explicit gates under #360. Scripted tests prove Argo's supplied scenarios, not authenticated upstream compatibility or descendant containment across Engine death.

## Considered Options

- A subscription or account check before a Session opens. Rejected: Zed has none, and the Agent's own `auth_required` is the only reliable signal.
- Filtering methods to the ones Argo prefers. Rejected: the Agent's list and order are its own; Argo shows every `agent` and `terminal` method.
- Argo-owned native adapters. Superseded by Spec 0009: public upstream adapters and the SDK own protocol behavior.
- Off-the-shelf ACP adapters. Rejected earlier because paged history, Subagents and usage were incomplete; Spec 0009 accepts upstream protocol support and defines honest product outcomes for unavailable capabilities instead of maintaining another native strategy.
