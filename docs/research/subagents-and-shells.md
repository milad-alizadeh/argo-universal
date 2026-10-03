# Subagents and Shells: what each Agent gives, and a model for Argo

Researched 2026-10-03. The agreed UI needs two lists per Session:

- **Subagents**, grouped Running and Finished. Each row shows model · duration · tokens. Each Subagent opens its own Feed (its prompt, then its rows) in a sheet or inspector.
- **Shells**, grouped Running and Finished. Each row shows command · duration. Each Shell opens its live output.

Today spec 0002 gives a Subagent no Session actor. Its updates show only as `subagent_update` rows in the parent Feed (`docs/specs/0002-machines.md:126`, `packages/contracts/src/feed/session-update.ts:113-125`). The `session` table already has `parentSessionId` (`packages/db/src/schema.ts:62-64`).

## Sources

| Source | Version | Root used in citations |
|---|---|---|
| Claude Agent SDK declarations | 0.3.288 (npm latest on 2026-10-03) | `sdk/package/` in the scratchpad; `sdk.d.ts`, `sdk-tools.d.ts` |
| Claude Code CLI bundle | 2.1.287 | `cc.txt` in the scratchpad |
| Codex | openai/codex `b741e48` | `codex-rs/` |
| ACP subagents RFD | agent-client-protocol `2bc773b` | `docs/rfds/subagents.mdx` |
| Old Argo | `~/Developer/argo` | `src/` means `apps/desktop/src/` |
| T3 Code | `f391794a` | `t3code/` |
| Paseo | `42e22174` | `paseo/` |

The scratchpad is `/private/tmp/claude-501/-Users-milad-Developer-argo-universal--claude-worktrees-argo-universal-sessions-feed-b66986/c7ccaeef-c45a-4aef-a88a-784281198673/scratchpad/`.

## 1. Claude

### Subagents

**How they start.** The tool is `Agent`, with `Task` as an alias (`cc.txt:308814`). Old transcripts say `Task`. `AgentInput` has `description`, `prompt`, `subagent_type?`, `model?`, `run_in_background?`, `name?`, and `isolation?: 'worktree' | 'remote'` (`sdk-tools.d.ts:763-800`). Its doc says Agents run in the background by default (`sdk-tools.d.ts:779-783`).

**How their messages arrive.**

- `SDKAssistantMessage` and `SDKUserMessage` carry `parent_tool_use_id`. It is set when a Subagent started by that tool_use produced the message (`sdk.d.ts:3609-3617`, `sdk.d.ts:6224`).
- Each assistant message is one finished content block. Several can share one `message.id` while a response streams (`sdk.d.ts:3609`).
- `stream_event` partials carry `parent_tool_use_id` too, with `includePartialMessages` (`sdk.d.ts:5482`, `sdk.d.ts:1863-1864`).
- By default the SDK forwards only a Subagent's tool_use and tool_result blocks. `forwardSubagentText: true` forwards its whole conversation "so consumers can render a nested transcript" (`sdk.d.ts:1865-1869`).
- Paseo reports that a backgrounded Subagent emits no `parent_tool_use_id` frames at all (`paseo/docs/agent-lifecycle.md:203`). Paseo emits a synthetic card for that reason (`paseo/packages/server/src/server/agent/providers/claude/agent.ts:4203-4238`). Argo has no recording that shows either case.

**Lifecycle messages.** Four `system` subtypes, all in the `SDKMessage` union (`sdk.d.ts:5332`):

