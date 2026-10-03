# Agents run on subscription logins through the vendor protocols

Argo must run Sessions on the subscription that the user already pays for. No Anthropic API key and no `OPENAI_API_KEY`. Claude runs through the Claude Agent SDK `query()` with the Claude subscription login. Codex runs through `codex app-server` (JSON-RPC over stdio) with ChatGPT sign-in. This carries over Argo ADR-0047.

Each Agent has its own adapter in `packages/agents/<agent>/`, which carries over the two-adapter port of Argo ADR-0024. In source code, a vendor name appears only inside that folder. Test mocks in `mocks/cli/<agent>/` carry it too. Shared code branches on capabilities that an adapter registers, never on the vendor name. Claude and Codex Sessions draw the same UI.

A Claude PTY adapter is the fallback if Anthropic meters the SDK. It is not built now. ACP Agents come later as one more adapter.

## Considered Options

- The off-the-shelf ACP adapters (`@agentclientprotocol/claude-agent-acp`, `@agentclientprotocol/codex-acp`). Rejected for now: they cannot page history, they need draft protocol features for Subagents, and they drop per-Turn usage.
