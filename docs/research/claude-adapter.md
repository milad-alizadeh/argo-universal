# Claude adapter: the vendor calls behind the agent machine

Researched 2026-10-04. Spec 0002 section 7 leaves the vendor calls in `connect`, `vendorStream` and cancelling to each adapter's research note (`docs/specs/0002-machines.md:180`). Spec 0003 adds Plan proposals, titles, Subagents, Shells and `continuedOutside` (`docs/specs/0003-sessions-and-feed.md:285-319`). This is the Claude note.

ADR 0004 fixes the route: Agent SDK `query()` on the subscription login, with no API key (`docs/adr/0004-agents-run-on-subscriptions.md:3-7`).

Two notes already cover parts of this:

- [Subagents and Shells](subagents-and-shells.md) holds the Subagent and Shell facts. Sections 11 and 12 here only summarise it and add the vendor calls.
- [Feed presentation](feed-presentation.md) section 8 maps Claude tools to Feed rows.

## Sources

| Source | Version | Root used in citations |
|---|---|---|
| Claude Agent SDK declarations and runtime | 0.3.289 (npm latest on 2026-10-04). It bundles CLI 2.1.289 (`manifest.json:2`). | `sdk.d.ts`, `sdk-tools.d.ts`, `sdk.mjs`, `core.mjs`, `README.md` in the scratchpad's `sdk/package/` |
| Claude Code CLI strings | 2.1.287, the installed CLI | `cc.txt`: `strings -n 8 ~/.local/share/claude/versions/2.1.287 > cc.txt`, 369,841 lines |
| Agent SDK docs | Unversioned pages, fetched 2026-10-04. Where a page overlaps the declarations, I checked it against SDK 0.3.289. | `docs <page>` means `https://code.claude.com/docs/en/agent-sdk/<page>` (`user-input`, `sessions`, `streaming-vs-single-mode`, `permissions`, `cost-tracking`) |
| This repo | `815031f` | `docs/`, `packages/`, `mocks/cli/claude/` |
| Old Argo | `~/Developer/argo` `a51a0e01e` (2026-10-03). It pins SDK 0.3.283 (`apps/desktop/package.json:44`). | `src/` means `apps/desktop/src/`; old `mocks/` means `apps/desktop/mocks/` |
| argo-v2 | `~/Developer/argo-v2` `4f520ef` (2026-07-17) | Drove Claude as a TUI in a PTY. Adds nothing here. |

The scratchpad is `/private/tmp/claude-501/-Users-milad-Developer-argo-universal--claude-worktrees-argo-ui-prototype-handoff-7e3d43/0fb4d6da-9287-4dbc-bebd-1b572df8fc22/scratchpad/`.

`cc.txt` comes from CLI 2.1.287, while the SDK bundles 2.1.289. Many `cc.txt` lines are minified code tens of kilobytes long. For those, a citation reads "`cc.txt` line N, search `X`".

## Proposed shape in one paragraph

Hold one long-lived `query()` per Session, fed by an async queue of user messages. Argo chooses the vendor id: a new Session passes `sessionId: randomUUID()`, and every later start passes `resume`. Pass `permissionMode` explicitly. Hold `canUseTool` promises by `toolUseID`. Permission requests, AskUserQuestion and ExitPlanMode all arrive there. Turn on `includePartialMessages`, `forwardSubagentText` and `perTaskStopAffordance`. Parse every message with Zod at the boundary.

## 1. Starting a Session

**`connect` is `query({prompt, options})`.** `prompt` is an `AsyncIterable<SDKUserMessage>` (`sdk.d.ts:3246`). The adapter needs these options:

| Option | Value | Source |
|---|---|---|
| `cwd` | Session cwd | `sdk.d.ts:1598` |
| `sessionId` | a new UUID, on a new Session only | `sdk.d.ts:2088-2093` |
| `resume` | `vendorSessionId`, on every later start | `sdk.d.ts:2084-2087` |
| `permissionMode` | the mode config value, always explicit | `sdk.d.ts:1986-1994` |
| `allowDangerouslySkipPermissions` | `true`, so a later switch to `bypassPermissions` works | `sdk.d.ts:1990, 2006`; docs `permissions` |
| `model`, `effort` | from `configOptions` | `sdk.d.ts:1962, 1913` |
| `canUseTool`, `onElicitation` | the adapter's holders | `sdk.d.ts:1589, 1751` |
| `includePartialMessages` | `true` | `sdk.d.ts:1862` |
| `forwardSubagentText` | `true` (`docs/specs/0003-sessions-and-feed.md:304`) | `sdk.d.ts:1863-1869` |
| `perTaskStopAffordance` | `true` (section 12) | `sdk.d.ts:1800-1807` |
| `env` | `{...process.env}` without `ANTHROPIC_API_KEY`, plus `CLAUDE_AGENT_SDK_CLIENT_APP`, `CLAUDE_CODE_EMIT_SESSION_STATE_EVENTS` and `CLAUDE_CODE_STARTUP_FAILURE_RESULTS` | `sdk.d.ts:1645-1662`; sections 2 and 13 |
| `stderr` | a callback that keeps the tail for `failed` | `sdk.d.ts:2293` |
| `pathToClaudeCodeExecutable` | the mock CLI in tests | `sdk.d.ts:1979`; `mocks/cli/claude/README.md` |