- `task_started`: `task_id`, `tool_use_id?`, `description`, `subagent_type?`, `prompt?`, `task_type?`, `is_backgrounded?`, `spawn_depth?` (`sdk.d.ts:6048-6082`).
- `task_progress`: `task_id`, `tool_use_id?`, `usage: {total_tokens, tool_uses, duration_ms}`, `last_tool_name?`, `summary?` (`sdk.d.ts:6023-6046`). `summary` needs `agentProgressSummaries`, which forks a summary about every 30 s (`sdk.d.ts:2075-2082`).
- `task_notification`: `task_id`, `tool_use_id?`, `status: 'completed' | 'failed' | 'stopped'`, `output_file`, `summary`, `usage?` (`sdk.d.ts:5993-6021`).
- `task_updated`: a `patch` with `status?` (`pending`, `running`, `completed`, `failed`, `killed`, `paused`), `end_time?`, `error?`, `is_backgrounded?` (`sdk.d.ts:6084-6101`).
- `background_tasks_changed` sends the whole set of live tasks each time: `{task_id, task_type, description}[]` (`sdk.d.ts:3705-3720`).
- `task_type` values in the CLI include `local_agent`, `local_bash`, `local_workflow`, `remote_agent`, and `monitor_mcp` (string literals in `cc.txt`).

**Model, tokens, and duration.** The Agent tool result arrives as `tool_use_result` on a `SDKUserMessage` (`sdk.d.ts:6235`). `AgentOutput` has three shapes (`sdk-tools.d.ts:100-205`):

- `completed`: `agentId`, `resolvedModel?`, `modelsUsed?`, `totalDurationMs`, `totalTokens`, `totalToolUseCount`, `usage`, `prompt`, `worktreePath?`.
- `async_launched`: `agentId`, `description`, `resolvedModel?`, `prompt`, `outputFile`. The totals come later in `task_notification.usage`.
- `remote_launched`: `taskId`, `sessionUrl`, `outputFile`.

Every assistant message also has `message.model`. No SDK type has a start or end time. Argo stamps them when `task_started` and `task_notification` arrive.

**Reading a Subagent later.** Each Subagent has its own transcript at `~/.claude/projects/<dir>/<sessionId>/subagents/agent-<agentId>.jsonl` (`sdk.d.ts:1144-1145`). Its lines carry `isSidechain: true`. A sibling `agent-<id>.meta.json` holds `agentType`, `description`, and `toolUseId`.

- `listSubagents(sessionId)` returns agent ids (`sdk.d.ts:1152`).
- `getSubagentMessages(sessionId, agentId, {limit, offset})` returns its messages (`sdk.d.ts:939-958`).
- `getSessionMessages` has no option for sidechains (`sdk.d.ts:902`).

**Control.** `stopTask(taskId)` stops one task and emits `task_notification` with `stopped` (`sdk.d.ts:3219`). `backgroundTasks(toolUseId?)` moves a running task to the background (`sdk.d.ts:3221-3234`). Without `perTaskStopAffordance: true`, an interrupt kills every background task. With it, an interrupt stops only the Turn (`sdk.d.ts:1789-1807`).

### Shells

- `BashInput.run_in_background` starts a Shell (`sdk-tools.d.ts:826-829`). The tool result reads "Command running in background with ID: {id}. Output is being written to: {path}" (`cc.txt:312863`). `BashOutput.backgroundTaskId` holds the id (`sdk-tools.d.ts:3279`).
- Output goes to a file, `<tmp>/<session>/tasks/<id>.output` (`cc.txt:309355`). The SDK sends no output deltas.
- The model-facing BashOutput tool is gone. `TaskOutput` is in the CLI's removed-tool set (`cc.txt:313014`), and the SDK tells consumers to read the output file instead (`sdk.d.ts:7238`). `KillShell` and `KillBash` are now aliases of `TaskStop` (`cc.txt:318508`, `sdk-tools.d.ts:969-978`).
- `getTaskOutput(taskId)` exists in `sdk.mjs` but not in the `Query` type. It returns the last 8 KiB, and only for shell and Monitor tasks (`sdk.d.ts:4209-4234`).
- A Shell sends `task_started` with `task_type: 'local_bash'` and `is_backgrounded` (`sdk.d.ts:6059-6061`). It sends `task_notification` when it settles (`sdk.d.ts:3226`).
- No call lists Shells. `background_tasks_changed` is the live set.
- **Lifetime.** A Shell outlives the Turn. A Shell that a synchronous Subagent started ends with that Subagent's final response (`sdk-tools.d.ts:3292-3295`). An interrupt kills it unless the consumer declares `perTaskStopAffordance` (above). Every Shell dies with the CLI process (`paseo/docs/agent-lifecycle.md:31-37`).
- No exit code is reported. `task_notification.status` is `completed`, `failed`, or `stopped`.

