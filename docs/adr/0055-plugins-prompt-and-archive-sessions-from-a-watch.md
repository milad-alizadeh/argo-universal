# Plugins prompt and archive Sessions from a Watch, within declared Capabilities

This amends [ADR-0030](0030-plugins-get-only-the-capabilities-their-manifest-declares.md), [ADR-0050](0050-plugin-pages-are-a-loader-and-a-pure-render.md) and [ADR-0054](0054-the-server-owns-the-prompt-queue.md) (owner, 2026-11-14, spec #2093). Until now a Plugin could only read Sessions (`sessions:read`), a Background pass ran a Loader that never writes, and nothing in Argo acted on a Session while no App was open. PR automation (Auto-fix and Auto-archive, see [ADR-0052](0052-a-plugin-supplies-pr-backed-changes-through-a-changes-slot.md)) needs a Plugin to notice a pull request change with every App closed, then prompt the Session's Agent or archive the Session. We give Plugins those two acts as narrow Capabilities and a separate entry that may use them, rather than loosening Loaders or building PR automation into core.

## Decision

- **`argo.sessions.prompt(sessionId, text)` behind the `sessions:prompt` Capability.** The Prompt's sender is `{ type: 'plugin', pluginId, title }`, never the user (ADR-0012), and the Feed shows it as the Plugin's. The Session must belong to a Project the call runs for. The call answers whether the Prompt started or was queued.
- **Plugin Prompts go through the Server's queue (amends ADR-0054).** A Plugin Prompt to a busy or paused Session is appended behind everything already queued, keeps its Plugin sender, and starts only when the queue reaches it. A paused queue holds it until the person resumes; a Plugin never resumes a queue. The App-only rule stays for the person's queue edits: a Plugin can append, never hold, move, edit or delete.
- **`argo.sessions.archive(sessionId)` behind the `sessions:archive` Capability.** It archives as the App's archive does, with no confirm tier: the person's earlier choice in the Plugin's own UI is the consent. It is refused, not queued, while a Turn runs, and the Plugin tries again on a later Watch. It never archives a Session that is not top level.
- **A Watch is a manifest entry that may act (amends ADR-0050).** `contributes.watch: { path, interval }` runs a plain function for each Project on Argo's clock, whether or not an App is open, with the same budget as a Background pass. It may read Queries, call its Plugin's Operations and use the Capabilities above. Loaders and Background passes stay read-only; a Plugin that only reads keeps using a Background pass.
- **Consent names the acts.** Turning on a Plugin that declares `sessions:prompt` or `sessions:archive` says that it may start Turns or archive Sessions in its Projects (ADR-0030). First-party Plugins are granted by Argo.
- **A Plugin's Prompts are bounded by the Plugin and by core.** The Plugin owns its own limits (Auto-fix stops after three Prompts on one head commit). Core's Prompt-chain guard (ADR-0044) still applies to every Prompt.

## Considered options

- **Let the Background pass write.** Rejected: ADR-0050's Loaders are reads that Argo may repeat or skip, and a pass that acts would make every refresh a possible write.
- **Core owns PR automation, with a Forge port.** Rejected for the reasons ADR-0052 gives: one vendor's model in core before a second vendor exists.
- **Prompt as the user, through the App queue.** Rejected: it would show a Plugin's words as the person's own message, against ADR-0012.
- **Webhooks from GitHub.** Rejected for now: the Server is a local machine with no public address.

## Not decided here

- A Notification when a Plugin acts with every App closed.
- Prompting or archiving from Plugin pages, which run as a person's tap and need no new Capability.