`env` "REPLACES the subprocess environment entirely" (`sdk.d.ts:1645-1650`). The SDK then adds `CLAUDE_CODE_ENTRYPOINT=sdk-ts` and `CLAUDE_CODE_SDK_READS_SESSION_STATE=1` (`sdk.mjs`, search `CLAUDE_CODE_SDK_READS_SESSION_STATE"))`).

`permissionMode` must be explicit. When it is omitted, the CLI uses the settings `defaultMode`, else `auto` (`sdk.d.ts:1986-1994`). The docs say omitting it meant `default` only before SDK 0.3.286 (docs `permissions`).

**The vendor id.** `system/init` is "emitted at the start of each turn" (`sdk.d.ts:5909`), so a new Session has no id until the first prompt. The `sessionId` option accepts any valid UUID. It cannot be combined with `resume` unless `forkSession` is set (`sdk.d.ts:2088-2093`). Because the adapter generates the UUID, `agent.ready {vendorSessionId}` can fire before any prompt.

**Ready.** `initializationResult()` returns the `initialize` answer: commands, agents, models and account (`sdk.d.ts:2968-2975`, `4548`). The adapter awaits it, builds `configOptions` from it (section 8), then sends `agent.ready`. Inferred: the handshake completes before any prompt, as old Argo's model probe assumed (`src/harnesses/claude/catalog.ts:71-89`).

**Resume.** `resume: vendorSessionId` loads the transcript (`sdk.d.ts:2084-2087`). Transcripts live at `~/.claude/projects/<encoded cwd>/<id>.jsonl`. Since CLI 2.1.223 the lookup searches beyond the cwd's project folder (docs `sessions`).

**A missing id.** In print mode the CLI writes `No conversation found with session ID: <id>` and exits with code 1 (`cc.txt` line 332674, search `lk="No conversation`; line 332732, search `not_found_explicit_id`). The SDK then throws `Claude Code process exited with code 1` plus the stderr tail (`sdk.mjs`, search `getProcessExitError`). Without matching text, that is indistinguishable from a crash.

The clean check comes before spawning: `getSessionInfo(id, {dir: cwd})` returns `undefined` when the file is missing (`sdk.d.ts:862-871`). Claude deletes transcripts after 30 days by default (`docs/adr/0005-the-server-database-holds-the-feed.md:7`), so this case is real.

**`continuedOutside`** (`docs/specs/0003-sessions-and-feed.md:312`).

- Each streamed `user` and `assistant` message carries a `uuid` (`sdk.d.ts:3611`, `6224`). These are transcript chain UUIDs: `resumeSessionAt` takes "typically `SDKAssistantMessage.uuid`" (`sdk.d.ts:2094-2100`).
- Before resuming, the adapter reads `getSessionMessages(id, {dir: cwd})` and compares the last `uuid` with the newest one Argo stored (`sdk.d.ts:890-926`). A different value means the Session continued outside Argo.
- **Where the stored uuid comes from.** The agent input is `{sessionId, cwd, vendorSessionId, configOptions, parent}` (`docs/specs/0002-machines.md:150`). A restarted adapter has no stored uuid. The spec needs a field for it, for example `vendorCursor` on `agent.turnEnded`, written to the `session` row and passed back in the input. This is owner question 3.
- Compare chain messages only. Claude appends `ai-title`, `custom-title` and `last-prompt` records that are not messages (`cc.txt` line 315117, search `"ai-title":"last-wins"`). Inferred: a file-time comparison (`getSessionInfo().lastModified`) would count those as continuations.
- `getSessionMessages` offers `offset` from the start but no tail read (`sdk.d.ts:908-913`). Inferred: it parses the whole file, which is fine once per start.

## 2. The stream and its validation

`SDKMessage` is a union of about 40 shapes (`sdk.d.ts:5332`). Its doc says "Consumers should ignore types and subtypes they do not recognize" (`sdk.d.ts:5330`). ADR 0012 asks for more: an unrecognised shape becomes a notice with `_meta.argo.unrecognised` and is counted (`docs/adr/0012-only-human-typed-text-is-a-user-message.md:14`).

**Zod at the boundary.** Discriminate on `type`, then on `subtype` for `system` and `result`. Use loose objects, so a new field does not reject a known shape. Reject and count only:

- an unknown `type`/`subtype` pair
- a known shape that lacks a field the mapping reads

The CLI also sends shapes that `sdk.d.ts` does not declare. The schema should list them as known and ignored, or each Turn will count them:

- `system/session_title_changed` (`cc.txt` line 306357, search `subtype:x("session_title_changed")`).
- `system/post_turn_summary` and a `command_lifecycle` frame. The CLI names both (`cc.txt` line 332688, search `post_turn_summary`; `sdk.d.ts:4603`). Old Argo saw both on CLI 2.1.286 (`src/harnesses/claude/session/claude-feed.ts:260, 268`). That they reach the SDK consumer is an old Argo observation, unverified.

The event map at the end lists which message gives which agent event.

**Row ids.** `assistant` is one message per completed content block, and the blocks share `message.id` (`sdk.d.ts:3611-3691`). The adapter counts blocks per `message.id`, as spec 0003 says (`docs/specs/0003-sessions-and-feed.md:257`). With `includePartialMessages`, `stream_event` deltas carry the block index (`sdk.d.ts:5482`).