## 2. Codex

### Subagents

**The tool call item.** `CollabAgentToolCall` has `id`, `tool`, `status`, `senderThreadId`, `receiverThreadIds`, `prompt?`, `model?`, `reasoningEffort?`, and `agentsStates: {threadId: {status, message?}}` (`app-server-protocol/src/protocol/v2/item.rs:374-395`).

- `tool` is one of `spawnAgent`, `sendInput`, `resumeAgent`, `wait`, `closeAgent`, `sendMessage`, `followupTask`, `interruptAgent`, `listAgents` (`item.rs:1125-1135`).
- On a spawn, `receiverThreadIds` holds the new child thread (`item.rs:384-386`).
- A state is `pendingInit`, `running`, `interrupted`, `completed`, `errored`, `shutdown`, or `notFound`. `message` holds the final answer or the error (`item.rs:1281-1331`).
- `SubAgentActivity {kind: started | interacted | interrupted | completed, agentThreadId, agentPath}` is a sibling item from the multi-agent v2 tools (`item.rs:397-402`, `item.rs:1260-1265`).
- Both arrive through `item/started` and `item/completed`, which carry `startedAtMs` and `completedAtMs` (`item.rs:1337-1344`, `item.rs:1415-1422`).

**Child threads.** A Subagent is a full Codex thread with a UUIDv7 id (`protocol/src/thread_id.rs:28-31`).

- Core creates it with `SessionSource::SubAgent(ThreadSpawn {parent_thread_id, depth, agent_path, agent_nickname, agent_role})` (`core/src/agent/control/spawn.rs:703-783`).
- `Thread` carries `parentThreadId`, `source`, `agentNickname`, `agentRole`, `model`, and `reasoningEffort` (`v2/thread_data.rs:218-281`).
- The app-server attaches a listener to every new thread for every connection (`app-server/src/lib.rs:1282-1300`). Child items, `turn/started`, `turn/completed`, and `thread/status/changed` arrive on the same connection with the child's `threadId`. No subscribe call is needed.
- No `thread/started` is sent for a child (`thread_processor.rs:1650` is the thread/start path). The first sign of a child is the spawn item or a notification for an unknown `threadId`.
- `thread/tokenUsage/updated {threadId, turnId, tokenUsage}` reports each child's tokens (`v2/thread.rs:1894-1898`).
- No duration field exists. Child Turns give start and end times.
- A child can get more work later through `sendInput`, so it can have many Turns.
- A child does not take direct input from the user (`app-server/tests/suite/v2/turn_start.rs:4562`).

**Reading a Subagent later.** Children persist as rollouts. `thread/read {threadId, includeTurns: true}` returns their history (`v2/thread.rs:1687-1695`). `thread/list` hides them unless `sourceKinds` includes `subAgent` (`app-server/src/filters.rs:6-15`). `thread/loaded/list` returns only ids (`v2/thread.rs:1641-1659`).

**Control.** `turn/interrupt {threadId, turnId}` on the child's thread stops one Subagent (ACP RFD, `docs/rfds/subagents.mdx:972-976`).

### Shells

**The item.** `CommandExecution` has `command`, `cwd`, `processId?`, `source`, `status`, `aggregatedOutput?`, `exitCode?`, and `durationMs?` (`item.rs:291-326`). `source` is `agent`, `userShell`, `unifiedExecStartup`, or `unifiedExecInteraction` (`item.rs:1111-1120`).

