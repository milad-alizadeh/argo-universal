# Only human-typed text becomes a user message

[ADR-0044](0044-argo-is-driven-through-one-operation-registry-and-the-argo-cli.md) (owner, 2026-10-28) amends this: a Prompt has a sender, the user, another Session or a Plugin. The Feed stores the sender and draws a Session's or a Plugin's Prompt as "From ‹title›"; only the user's is the user's own message.

For ACP Sessions, the local submitted prompt is the human provenance boundary. Session persists that exact prompt as the Turn's first row before dispatch. ACP user-message echoes do not create another human row. Text arriving while idle remains Turn-null: the pinned SDK 1.7 baseline supplies no verified autonomous-start signal, so text alone cannot create a Turn (owner, 2026-10-09, Spec 0009 #349).

Agents put their own text into the user's side of the transcript: system reminders, slash-command echoes, hook output, local command output, and injected AGENTS.md or environment blocks. Paseo shows most of it as user text; Argo trusts the vendor's origin flag instead. Only text the vendor marks as human-typed becomes a `user_message`, shown as written.

The adapter maps each recognised wrapper to a typed Session update:

- A slash command becomes a `user_message` with the text `/name args`. It needs only the command name; the arguments can be absent.
- `!bash` input and its output become a `tool_call_update` of kind `execute`.
- Local command output and hook output become a `notice`.
- "[Request interrupted by user]" ends the Turn with the stop reason `cancelled`.
- A background task notification becomes a `task_update`.
- One compaction produces one `compaction_update`, from the vendor's compaction boundary.

The adapter drops system reminders, records that the vendor flags as meta or synthetic, and Codex's injected AGENTS.md, environment, and plugin blocks. It never removes text from inside tool output. The adapter drops a message type it does not map. A change that does not match the contract is rejected, logged and counted by the Feed (ADR 0015).

## Reviews under ADR-0061

Owner amendment, 2026-11-18 (#2373): [ADR-0061](0061-reviews-belong-to-the-engine-and-change-providers-own-remote-writes.md) adds Review as a fourth authenticated Prompt sender. The Engine records its Review identity and the Feed draws “From Review”. Reviewer instructions and Finding Fix Prompts use this sender. Agent-supplied JSON cannot claim it.

## Voice calls under ADR-0062

Owner amendment, 2026-11-18: [ADR-0062](0062-a-voice-call-belongs-to-the-server-and-speaks-for-one-session.md) adds the Voice call as a fifth authenticated Prompt sender. A voice model writes the Prompt from what the person said, so it is not the person's own message. Unlike every other sender's Prompt, it is stored and never drawn: the Feed shows what the person said and what the voice said as transcript rows instead. The person's spoken words are drawn as the person's, because the person said them; they are not a `user_message` and never reach the Agent as written.