**User messages.** The Session writes the `user_message` itself:

- for `session.prompt` (`docs/specs/0002-machines.md:116`)
- for Keep planning feedback (`docs/specs/0003-sessions-and-feed.md:296`)

So the adapter never turns a `user` message into a `user_message`.

- It drops any echo of a prompt it sent. It stamps each prompt with `uuid: turnId` to recognise the echo.
- It sets `origin: {kind: 'human'}` on each prompt. "A host wrapping keyboard input must stamp {kind:'human'} explicitly" (`sdk.d.ts:5335`).
- It drops `isSynthetic` and `isReplay` messages (`sdk.d.ts:6231`, `6313`).
- A `user` message with `tool_result` blocks becomes a Tool call update.

Inferred: whether the CLI echoes prompts at all in this mode needs a recording.

**ADR 0012 wrappers in the Claude stream** (`docs/adr/0012-only-human-typed-text-is-a-user-message.md:5-14`):

| Wrapper | How it appears | Status |
|---|---|---|
| Slash command | Argo sends `/name args` as prompt text. A prompt-type command expands into user content tagged `<command-name>/name</command-name>` (`cc.txt:197008`, `197010`). The Session already wrote the `user_message`, so the adapter drops the expansion. | Needs a recording |
| Local command output | `system/local_command_output {content}` (`sdk.d.ts:5270-5278`). In the transcript: `<local-command-stdout>` (`cc.txt:158274`). It becomes a notice. | Declared |
| `!bash` input and output | The CLI has `<bash-input>` and `<bash-stdout>` tags (`cc.txt:128380`, `276043`). Unknown whether a `!` prompt runs Bash in SDK mode. | Needs a recording |
| Hook output | `hook_started`, `hook_progress`, `hook_response`. SessionStart and Setup hooks always emit them. Other hooks emit them only with `includeHookEvents` (`sdk.d.ts:1850-1857`, `5197-5233`). They become notices. | Declared |
| System reminders | `<system-reminder>` text (`cc.txt:126463`). Unknown whether the stream carries them, or only flagged `isSynthetic`. | Needs a recording |
| Interrupted marker | `[Request interrupted by user]` and `[Request interrupted by user for tool use]` (`cc.txt:248005-248006`). The adapter ends the Turn from `result.terminal_reason` (section 4), not from this text. | Text verified; stream form needs a recording |
| Compaction | `system/compact_boundary {trigger, pre_tokens, post_tokens}` gives one Compaction row (`sdk.d.ts:3739`). `system/status: compacting` gives a progress state (`sdk.d.ts:5894`). | Declared |
| Task notification | `system/task_notification` (`sdk.d.ts:5993`). The model also gets a user-role `<task-notification>` message (`cc.txt:311613`, `224559`). The adapter maps the system message and drops the user-role one. | System message declared; user form needs a recording |

**Ending a Turn.** "The CLI emits exactly one result message per turn … treat it as the turn-complete signal" (`sdk.d.ts:5727`). The mapping onto the repo's stop reasons (`packages/db/src/schema.ts:33-40`):

| `result` | Stop reason |
|---|---|
| `success` with `stop_reason` `end_turn`, `max_tokens` or `refusal` | the same value. `stop_reason` is typed `string \| null` (`sdk.d.ts:5677`); these values come from the API (inferred). |
| `terminal_reason` `aborted_streaming` or `aborted_tools` (`sdk.d.ts:9685`) | `cancelled` |
| `error_max_turns` | `max_turn_requests` |
| `error_during_execution`, or `is_error` | `error`, with `errors[]` (`sdk.d.ts:5672-5700`) |

**Turns the Agent starts** (`docs/specs/0003-sessions-and-feed.md:289`). A finished background Subagent or Shell can wake Claude with no prompt (inferred from `task_notification`).

- `session_state_changed` is the signal for `agent.turnStarted`: `running` while no Turn is active. Its doc calls `idle` the "authoritative turn-over signal" (`sdk.d.ts:5858-5868`).
- The consumer receives it only with `CLAUDE_CODE_EMIT_SESSION_STATE_EVENTS` set. Without it, the CLI marks it `sdk_host_only` and the SDK drops it (`cc.txt` line 311984, search `CLAUDE_CODE_EMIT_SESSION_STATE_EVENTS`; `sdk.mjs`, search `sdk_host_only`).
- `sdk.d.ts` does not document this variable (owner question 5).

## 3. Prompting

**Shape.** Each prompt is pushed on the adapter's queue as:

```
{type: 'user', message: {role: 'user', content: [...]}, parent_tool_use_id: null, uuid: turnId, origin: {kind: 'human'}}
```

The fields come from `SDKUserMessage` (`sdk.d.ts:6224-6240`).

**Images.** An image is a content block `{type: 'image', source: {type: 'base64', media_type, data}}`. Images work only in streaming input mode. A block without `source` reaches Claude as a text note, with no error (docs `streaming-vs-single-mode`). The fetched pages state no size or media-type limits.

**Prompt text.** `verbatimPrompts` sends text "as written: no `@path` file-mention expansion" (`sdk.d.ts:1870-1893`).

**One long-lived query, not one per Turn.** Recommended. Reasons:

1. `interrupt`, `setPermissionMode`, `setModel` and `stopTask` are control requests. They work only in streaming input mode (`sdk.d.ts:2862-2867`; docs `streaming-vs-single-mode`).
2. Shells belong to the process: the vendor's background-task set "is per-process" (`sdk.d.ts:3707`). A process per Turn would end them at Turn end. In single-message mode the CLI also waits for background Subagents before its result (docs `cost-tracking`).
3. A Permission request may wait a long time. "The callback can stay pending indefinitely" (docs `user-input`).
4. Images need streaming input.

Idle processes are already handled by spec 0003. A Session actor closes after 5 minutes with no running Turn, Subagent or Shell and no pending request (`idleCloseDelay`, `docs/specs/0003-sessions-and-feed.md:318`). Closing stops the agent, so the process ends only when no Shell runs.

## 4. Cancelling

`agent.cancel` calls `query.interrupt()` (`sdk.d.ts:2853-2860`).

- The Turn ends with a `result` whose `terminal_reason` is `aborted_streaming` or `aborted_tools` (`sdk.d.ts:9685`).
- A pending `can_use_tool` is withdrawn: the CLI sends `control_cancel_request`, and "the sender stops waiting at once and ignores any control_response that still arrives" (`sdk.d.ts:3884-3892`). The callback's `signal` aborts (`sdk.d.ts:213-303`). The adapter deletes the held request.
- Without `perTaskStopAffordance: true`, an interrupt also stops every Shell (`sdk.d.ts:1800-1807`).
- With `interrupt_receipt_v1` in the init `capabilities`, `interrupt()` returns `still_queued`, the user messages that will still run (`sdk.d.ts:2853-2859`). Argo sends one prompt per Turn, so this should stay empty. Inferred.

**`agent.answerPermission {toolCallId, optionId: null}`** means cancelled (`docs/specs/0002-machines.md:156`). `live.cancelling` sends `agent.cancel`, then answers every queued request with null (`docs/specs/0002-machines.md:126`). The adapter handles a null answer this way:

- If it still holds the callback for `toolCallId`, it resolves it with `{behavior: 'deny', message: 'Cancelled'}`. The interrupt that follows ends the Turn.
- If `interrupt()` has already withdrawn the callback, the held entry is gone and the null answer does nothing. The CLI would ignore a late answer anyway (`sdk.d.ts:3884-3892`).
- AskUserQuestion and ExitPlanMode are held the same way, so the Elicitation and Plan proposal cancel identically.

The mock CLI rejects `interrupt` (`mocks/cli/claude/README.md`). It needs an interrupt reply and a cancelled result before the cancel tests can run.

## 5. Permission requests

`canUseTool(toolName, input, options)` returns a promise (`sdk.d.ts:213-303`). `options` carries:

- `signal`
- `toolUseID` (`:279`) and `agentID` (`:281`)
- `title`, `displayName`, `description`
- `decisionReason`, `blockedPath`, `suggestions`
- `requestId`

The adapter keeps the resolver in a map keyed by `toolUseID` and sends `agent.permissionRequested {toolCallId: toolUseID, …}`. Spec 0003 offers exactly two options (`docs/specs/0003-sessions-and-feed.md:182`):

- `allow_once` returns `{behavior: 'allow'}`. `updatedInput` may be omitted since CLI 2.1.207 (docs `user-input`).
- `reject_once` returns `{behavior: 'deny', message}`. Claude "sees this message" (docs `user-input`).

`suggestions` is ignored, because "Allow for this Session" is out of scope (`docs/specs/0003-sessions-and-feed.md:468`). The adapter never returns `null`: that means "answered out-of-band", and an accidental null leaves the tool "blocked indefinitely" (`sdk.d.ts:203-211`).

**What never reaches the callback.** Anything an earlier step approves (docs `permissions`):

- hooks
- deny, ask and allow rules from settings files
- the permission mode

With the default `settingSources` (all, `sdk.d.ts:2252`), the user's own settings allow rules approve calls with no Permission request (owner question 1). In plan mode, file edits and file-changing shell commands always reach the callback (docs `permissions`).

**Subagent requests** carry `agentID` (`sdk.d.ts:281`). Inferred: `toolUseID` stays unique across the tree, so one map holds both.

**A request open across a restart.** `reinitialize()` redelivers pending `can_use_tool` requests to a live process (`sdk.d.ts:2977-3001`). A dead process loses them. Inferred: after `resume`, the transcript ends on a `tool_use` with no result.

## 6. Elicitations

**AskUserQuestion** arrives in `canUseTool` with `toolName === 'AskUserQuestion'` (docs `user-input`).

- The input has 1 to 4 questions. Each has `question`, `header`, `multiSelect`, and 2 to 4 options with `label` and `description` (`sdk-tools.d.ts:1115-2691`).
- Accept returns `{behavior: 'allow', updatedInput: {questions, answers: {[questionText]: label}}}` (docs `user-input`; `answers` at `sdk-tools.d.ts:2663`).
- A multi-select answer is an array, or labels joined with `", "`. Free text goes in `answers` too. `response` carries an optional general reply (docs `user-input`).
- Decline or cancel returns `deny` with a message. Inferred: the docs show only allow.
- It reaches the callback even in `bypassPermissions`, and is denied in `dontAsk` (docs `permissions`).
- It is not available inside Subagents (docs `user-input`).

