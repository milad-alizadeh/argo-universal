# Only human-typed text becomes a user message

For ACP Sessions, the local submitted prompt is the human provenance boundary. Session persists that exact prompt as the Turn's first row before dispatch. ACP user-message echoes do not create another human row. Text arriving while idle remains Turn-null: the pinned SDK 1.7 baseline supplies no verified autonomous-start signal, so text alone cannot create a Turn (owner, 2026-10-09, Spec 0009 #349).

Agents put their own text into the user's side of the transcript: system reminders, slash-command echoes, hook output, local command output, and injected AGENTS.md or environment blocks. Paseo shows most of it as user text. Argo trusts the vendor's origin flag instead. Only text that the vendor marks as typed by a human becomes a `user_message`, and it is shown as written.

The adapter maps each recognised wrapper to a typed Session update:

- A slash command becomes a `user_message` with the text `/name args`. It needs only the command name, and the arguments can be absent.
- `!bash` input and its output become a `tool_call_update` of kind `execute`.
- Local command output and hook output become a `notice`.
- "[Request interrupted by user]" ends the Turn with the stop reason `cancelled`.
- A background task notification becomes a `task_update`.
- One compaction produces one `compaction_update`, from the vendor's compaction boundary.

The adapter drops system reminders, records that the vendor flags as meta or synthetic, and Codex's injected AGENTS.md, environment, and plugin blocks. It never removes text from inside tool output. The adapter drops a message type it does not map. A change that does not match the contract is rejected, logged and counted by the Feed (ADR 0015).