**A long-running command.** Unified exec is on by default (`features/src/lib.rs:1013-1024`).

- A process that is still alive after the first wait is stored, and its item stays `inProgress` (`core/src/unified_exec/process_manager.rs:595-620`).
- `item/completed` arrives from a watcher only when the process exits, with `exitCode` and `durationMs` (`core/src/unified_exec/async_watcher.rs:154-245`).
- `item/commandExecution/outputDelta {threadId, turnId, itemId, delta}` keeps arriving after the Turn ends, with the original `turnId` (`async_watcher.rs:56-151`, `item.rs:1503-1510`). Deltas are at most 8 KiB each (`async_watcher.rs:42`).
- `item/commandExecution/terminalInteraction {itemId, processId, stdin}` reports what the Agent wrote to the process (`item.rs:1494-1500`). The App has no call to write to it.
- Process ids are random integers, and a thread keeps at most 64 processes (`process_manager.rs:449-474`, `core/src/unified_exec/mod.rs:81`).

**Listing and stopping.** These methods are experimental and need the `experimentalApi` opt-in (`app-server-protocol/src/protocol/common.rs:748-765`, `protocol/v1.rs:53`):

- `thread/backgroundTerminals/list {threadId}` returns `{itemId, processId, command, cwd}[]`. `osPid`, `cpuPercent`, and `rssKb` are always null (`app-server/src/request_processors/thread_processor.rs:2403-2431`).
- `thread/backgroundTerminals/terminate {threadId, processId}` returns `{terminated}` (`thread_processor.rs:2433-2449`).
- `thread/backgroundTerminals/clean {threadId}` stops all of them (`thread_processor.rs:2387-2401`).

**Lifetime.** A process outlives the Turn and survives an interrupt (`core/tests/suite/unified_exec.rs:2843-3022`). It ends on terminate, clean, or thread shutdown (`core/src/session/handlers.rs:299-311`).

**The TUI.** `/ps` lists background terminals from items the TUI has seen, keyed by `processId`. `/stop` calls `clean` (`tui/src/slash_command.rs:75-77`, `tui/src/app/thread_routing.rs:961-965`). `/subagents` opens a picker of child threads (`tui/src/app/session_lifecycle.rs:35-74`).

## 3. Old Argo

**Subagents worked end to end.**

- A separate `session_subagent` table keyed by `(harness, native_id)` held `parent_session_id`, `label`, and `state` (`src/database/session-subagent/schema.ts:4-29`). The Session List hid any Session stored there (`src/domains/sessions/main/api/session-list.ts:216-243`).
- Claude children came from `listSubagents`; Codex children from `thread_spawn.parent_thread_id` (`src/harnesses/claude/session/claude-session-discovery.ts:97-110`, `src/harnesses/codex/session/codex-session-discovery.ts:21-25`).
- Claude lifecycle came from the parent's own records: the `Agent` call, "Async agent launched", `task_*` messages, and `<task-notification>` (`src/harnesses/claude/session/claude-feed-projection.ts:12-268`). `parent_tool_use_id` was never read (`claude-session-channel.ts:178`).
- Codex live notifications for other threads were dropped (`src/harnesses/codex/session/codex-session-channel.ts:437`).
- A Subagent's Feed had no live channel. It was re-read every 2 s with `getSubagentMessages` or `thread/read` (`src/domains/sessions/main/feed/feed-reader.ts:131-172`).
- The UI had a "Subagents" header menu and opened the Subagent's Feed in the side inspector with the same Feed component (`src/domains/sessions/renderer/inspector/session-delegation-inspector.tsx:32-103`).
- Rows were meant to show model · duration · tokens (`work/presentation/work-presentation.ts:42-47`). Usage always came back empty, and `startedAt` and `endedAt` were always null (`src/domains/sessions/main/api/session-work-reads.ts:26-30`, `screens/session-screen-subagents.ts:13,38`).