It maps to `agent.elicitationRequested` with a form schema built from the questions. `agent.answerElicitation {action, content}` carries no id. The adapter holds one pending Elicitation, as spec 0002's singular `pendingElicitation` assumes (`docs/specs/0002-machines.md:108`).

**MCP elicitations** use `onElicitation(request, {signal, requestId})` (`sdk.d.ts:1485`, `1751`).

- The request has `serverName`, `message`, `mode` (`form` or `url`), `requestedSchema`, `url` and `elicitationId` (`sdk.d.ts:718-737`).
- The answer is `{action: 'accept' | 'decline' | 'cancel', content?}`, which matches `agent.answerElicitation`.
- Without the callback, elicitations "are declined automatically" (`sdk.d.ts:1730-1751`).
- `system/elicitation_complete` closes a `url` elicitation (`sdk.d.ts:5148`).

## 7. Plan proposals

Plan is the `plan` permission mode. Claude ends planning by calling `ExitPlanMode` (`docs/specs/0003-sessions-and-feed.md:291-296`).

**Reaching the callback.** The tool declares `requiresUserInteraction(){if(ml())return!1;return!0}` (`cc.txt` line 318080, search `requiresUserInteraction(){if(ml())`).

- `ml()` is true when the CLI runs as a team member: an in-process teammate, or a team context with `agentId` and `teamName` (`cc.txt` line 306458, search `function ml(){`).
- Inferred: an Argo Session is no team member, so `ExitPlanMode` requires user interaction and reaches `canUseTool`. A recording must confirm it.

**The proposal's text.**

- The SDK declares the input as passthrough, with only a deprecated `allowedPrompts` (`sdk-tools.d.ts:835-850`).
- The CLI's own schema adds `plan`, "The plan content (injected by normalizeToolInput from disk)", and `planFilePath` (`cc.txt:181240-181241`; `cc.txt` line 318080, search `injected by normalizeToolInput`).
- Inferred: `canUseTool` gets the normalised input, so `input.plan` holds the text, with `planFilePath` as the fallback.

`agent.planProposed {planId: toolUseID, content: input.plan}`.

**Approve** returns `allow`. The tool's own `call` then leaves plan mode for `prePlanMode ?? 'default'` (`cc.txt` line 318080, search `prePlanMode??"default"`).

- A Session that started in `plan` lands in `default`, as spec 0003 says.
- A Session that went from `acceptEdits` to `plan` lands back in `acceptEdits`.

To force `default` every time, return `updatedPermissions: [{type: 'setMode', mode: 'default', destination: 'session'}]` (`sdk.d.ts:2541-2555`). The next `system/status` carries the new mode, which gives `agent.configOptionsChanged` (`sdk.d.ts:5894`).

**Keep planning** returns `{behavior: 'deny', message: feedback}`. Inferred: a deny lets the Turn go on in plan mode, with Claude reading the feedback (docs `user-input`).

## 8. Config options

Config options follow ACP v2 with `configId` values, and the full array is resent after every change (`docs/specs/0003-sessions-and-feed.md:242-245`).

**Model**

- Values come from `initializationResult().models`, or `supportedModels()` (`sdk.d.ts:3013`).
- `ModelInfo` has `value`, `displayName`, `description`, `supportsEffort`, `supportedEffortLevels`, `supportsAdaptiveThinking` and `supportsAutoMode` (`sdk.d.ts:1391-1430`).
- Set it with `setModel(value)` (`sdk.d.ts:2896`). `null` or `'default'` resets it (`sdk.d.ts:5076`).

**Mode**

- Values: `default`, `acceptEdits`, `plan`, `auto`, `bypassPermissions` (`sdk.d.ts:2484`). `dontAsk` is not offered.
- `auto` should depend on `supportsAutoMode`. Inferred from the field name.
- Set it with `setPermissionMode` (`sdk.d.ts:2867`). The change applies "immediately for all subsequent tool requests" (docs `permissions`).
- Claude changes the mode itself when it leaves plan mode. The adapter follows `system/status.permissionMode` and the init `permissionMode` (`sdk.d.ts:5894`, `5909-5991`).

**Effort**

- At start: the `effort` option (`sdk.d.ts:1913`).
- Mid-Session: `applyFlagSettings({effortLevel})`, which lasts for the Session only. `max` "runs as high" on models without it (`sdk.d.ts:2930-2952`).
- Levels per model come from `supportedEffortLevels` (`sdk.d.ts:1415`).
- The init `effort` is the level actually sent, after downgrades (`sdk.d.ts:5969-5971`).
- `maxThinkingTokens` is deprecated (`sdk.d.ts:1922`, `2923`).

A change during a Turn is held, and the Session sends it before the next `agent.prompt` (`docs/specs/0003-sessions-and-feed.md:297`). The adapter applies the calls in order, then pushes the prompt.

## 9. Usage

**`agent.usage {used, size, cost?}`** (`packages/contracts/src/sessions/snapshot.ts:9-18`). After each `result`, the adapter calls `getContextUsage({detail: 'summary'})`, which returns `totalTokens`, `maxTokens` and `percentage` (`sdk.d.ts:3036`, `3938-3949`).

