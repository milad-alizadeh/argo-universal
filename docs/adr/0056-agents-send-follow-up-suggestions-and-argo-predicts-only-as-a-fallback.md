---
status: accepted
---

# Agents send Follow-up suggestions, and Argo predicts only as a fallback

Accepted by the owner, 2026-11-17. This supersedes [ADR-0055](0055-argo-generates-follow-up-suggestions-in-background-agent-sessions.md) and takes up the direction of [ADR-0052](0052-agents-provide-follow-up-suggestions-through-a-shared-capability.md), which was set aside because no shared contract existed. One exists now.

ADR-0055 opens a hidden ACP session for every prediction, copies up to 20,000 characters of the Session context into it and runs a full Turn on the Suggestion model. In use, a suggestion takes seconds to tens of seconds and is often missing. A prediction is dropped without a word when it hits the 30-second limit, when the Agent calls a tool, when the reply is not clean JSON, or when the next Prompt arrives first. With six or seven Sessions running, every Turn end starts one more Agent session at the same moment, and none of them reuse the conversation's prompt cache.

Since then, ACP has drafted [Prompt Suggestions](https://agentclientprotocol.com/rfds/prompt-suggestions). In it the Agent sends `prompt_suggestions_update` to a Client that opts in with `session.promptSuggestions`, and each update replaces the Session's list. The update is in ACP's unstable schema behind `unstable_prompt_suggestions`. Claude Code already makes such a prediction after each Turn: a small request on the Session's own model that reuses its prompt cache. claude-agent-acp from 0.92 forwards it, but only to JetBrains AIR clients, as `_meta.promptSuggestions` on `session_info_update`.

## Decision

- **Argo asks every Session's Agent for suggestions.** Each Session's connection advertises `session.promptSuggestions: {}` with text only, and reads `prompt_suggestions_update` on the Session's own connection. The text of the first suggestion becomes the Turn's Follow-up suggestion, and an empty list clears it. Argo ignores the other entries and any blocks that are not text, because the Composer offers one suggestion.
- **An Agent that sends suggestions gets no background prediction.** Argo counts an Installed Agent as sending once any of its Sessions sends a `prompt_suggestions_update`, and remembers that per Agent version. A new version is learned again. Until then the fallback below runs, so an Agent that sends gets at most one prediction from each in the meantime.
- **Argo does not imitate AIR.** For Claude, Argo asks claude-agent-acp to send the standard update to any Client that advertises the capability, rather than claiming AIR's private capability to get `_meta.promptSuggestions`. Claude stays on the fallback until the adapter does.
- **The fallback stays as ADR-0055 built it, with these limits:**
  - **One prediction runs at a time across the Server.** A newer request from a Session replaces that Session's waiting one. A waiting request is dropped when its Session starts a Turn.
  - **It sends a short context:** the latest Prompt and the Agent's reply to it, up to 4,000 characters, instead of 20,000.
  - **It backs off.** After 10 suggestions in a row that the person neither accepts nor dismisses in a Session, it stops predicting there until the person accepts one.
- **Failures stay silent in the Composer.** The Server logs each dropped prediction with its reason (limit, tool call, malformed reply, replaced), so how often each happens can be measured.
- **The Suggestion model applies only to the fallback.** An Agent that sends its own suggestions chooses its own model.

## Consequences

- Argo moves to an `@agentclientprotocol/sdk` version that has the unstable Prompt Suggestions schema. The feature is still a draft, so its shape may change. Argo keeps reading it in one place.
- For Agents that send, a suggestion costs no extra process or session and arrives as the Turn ends, however many Sessions are running.
- Settings shows the Suggestion model for every Agent. For an Agent that sends its own suggestions, that choice does nothing.

## Considered options

- **Keep ADR-0055 and only tune it.** Rejected as the main path: every prediction still opens a cold session with no prompt cache. Tuning it is kept as the fallback.
- **Fork the Session with `session/fork` for each prediction.** Rejected: it avoids copying the Session context, but it still opens a new session and runs a Turn. It is a draft too, and codex-acp does not offer it.
- **Keep one warm prediction session per Session.** Rejected: six or seven more Agent sessions are held open the whole time, and each needs the Session context fed into it.
- **Claim AIR's capability to receive Claude's `_meta`.** Rejected: it is another client's private extension, and it can change with any adapter release.
- **Call a vendor's model API directly.** Rejected for the reasons in [ADR-0004](0004-agents-run-on-subscriptions.md) and ADR-0055: it needs a separate identity and provider-specific code.

## Not decided here

- Showing more than one suggestion, or suggestions that carry a `resource_link`.
- What Settings shows for the Suggestion model of an Agent that sends its own suggestions.
- Whether the fallback is turned off entirely once every Agent in common use sends suggestions.