**Shells existed only in the UI.** `SessionShellCommand {id, command, label, background, state, startedAt, endedAt, outputPath, result}` had a header menu and a terminal inspector that polled every 500 ms (`src/domains/sessions/renderer/types.ts:24-44`, `work/use-session-work.ts:34-52`). The Server always answered `absent` (`session-work-reads.ts:21-25`). There was no kill control. Codex `processId` and `source` were ignored.

**What it learned.**

- A Subagent's spend sits in a sidechain, so read it from the delegating tool call's result (`docs/domain/l3-runtime-tree.md:53-56`).
- A label or group that the Agent did not give stays absent (`l3-runtime-tree.md:63-78`).
- Argo reported idle at `result` while background tasks still ran (`docs/research/claude-live-session-status-and-activity.md:44`).
- No real recording covers `task_*` messages, a non-null `parent_tool_use_id`, or a Shell stream. The fixtures were written by hand (`apps/desktop/mocks/cli/claude/fixtures/sessions/shellRunning.jsonl:5-9`, `subagentTail.jsonl:4-6`). A Codex recording has a child thread and a unified exec item (`apps/desktop/mocks/recordings/codex-app-server/0.157.0/thread-read-subagents.json:57-182`, `external-threads.json:117-118`).

## 4. T3 Code and Paseo

**T3 Code** makes each Subagent a child thread.

- `OrchestrationV2Subagent` holds `childThreadId`, `prompt`, `title`, `model`, `status`, `progress`, `result`, `startedAt`, and `completedAt`, but no tokens (`t3code/packages/contracts/src/orchestrationV2.ts:631-668`).
- Claude: `task_started` creates the child thread and writes the prompt as its first message. Frames with `parent_tool_use_id` go to the child thread. Frames that arrive before `task_started` are buffered (`t3code/apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts:4112-4240`, `:4515-4526`, `:5772-5802`). `local_bash` tasks are kept out of this path (`:1692-1695`).
- Codex: `spawnAgent` registers each receiver thread, and a `turn/started` for an unknown thread counts as a Subagent Turn (`CodexAdapterV2.ts:2680-2706`, `:3882-3907`).
- UI: a timeline row opens the child thread. The child has a read-only bar instead of a composer, and is hidden from the sidebar (`t3code/apps/web/src/components/chat/ProviderSubagentBar.tsx:13-27`, `Sidebar.tsx:2669-2671`).
- Background commands are `{taskId, description, kind: subagent | command | monitor}` with a composer banner and no output view (`orchestrationV2.ts:764-796`). Codex stop uses `backgroundTerminals/terminate`, then checks `list` (`CodexAdapterV2.ts:2043-2080`). It ignores `outputDelta`.
- Its Claude adapter says it cannot expose child ids, wait, or close, while Codex can (`ClaudeAdapterV2.ts:236-243`, `CodexAdapterV2.ts:295-301`).

**Paseo** keeps "provider subagents" apart from its own agents, in memory.

- `ProviderSubagentDescriptor` holds `id`, `parentAgentId`, `title`, `status`, `toolCallId`, and timestamps, with no model or tokens. Claude packs model and tokens into a display-only `subtitle` (`paseo/packages/server/src/server/agent/provider-subagents/store.ts:10-26`, `providers/claude/subagents/presentation.ts:14-25`).
- Claude lifecycle comes from `task_*` messages for `local_agent` only (`providers/claude/subagents/live-source.ts:13-68`). History comes from the `subagents/` folder on replay (`providers/claude/agent.ts:5835-5860`).
- Codex notifications are routed by `threadId`. An unknown thread is buffered until its spawn item arrives (`providers/codex-app-server-agent.ts:5521-5527`).
- UI: a Subagents panel opens a read-only tab with the same stream view (`paseo/packages/app/src/panels/provider-subagent-panel.tsx:110-261`).
- Shells have no type. Codex output deltas are held until the command completes (`codex-app-server-agent.ts:6064-6074`). There is no list and no kill.