**`TurnUsage` on `agent.turnEnded`** comes from `result.usage`, which "covers only that turn, and within it only the main agent loop" (docs `cost-tracking`):

| Vendor field | `TurnUsage` field |
|---|---|
| `input_tokens` | `inputTokens` |
| `output_tokens` | `outputTokens` |
| `cache_read_input_tokens` | `cachedReadTokens` |
| `cache_creation_input_tokens` | `cachedWriteTokens` |

- Per-step `output_tokens` on assistant messages is a placeholder (docs `cost-tracking`).
- Claude reports no separate thought-token count. Inferred from the `Usage` fields.

**Cost.** `total_cost_usd` and `modelUsage` are running totals for the process, including spend restored on resume (docs `cost-tracking`; `sdk.d.ts:5687`). They are client-side estimates. A crash result can carry zeroed totals (docs `cost-tracking`).

**Plan limits.** `rate_limit_event` carries the subscription's utilisation (`sdk.d.ts:5633-5646`).

## 10. Titles

Spec 0003 asks the adapter to pass Claude's title through, and to read it after the first Turn if it is not streamed (`docs/specs/0003-sessions-and-feed.md:298`).

**How Claude titles a Session.** In headless mode the CLI generates an AI title from the first human prompt (`cc.txt` line 332429, search `function Vso(`; called per inbound message, line 332724, search `Vso({content`). It appends an `ai-title` record (`cc.txt` line 315163, search `type:"ai-title",aiTitle`). The `title` option skips generation and sets a custom title (`sdk.d.ts:2415-2422`).

**What is streamed.** `system/session_title_changed {title}` is undeclared and `@internal`. The CLI sends it at startup when the Session has a name, and after each name change, including a host rename (`cc.txt` line 306357, search `A headless (print mode) session sends it`). The same text says it is "not an AI-generated title", so the AI title is not streamed.

**Reading the AI title.** After the first Turn, read `getSessionInfo(id, {dir: cwd})` (`sdk.d.ts:862-871`).

- `customTitle` is the user's name (`sdk.d.ts:5833-5835`).
- `summary` falls back from custom title to AI title, last prompt, compact summary, then first prompt (`sdk.mjs`, search `Mt(s,"aiTitle")`).
- Inferred: the title is written asynchronously, so `summary` can still be the first prompt after the first `result`. The adapter retries after the next `result`, and sends `agent.titleChanged` only when the value changes.

**Rename.** `agent.rename` with no live process calls `renameSession(vendorSessionId, title, {dir})`, which "Appends a custom-title entry" (`sdk.d.ts:3252-3257`).

With a live process, the CLI keeps the title in memory. It re-reads a name that another process wrote only "after about 32 KB of its own transcript writes, or at a compaction" (`cc.txt` line 306357, search `about 32 KB`). The live call is the `rename_session` control request with `source: 'host'`, which "the CLI counts as a user rename" (`sdk.d.ts:4961-4971`). The SDK runtime has `Query.renameSession(title, sessionId)`, but `sdk.d.ts` does not declare it (`sdk.mjs`, search `subtype:"rename_session"`). Owner question 5 covers this.

## 11. Subagents

See [Subagents and Shells](subagents-and-shells.md), section 1. In short:

- Claude starts Subagents with the `Agent` tool, alias `Task`.
- Their messages carry `parent_tool_use_id`.
- `task_started`, `task_progress`, `task_updated` and `task_notification` give the lifecycle and usage.
- `listSubagents` and `getSubagentMessages` read history after a restart (`sdk.d.ts:939`, `1152`).

What the vendor calls add:

- `forwardSubagentText: true`. Without it, only tool blocks arrive (`sdk.d.ts:1863-1869`).
- `agent.feed.subagentToolCallId` is the message's `parent_tool_use_id`.
- `agent.subagentChanged` comes from the `task_*` messages for Subagent tasks.
- `agentProgressSummaries` fills progress summaries (`sdk.d.ts:2082`).
- Subagents run in the background by default (`sdk-tools.d.ts:779-783`). A Turn can end with Subagents running, and their finish can start a new Turn (section 2).
- Stopping a Subagent is out of scope (`docs/specs/0003-sessions-and-feed.md:474`).

## 12. Shells

See [Subagents and Shells](subagents-and-shells.md), section 1. In short:

- `Bash` with `run_in_background` starts a Shell. Its output goes to a file under the Session's `tasks/` folder.
- `task_notification` carries `output_file` and the end status. It has no exit code (`sdk.d.ts:5993`).

What the vendor calls add:

- **`agent.shellOutput`.** Tail `output_file`, as spec 0003 says (`docs/specs/0003-sessions-and-feed.md:308`). The `get_task_output` control request returns only the last 8 KiB (`sdk.d.ts:4211-4235`). The `Query.getTaskOutput` method that sends it is undeclared (`sdk.mjs`, search `get_task_output`). The CLI refuses it for an id that is not a shell or Monitor task (`cc.txt:138120`).
- **`agent.stopShell`.** Call `stopTask(taskId)`, which emits `task_notification` with status `stopped` (`sdk.d.ts:3219`).
- **Stopping one Shell only.** `perTaskStopAffordance: true` keeps an interrupt from stopping the other Shells (`sdk.d.ts:1800-1807`).
- **Restarts.** Shells belong to the process, and the vendor's set "is per-process" (`sdk.d.ts:3707`). Spec 0003 marks running Shells `lost` when the agent fails or stops (`docs/specs/0003-sessions-and-feed.md:311`).

## 13. Stopping and crash detection

**`agent.stop`.** End the prompt iterable, then call `close()`, which will "terminate the underlying process" (`sdk.d.ts:3236-3243`).

The kill sequence:

1. Close stdin and wait about 2 s (`sdk.d.ts:2436-2440`).
2. Send SIGTERM.
3. Send SIGKILL 5 s later (`core.mjs`, search `kill("SIGTERM")`).

The worst case is about 7 s, longer than `agentStopLimit`'s 5 s (`docs/specs/0002-machines.md:128`). Inferred: the Session's limit fires first, and the SDK finishes the kill on its own.

**Crash.** The `for await` over the query throws one of two errors, each with the stderr tail (`sdk.mjs`, search `getProcessExitError`):

- `Claude Code process exited with code N`
- `Claude Code process terminated by signal S`

The CLI may write a final `error_during_execution` result before exiting (docs `cost-tracking`). The adapter sends `failed` with the error and the stderr tail. The 3-crashes-in-10-minutes rule belongs to the Session (`docs/specs/0002-machines.md:129`).

**Startup failures.** A known startup failure writes a result carrying `startup_failure_reason`. Examples: `cwd_unavailable`, `session_held_by_background`, `bypass_root`. Failures that once went to stderr only need `CLAUDE_CODE_STARTUP_FAILURE_RESULTS` for that result (`sdk.d.ts:5701`, `5890`).

**Sign-in.** `apiKeySource` on init is `'none'` for the subscription login (`sdk.d.ts:5909-5991`). Any other value breaks ADR 0004, and the adapter fails with a clear error.

## Event and command map

| Spec event or command | Claude call or message |
|---|---|
| `connect` | `getSessionInfo` (resume only); `query({prompt: queue, options})`; `await initializationResult()` |
| `agent.ready {vendorSessionId, configOptions, capabilities, continuedOutside}` | the generated `sessionId` or the `resume` id; models from `initializationResult()`; last `uuid` from `getSessionMessages` |
| `agent.prompt {turnId, content}` | push `SDKUserMessage {uuid: turnId, origin: {kind: 'human'}}` |
| `agent.cancel` | `interrupt()` |
| `agent.answerPermission {toolCallId, optionId, message?}` | resolve the held `canUseTool` with `allow`, or `deny {message}`; null: section 4 |
| `agent.answerElicitation {action, content?}` | AskUserQuestion: `allow {updatedInput.answers}` or `deny`. MCP: resolve `onElicitation`. |
| `agent.answerPlanProposal` | Approve: `allow`, optionally with `setMode`. Keep planning: `deny {message}`. |
| `agent.setConfigOption {configId, value}` | `setModel`, `setPermissionMode`, `applyFlagSettings({effortLevel})` |
| `agent.rename` | `renameSession()`; live: the `rename_session` control |
| `agent.stopShell` | `stopTask(taskId)` |
| `agent.stop` | end the queue; `close()` |
| `agent.feed` | `stream_event`, `assistant`, `user` with `tool_result`, `compact_boundary`; `local_command_output` and hook messages as notices; `api_retry`, `informational`, `notification` as notices (`sdk.d.ts:3589, 5238, 5467`) |
| `agent.permissionRequested` | `canUseTool`, other tools |
| `agent.elicitationRequested` | `canUseTool` with `AskUserQuestion`; `onElicitation` |
| `agent.planProposed` | `canUseTool` with `ExitPlanMode` |
| `agent.turnStarted` | `session_state_changed: running` with no active Turn |
| `agent.turnEnded` | `result` |
| `agent.usage` | `getContextUsage()` after `result` |
| `agent.configOptionsChanged` | `system/status.permissionMode`, `system/init`, after each set call |
| `agent.titleChanged` | `session_title_changed`; `getSessionInfo().summary` after a Turn |
| `agent.subagentChanged` | `task_*` for Subagent tasks |
| `agent.shellChanged`, `agent.shellOutput` | `task_*`, `background_tasks_changed`; tail `output_file` |
| `failed` | the query iterator throws; `startup_failure_reason` |

## What old Argo did that should change

Nothing here is copied until the owner agrees. Each item is a question.