## 5. ACP

The ACP subagents RFD makes a Subagent its own session, not a tool call (`docs/rfds/subagents.mdx:12-21`, `:1116-1124`).

- `subagent_update` on the parent announces the child and patches its `title`, `description`, `state`, and `capabilities.cancel` (`subagents.mdx:83-153`).
- Child updates then flow on the child's own session id (`subagents.mdx:204-215`).
- Messages between sessions are `session_message` rows with `senderSessionId` and `recipientSessionId`, not user messages (`subagents.mdx:249-300`).
- State is `running`, `idle` with a stop reason, `requires_action`, or `unknown`. There is no finished state, because a child can get more work (`subagents.mdx:464-537`).
- Parent and child costs must not be added together (`subagents.mdx:843-873`).

ACP has nothing for Shells. ADR 0006 already notes that ACP cannot carry background tasks.

## Proposed model

### Subagent

**A Subagent is a child `session` row.** It has `parentSessionId`, the parent's `agent`, and the parent's Checkout. Its `vendorSessionId` is the Claude `agentId` or the Codex child `threadId`. This matches the glossary ("A Session that another Session started"), the ACP RFD, T3 Code, and old Argo's inspector.

**The parent's actor writes the child's Feed.** The Subagent has no Session actor and no agent machine of its own.

- The parent's adapter routes each vendor message by `parent_tool_use_id` (Claude) or `threadId` (Codex). It sends `agent.feed {change, sessionId}` with the child's Argo id.
- The parent Session invokes one feed actor per open child and passes each change to it. The database writer is already one per Engine, so nothing changes there.
- The adapter buffers child traffic that arrives before the spawn, as T3 Code and Paseo do. It never guesses a parent (`subagents.mdx:178-182`).
- Spec 0002 line 126 says a Subagent's updates show only as `subagent_update` rows. This proposal changes that line. No ADR is contradicted.

**The child's Feed.**

- The first row is the prompt. ADR 0012 rules out a `user_message`, so use the ACP name `session_message` with `_meta.argo.senderSessionId` set to the parent. A Codex `sendInput` adds one more.
- Then the usual rows: Agent messages, Agent thoughts, and Tool calls.
- Each run of work is a `turn` row on the child. That gives `startedAt`, `endedAt`, `stopReason`, and `usage` without new columns. A Claude Subagent has one Turn. A Codex child can have several.
- After an Engine restart, or for a Claude Subagent that streams nothing, the Server rebuilds the child's rows from `getSubagentMessages` or `thread/read`. ADR 0005 already allows a rebuild from the vendor record.

**The parent's Feed keeps one `subagent_update` row per child.** It is the standalone row that the presentation spec asks for ("{name} started working", "{name} finished"). Add to `_meta.argo`: `toolCallId`, `action` (`spawn`, `message`, `wait`, `close`), and `result` (the final text). Keep `subagentState` as ACP's `running`, `idle`, or `requires_action`.

**Contract: `Subagent`** (a read model, from the `session` and `turn` rows):

| Field | Claude | Codex |
|---|---|---|
| `sessionId`, `parentSessionId` | Argo ids | Argo ids |
| `toolCallId` | `tool_use_id` | `CollabAgentToolCall.id` |
| `title` | `description` | `agentNickname`, else `agentRole` |
| `role` | `subagent_type` | `agentRole` |
| `model` | `resolvedModel`, else `message.model` | `model` on the spawn item, else `Thread.model` |
| `state` | `running` from `task_started` to `task_notification` | from child `turn/started`, `turn/completed`, `thread/status/changed` |
| `stopReason` of the last Turn | `completed` → `end_turn`, `failed` → `error`, `stopped` → `cancelled` | `completed`, `errored`, `interrupted` |
| `startedAt`, `endedAt`, `durationMs` | arrival times; `usage.duration_ms` or `totalDurationMs` | child Turn times; `startedAtMs`, `completedAtMs` |
| `tokens` | `usage.total_tokens` or `totalTokens` | `thread/tokenUsage/updated` total |
| `canCancel` | `stopTask` | `turn/interrupt` on the child |

Running means the latest Turn is `running`. Finished means it has ended. A Codex child that gets more work moves back to Running.

The `session` row needs `title`, `role`, and `parentToolCallId`. These can live in `vendorRef` or as new columns. The model belongs on the Turn, because a Codex child can change it.

### Shell

**A Shell is not a Session.** It needs a glossary entry: "A command an Agent started in the background, which keeps running while the Turn goes on." It belongs to one Session.

**Contract: `Shell`**, in a new `shell` table keyed by `(sessionId, id)`:

| Field | Claude | Codex |
|---|---|---|
| `id` | `backgroundTaskId` / `task_id` | `processId` |
| `toolCallId` | the Bash `tool_use.id` | `CommandExecution.id` |
| `command`, `cwd` | Bash input | item `command`, `cwd` |
| `status`: `running`, `completed`, `failed`, `stopped`, `lost` | `task_notification.status` | `item/completed` status |
| `exitCode` | not given | `exitCode` |
| `startedAt`, `endedAt`, `durationMs` | arrival times; `usage.duration_ms` | item times; `durationMs` |
| `output` | tail the `.output` file | append `outputDelta` |

- **Output.** The Server is on the same machine, so it tails the Claude output file. For Codex it appends deltas to its own file under `~/.argo/`. A finished Shell's output becomes a blob under ADR 0005. A `shell.output` subscription sends the tail and then new bytes, like `row.append`.
- **List.** The `shell` table is the list. Claude `background_tasks_changed` and Codex `backgroundTerminals/list` correct it. A Shell that neither still reports after an Agent restart becomes `lost`.
- **Stop.** Claude `stopTask(taskId)`. Codex `backgroundTerminals/terminate`. The Claude adapter must set `perTaskStopAffordance: true`, or a cancelled Turn kills every Shell and background Subagent.
- **Feed.** A Shell starts as the `execute` Tool call that launched it, with `_meta.argo.shellId`. The Claude completion that ADR 0012 maps to `task_update` gains `_meta.argo.shellId` or `subagentSessionId`, so the row links to the Shell or the Subagent.
- **Session state.** A Session with a running Shell or Subagent is `idle` for prompts, but the snapshot should report the running count, so the App does not show the Session as done.

### Parity gaps

**Claude cannot:**

- give a Shell's exit code, or stream its output (Argo tails a file);
- list Shells or Subagents with a call; it gives only the `background_tasks_changed` set;
- report start and end times; Argo stamps arrival times;
- be sent more work after it finishes, as far as the types show. A named Agent is addressable with `SendMessage` only "while running" (`sdk-tools.d.ts:785`), so a Claude Subagent never goes back to Running;
- stream a backgrounded Subagent's messages, if Paseo is right. Argo then reads `getSubagentMessages` while it runs. A recording must settle this.

**Codex cannot:**

- give a Subagent a description; it has only a nickname and a role;
- give a Subagent's duration as a field; Argo uses child Turn times;
- list or stop Shells without the experimental API;
- send the first event for a child before the spawn item, or a `thread/started` for it;
- report OS pid, CPU, or memory for a Shell.

**Both:** Shells die with the Agent process. After an Engine restart or an Agent crash, Argo marks them `lost`. Parent and child token counts overlap, so the App never adds them up.

### Before building

1. Record real streams into `mocks/cli/claude/` and `mocks/cli/codex/`: a foreground Subagent, a background Subagent with and without `forwardSubagentText`, a background Bash, `stopTask`, a Codex spawn with `sendInput`, and a unified exec process that outlives the Turn.
2. Amend spec 0002 line 126 and add Shell to `GLOSSARY.md`.
3. Decide whether `session.list` hides child Sessions, as old Argo and T3 Code do.