1. Old Argo drove Claude through one long-lived `query()` per Session (`src/harnesses/claude/session/claude-session-channel.ts:319-325`). Should the new adapter keep that shape, as section 3 recommends?
2. It learned the vendor id from `system/init`, and held `canUseTool` until the id arrived (`claude-session-channel.ts:92-95, 220-223`). Should the new adapter pass `sessionId` up front instead?
3. It passed no `stderr`, `forwardSubagentText`, `perTaskStopAffordance` or effort (`claude-session-channel.ts:68-82`). Should all of these be set as section 1 lists?
4. It never sent effort, and offered no mid-Session changes (`claude-session-channel.ts:76-77`; `src/harnesses/claude/registration.ts:53`). Should `setModel`, `setPermissionMode` and `applyFlagSettings` back `agent.setConfigOption`?
5. It read the modes from `claude --help`, because `initialize` lists none (`src/harnesses/claude/catalog.ts:34-69`). It offered `auto` only when `supportsAutoMode` was true (`src/harnesses/claude/catalog-projection.ts:91-93`). Should the list be the fixed `PermissionMode` set, with that same `auto` filter?
6. It called `getContextUsage({detail: 'summary'})` after each `result` (`claude-session-channel.ts:263-276`). Should the new adapter do the same for `agent.usage`?
7. It sent prompts as a plain string and declared `acceptsAttachments: false` (`claude-session-channel.ts:175-182`; `registration.ts:54`). Should the new adapter send content blocks, so images work?
8. It sent a fixed deny message, "The user denied this tool." (`src/harnesses/claude/session/claude-channel-controls.ts:41-55`). Should the user's own `message` go to Claude instead?
9. It had no `ExitPlanMode` handling, so a Plan proposal arrived as an ordinary Permission request (no match in `src`). Should section 7 apply?
10. It had no `onElicitation`, and dropped `elicitation_complete` (`src/harnesses/claude/session/claude-feed.ts:251`). Should MCP elicitations be answered?
11. It ignored `result.usage`, `modelUsage` and `rate_limit_event` (`claude-feed.ts:290-292`). It drew hardcoded plan bars (`src/harnesses/claude/presentation/index.tsx:13-17`). Should `TurnUsage` and plan limits be real?
12. It reported idle at `result`, without `CLAUDE_CODE_EMIT_SESSION_STATE_EVENTS`. Old Argo's own research notes this gap (`docs/research/claude-live-session-status-and-activity.md:81-86` in old Argo). Should the new adapter set the variable?
13. It caught a missing transcript only as a generic failure (`claude-session-channel.ts:287-298`). Should the new adapter check with `getSessionInfo` first?
14. It captured no stderr, so a crash said only "Claude Session ended before the turn completed." (`claude-session-channel.ts:284`). Should the stderr tail go into `failed`?
15. It stripped `ANTHROPIC_API_KEY` from the Session's environment, but not from its model probe (`src/harnesses/claude/cli-environment.ts:1-5`; `catalog.ts:73`). Should both use one environment?
16. Its mock stream has no interrupt (`apps/desktop/mocks/cli/claude/mock-claude-sdk-stream.ts`). Its recordings have no `init`, `result`, `can_use_tool`, ExitPlanMode or title records (`apps/desktop/mocks/recordings/claude-cli/2.1.286/`). Should the new mocks be re-recorded from the bundled CLI before the adapter is built?

## Questions for the owner

1. **Settings files.** Should the user's and the project's Claude settings apply (`settingSources`, default all)? Then their allow rules approve tools with no Permission request, as in the terminal, and their hooks and MCP servers load.
2. **Missing transcript on start.** Should the Session go to `failed`, or start a new vendor Session with a Notice?
3. **Vendor cursor for `continuedOutside`.** Add a `vendorCursor` (the newest vendor message `uuid`) to `agent.turnEnded`, store it on the `session` row, and pass it in the agent input?
4. **Approving a Plan proposal.** Should Approve return to Claude's pre-plan mode, as Claude does itself, or always go to `default`, as spec 0003 is worded?
5. **Undeclared vendor surface.** May the adapter rely on things `sdk.d.ts` does not declare? There are four:
   - `Query.renameSession` (live rename)
   - `Query.getTaskOutput`
   - the `session_title_changed` message
   - `CLAUDE_CODE_EMIT_SESSION_STATE_EVENTS`, which `agent.turnStarted` depends on

   The fallbacks: rename through the declared `renameSession()` function, tail the output file, read titles after each Turn, and detect Agent-started Turns another way.
6. **Cost.** On a subscription, `total_cost_usd` is an estimate, not a bill. Should `ContextUsage.cost` stay empty for Claude?
7. **Plan limits.** Should `rate_limit_event` reach the UI?
8. **`@path` expansion.** Should prompts go verbatim (`verbatimPrompts: true`)?
9. **Stop limit.** `close()` can take about 7 s, against `agentStopLimit` of 5 s. Should the limit grow, or should the adapter send SIGKILL at 5 s?

## Owner answers (2026-10-05)

Given while building issue 25:

- **Settings files** (question 1): all of them apply, as in the terminal. The adapter leaves `settingSources` at its default.
- **Missing transcript** (question 2): the adapter fails with a clear error, after the `getSessionInfo` check.
- **`@path` expansion** (question 8): prompts go verbatim.
- **Stop limit** (question 9): `close()`, with `agentStopLimit` kept at 5 s.
- **Shape**: as this note recommends. The adapter keeps one long-lived `query()`, passes `sessionId` up front and keeps the stderr tail. It calls `getContextUsage` after each `result`.
- **Executable**: the adapter runs the user's own `claude` from PATH, not the CLI bundled with the SDK.
- **Images** (old Argo item 7): wait for issue 3f.
- **Vendor name**: `packages/agents/src/adapters.ts` lists every adapter. It is the one file outside an adapter's folder that names a vendor. Tests find each mock CLI by agent id in `mocks/cli/index.ts`.

Questions 3 to 7 are still open. Until they are answered, `continuedOutside` is always false and `agent.turnStarted` is never sent.

## Not verified

These items are not marked "Inferred." above:

- The image size and media-type limits. The fetched docs pages do not state them.
- The full set of `stop_reason` values on `result`. The field is typed `string`.
