# Codex sub-agents: how a parent learns that a child finished, failed, or needs the user

Researched 2026-11-20. Goal: know how Codex notifies a parent thread of child (spawned agent) events, so Argo can decide how a parent Agent hears about a child Agent's completion, failure, approval requests, and stalls.

## Sources

- **Codex source**: openai/codex at `a0a30c4` (2026-11-20, shallow clone of `main`). Paths are under `codex-rs/`. Permalinks use `https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/<path>#L<n>`; below they are shortened to `path:line` and link to that form.
- **Codex docs**: [Subagents](https://developers.openai.com/codex/subagents.md) (the page is shared by the app, CLI and IDE through per-surface sections). No Codex-app-specific page describes sub-agent notifications beyond that page.
- **Not read**: the Codex desktop app is closed source, so claims about it rest on the docs page only. No blog posts or third-party write-ups were used.
- **Caveat**: Codex has two tool generations, "v1" (`multi_agent` feature, deprecated, default on) and "v2" (`multi_agent_v2`, stable, default off) ([`features/src/lib.rs:1713-1721`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/features/src/lib.rs#L1713-L1721)). They differ in how a child's result reaches the parent, so each answer is split by version.

## Short answer

- **Completion and failure are pushed, queued, and never start a parent turn.** When a child reaches a final status, a detached watcher or the child's turn-end hook puts a message in the parent's input. The parent model reads it at its next sampling step. The parent also has a `wait_agent` tool that blocks until something arrives.
- **Approvals and user input are not routed to the parent model at all.** The child is its own thread; its approval request goes to the client (TUI, app) tagged with the child's `threadId`. The person answers it. The parent agent never sees it.
- **No stuck or timeout detection exists on the child.** The only timeout is the parent's own `wait_agent` deadline.

## 1. Push vs poll

Both. The child's final status is pushed into the parent's input queue; `wait_agent` and `list_agents` are how the parent model blocks on or inspects that.

### Status model

- `AgentStatus` is `PendingInit`, `Running`, `Interrupted`, `Completed(Option<String>)`, `Errored(String)`, `Shutdown`, `NotFound` ([`protocol/src/protocol.rs:2092-2108`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/protocol/src/protocol.rs#L2092-L2108)). `Completed` carries the child's last assistant message.
- It is derived from the child's own events: `TurnStarted` is `Running`, `TurnComplete` is `Completed` or `Errored` (when the turn carries an error), `TurnAborted` is `Interrupted` or `Errored`, an `Error` event is `Errored` ([`core/src/agent/status.rs:6-23`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/core/src/agent/status.rs#L6-L23)).
- "Final" means anything except `PendingInit`, `Running`, `Interrupted` ([`status.rs:26-31`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/core/src/agent/status.rs#L26-L31)). An interrupted child is therefore not "done" and sends no notification.
- There is no status for "waiting on approval" or "waiting on input" at this layer. A child blocked on approval stays `Running`. The app-server layer has such flags (see section 2).

### Push into the parent (v1)

- `maybe_start_completion_watcher` spawns a detached task per child whose source is `SubAgentSource::ThreadSpawn` ([`core/src/agent/control.rs:465-480`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/core/src/agent/control.rs#L465-L480)). It subscribes to the child's status stream until `is_final`, then ignores tree shutdown (a lifecycle handoff is not a result) ([`control.rs:482-516`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/core/src/agent/control.rs#L482-L516)).
- It then calls `parent_thread.inject_fragment_without_turn(SubagentNotification::new(child_reference, status))` ([`control.rs:566-590`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/core/src/agent/control.rs#L566-L590)).
- The injected item is a user-role message wrapped as `<subagent_notification>{"agent_path": ..., "status": ...}</subagent_notification>` ([`core/src/context/subagent_notification.rs:23-47`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/core/src/context/subagent_notification.rs#L23-L47)). `status` is the serialized `AgentStatus`, so it includes the child's final message or error string.
- The v1 `wait_agent` tool description says so: "Once the agent reaches a final status, a notification message will be received containing the same completed status" ([`core/src/tools/handlers/multi_agents_spec.rs:287-300`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/core/src/tools/handlers/multi_agents_spec.rs#L287-L300)).

### Push into the parent (v2)

- When the child has an `agent_path` and the child uses v2, the same watcher sends an `InterAgentCommunication` from the child's path to the parent's path with `trigger_turn: false`, kind `CompletionWatcher` ([`control.rs:519-558`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/core/src/agent/control.rs#L519-L558)).
- The child's turn end also calls `notify_parent_of_terminal_turn`, which builds the same message with kind `Result` and `trigger_turn: false` ([`core/src/agent/control/completion.rs:28-130`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/core/src/agent/control/completion.rs#L28-L130); wired at [`agent/control/api.rs:303`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/core/src/agent/control/api.rs#L303)). It is queue-only delivery that retains an unconfirmed result until the parent history append is confirmed (`MessageDelivery`, `ResultWrite` in [`core/src/agent_communication.rs:114-200`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/core/src/agent_communication.rs#L114-L200)). Both paths exist in the source; which one a given result takes is unconfirmed.
- Message text per status ([`core/src/session_prefix.rs:20-42`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/core/src/session_prefix.rs#L20-L42)):
  - `Completed(Some(msg))`: the child's final message verbatim.
  - `Errored(e)`: "Agent errored: <truncated e>" plus a next-action hint.
  - `Shutdown`: "Agent shut down." `NotFound`: "Agent was not found."
  - `Running`, `PendingInit`, `Interrupted`: no message.
- A child stopped by the auto-review "too many denials" guard gets a distinct "Agent interrupted by Guardian" message ([`completion.rs:63-72`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/core/src/agent/control/completion.rs#L63-L72)).
- A `SubAgentActivity` item with kind `Completed` is also emitted into the initiating thread's event stream, which is what UIs draw ([`completion.rs:57-87`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/core/src/agent/control/completion.rs#L57-L87)).

### Poll tools

| Tool | Version | What it does | Source |
| --- | --- | --- | --- |
| `spawn_agent` | v1, v2 | Creates the child thread and returns its id or task name | [`multi_agents_spec.rs:70-110`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/core/src/tools/handlers/multi_agents_spec.rs#L70-L110) |
| `wait_agent` (v1) | v1 | Takes `targets` (agent ids) and `timeout_ms`; returns each final status (with final message) or an empty status on timeout | [`multi_agents/wait.rs:60-341`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/core/src/tools/handlers/multi_agents/wait.rs#L60-L341) |
| `wait_agent` (v2) | v2 | Takes only `timeout_ms`; blocks until any mailbox activity or steered user input; returns `{message, timed_out}` and not the content | [`multi_agents_v2/wait.rs:35-135`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs#L35-L135); spec at [`multi_agents_spec.rs:303-312`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/core/src/tools/handlers/multi_agents_spec.rs#L303-L312) |
| `list_agents` | v2 | Lists live agents in the tree with their last known status; takes an optional `path_prefix` | [`multi_agents_v2/list_agents.rs:34-60`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs#L34-L60) |
| `send_input` / `send_message` / `followup_task` | v1 / v2 | Message an existing agent. `send_message` "does not trigger a new turn"; `followup_task` triggers one if the target is idle | [`multi_agents_spec.rs:194-256`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/core/src/tools/handlers/multi_agents_spec.rs#L194-L256) |
| `interrupt_agent`, `close_agent`, `resume_agent` | v2, v1, v1 | Stop the child's turn, close it, reopen a closed one | [`multi_agents_spec.rs:273-371`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/core/src/tools/handlers/multi_agents_spec.rs#L273-L371) |

- `wait_agent` v2 does not consume the mailbox. It subscribes to input activity and returns on `Mailbox` or `Steer` ([`core/src/thread_input.rs:1-70`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/core/src/thread_input.rs#L1-L70)). The mail itself still arrives as input.
- The spawn prompt tells the parent not to poll: "Call wait_agent very sparingly... Do not repeatedly wait by reflex" ([`multi_agents_spec.rs:757-762`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/core/src/tools/handlers/multi_agents_spec.rs#L757-L762)). The design intent is push, with `wait_agent` as the blocking escape hatch.

## 2. What the person sees

### TUI

- **Docs**: "In interactive CLI sessions, approval requests can surface from inactive agent threads even while you are looking at the main thread. The approval overlay shows the source thread label, and you can press `o` to open that thread before you approve, reject, or answer the request" ([Subagents, Approvals and sandbox controls](https://developers.openai.com/codex/subagents.md)). `/subagents` switches between agent threads.
- **Routing in code**: a server request carries the child's `thread_id` (for example `CommandExecutionRequestApprovalParams.thread_id`, [`app-server-protocol/src/protocol/v2/item.rs:1691-1697`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/app-server-protocol/src/protocol/v2/item.rs#L1691-L1697)). For an unknown thread the TUI does a `thread/read` and, if its source is `SubAgent(ThreadSpawn { parent_thread_id })` and it owns that parent, adopts the request ([`tui/src/app/app_server_events.rs:872-905`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/tui/src/app/app_server_events.rs#L872-L905)).
- **Inactive-thread approval**: `push_thread_interactive_request` shows the approval overlay for a thread that is not focused and renders a patch preview ([`tui/src/app/thread_routing.rs:487-525`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/tui/src/app/thread_routing.rs#L487-L525)).
- **Picker badge**: `refresh_pending_thread_approvals` puts each non-focused thread with a pending approval into `agent_navigation.pending_approvals`, and the picker redraws ([`thread_routing.rs:1083-1118`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/tui/src/app/thread_routing.rs#L1083-L1118)).
- **Status labels**: the sidebar and picker states are Starting, Running, Waiting, Idle, Completed, Stopped, Failed, Closed, Unavailable. App-server `Active` with non-empty flags maps to Waiting, `SystemError` to Failed ([`tui/src/app/sidebar_agent_status.rs:10-66`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/tui/src/app/sidebar_agent_status.rs#L10-L66)). An observed outcome is kept across later idle notifications: "idle alone never implies completion" (same file, lines 1-2).
- **Side conversations**: a side chat shows the parent's state as "main needs approval" / "main needs input" / failed / finished ([`tui/src/app/side.rs:28-70`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/tui/src/app/side.rs#L28-L70)). That is for parent status, not child status.
- **`/subagents` status cell**: shows the last three preview lines of each running agent's recent items ([`tui/src/app/agent_status_feed.rs:1-120`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/tui/src/app/agent_status_feed.rs#L1-L120)).

### App-server protocol (what any client gets)

- `thread/status/changed` carries `ThreadStatus::Active { activeFlags }` with flags `waitingOnApproval` and `waitingOnUserInput`, plus `Idle`, `SystemError`, `NotLoaded` ([`app-server-protocol/src/protocol/v2/thread.rs:1805-1822`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/app-server-protocol/src/protocol/v2/thread.rs#L1805-L1822); method at [`common.rs:2087`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/app-server-protocol/src/protocol/common.rs#L2087); flag computation in [`app-server/src/thread_status.rs:440-450`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/app-server/src/thread_status.rs#L440-L450)). This is the "child needs attention" signal for any client, per child thread.
- Server requests: `item/commandExecution/requestApproval`, `item/tool/requestUserInput`, `mcpServer/elicitation/request` ([`common.rs:1939-1960`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/app-server-protocol/src/protocol/common.rs#L1939-L1960)), and file-change, permissions and legacy variants.
- Thread items in the parent's stream: `CollabAgentToolCall` (tool `Wait`, `SpawnAgent`, `SendInput`, `ListAgents`, ...) and `SubAgentActivity` with kinds `Started`, `Interacted`, `Interrupted`, `Completed` ([`agent_status_feed.rs:106-140`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/tui/src/app/agent_status_feed.rs#L106-L140)).

### Codex desktop app

- The docs say only: "Open a subagent thread from the activity shown in the main thread to inspect its work. Ask Codex directly to steer a running subagent, stop it, or close completed subagent threads" and "Subagents inherit the permission mode selected beneath the composer" ([Subagents](https://developers.openai.com/codex/subagents.md)).
- Whether the app shows a per-thread badge, a notification, or surfaces the child's approval inside the parent thread: unconfirmed (closed source, undocumented).

## 3. Parent busy (mid-turn)

- **v1 notification** (`inject_fragment_without_turn` then `inject_no_new_turn`): if the parent has a running turn that is not finishing, the item is appended to that turn's pending input via `inject_if_running` and the notification is picked up by the running turn. If the parent is idle, it waits for any finishing turn to end, then records the item in history **without starting a turn** ([`core/src/session/inject.rs:70-91, 220-247`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/core/src/session/inject.rs#L70-L247)). The model reads it on the person's next prompt.
- **v2 mailbox**: there is a per-session mailbox.
  - `InputQueue` holds `mailbox_pending_mails: VecDeque<PendingMailboxCommunication>`. `enqueue_mailbox_communication` pushes and signals `InputQueueActivity::Mailbox` on a watch channel ([`core/src/session/input_queue.rs:162-260`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/core/src/session/input_queue.rs#L162-L260)). An unloaded thread gets an eviction mailbox (`runtime.mailboxes.enqueue`) that is read on reload ([`control.rs:300-330`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/core/src/agent/control.rs#L300-L330)).
  - `should_preempt_sampling_for_mail` makes an active turn pick the mail up at the next sampling boundary, if the turn "still accepts mail" ([`input_queue.rs:268-290`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/core/src/session/input_queue.rs#L268-L290)). `drain_mailbox_input_items` turns the queue into `TurnInput::InterAgentCommunication` items ([`input_queue.rs:353-363`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/core/src/session/input_queue.rs#L353-L363)).
  - If a turn is past the point of accepting mail, `defer_mailbox_delivery_to_next_turn` keeps queue-only mail pending for the next turn "without sampling again" ([`input_queue.rs:434-455`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/core/src/session/input_queue.rs#L434-L455)). A feature `defer_mailbox_preemption` exists; its exact effect: unconfirmed ([`features/src/lib.rs:273`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/features/src/lib.rs#L273)).
- **Idle parent**: completion mail has `trigger_turn: false`, so it does not start a turn. `maybe_start_turn_for_pending_work` starts one only for `trigger_turn` mail, durable sleep, or a root with the `wake_on_agent_messages` feature ([`core/src/tasks/mod.rs:568-590`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/core/src/tasks/mod.rs#L568-L590); [`session/turn_input.rs:1004-1013`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/core/src/session/turn_input.rs#L1004-L1013)). That feature is `UnderDevelopment` and off by default ([`features/src/lib.rs:1754-1758`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/features/src/lib.rs#L1754-L1758)). So by default, a finished child does not wake an idle parent.
- **Blocked parent**: a parent inside `wait_agent` is woken by `Mailbox` (any v2 mail) or `Steer` (new user input) activity ([`thread_input.rs:12-20`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/core/src/thread_input.rs#L12-L20)).
- Pending mail depth is exported as the gauge `core.mailbox.pending` ([`agent_communication.rs:17`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/core/src/agent_communication.rs#L17)).

## 4. Approval routing

- **Not to the parent model.** No code path forwards a thread-spawned child's exec, patch or permission request into the parent's conversation. The child is a full thread with its own session; its approval request is emitted on the child's event stream and reaches the client with the child's `thread_id` (section 2). The person answers it in the UI.
- **Settings are inherited, not delegated.** "Subagents inherit the parent turn's current sandbox and approval settings, including changes made with `/permissions` or `--yolo`. A custom agent file can't replace those settings" ([Subagents](https://developers.openai.com/codex/subagents.md)).
- **No UI available.** "In non-interactive flows, or whenever a run can't surface a fresh approval, an action that needs new approval fails and Codex surfaces the error back to the parent workflow" (same page). In that case the failure comes back as a tool error in the child, and the child's final status reaches the parent through the completion path.
- **Child status while blocked.** The child's `AgentStatus` stays `Running`. Only the app-server `activeFlags` (`waitingOnApproval`, `waitingOnUserInput`) show the block. The parent model gets no signal until the child finishes.
- **User input and elicitation.** `item/tool/requestUserInput` and `mcpServer/elicitation/request` go through the same client-facing route; the TUI classes them as "needs input" and "needs approval" ([`tui/src/app/side.rs:62-80`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/tui/src/app/side.rs#L62-L80)). Whether `request_user_input` is blocked for sub-agents: unconfirmed (no sub-agent check found in [`request_user_input.rs`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/core/src/tools/handlers/request_user_input.rs)).
- **Internal delegates are different.** `codex_delegate` (used for review and auto-review helpers, not for `spawn_agent`) requires approval policy `never`, so a delegate never asks ([`core/src/codex_delegate.rs:50-76`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/core/src/codex_delegate.rs#L50-L76)). A child is stopped after too many auto-review denials (see section 1).

## 5. The child's final message

- It is carried inside the notification: in v1 as `status.completed` in the `<subagent_notification>` JSON, in v2 as the plain `content` of an `InterAgentCommunication` from the child's path to the parent's path ([`session_prefix.rs:25-27`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/core/src/session_prefix.rs#L25-L27)). It is the child's `last_agent_message` from `TurnComplete` ([`status.rs:10-13`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/core/src/agent/status.rs#L10-L13)).
- v1 `wait_agent` also returns it directly (final statuses by agent id).
- v2 `wait_agent` returns no content, only "Wait completed." or "Wait timed out." ([`multi_agents_v2/wait.rs:139-160`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs#L139-L160)). The content arrives as separate mail.
- A completed child stays open and counts toward the concurrency limit until `close_agent` ([`multi_agents_spec.rs:347`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/core/src/tools/handlers/multi_agents_spec.rs#L347)).
- Docs: "The main thread collects the subagent results into its final response" and "Codex waits until all requested results are available, then returns a consolidated response" ([Subagents](https://developers.openai.com/codex/subagents.md)).

## 6. Stuck and timeout

- **No watchdog.** No code was found that times out, pings, or flags a child that runs too long or sits blocked on an approval. Nothing pushes a "stuck" event to the parent.
- **The only timeout is the parent's `wait_agent`.**
  - v2 defaults: min 10 s, default 30 s, max 3600 s, configurable through `multi_agent_v2` ([`core/src/config/mod.rs:281-283`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/core/src/config/mod.rs#L281-L283)). A request above the max is an error; one below the min is raised to it and the result says so ([`multi_agents_v2/wait.rs:54-70, 139-160`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs#L54-L70)).
  - On timeout the tool returns `timed_out: true`. The child is untouched; the parent decides to wait again, `interrupt_agent`, or `close_agent`.
  - The v1 handler clamps to `MIN_WAIT_TIMEOUT_MS` and `MAX_WAIT_TIMEOUT_MS` and returns an empty status map on timeout ([`multi_agents/wait.rs:96-103`](https://github.com/openai/codex/blob/a0a30c40e8dbcc44af52e2df64dcce64368d4422/codex-rs/core/src/tools/handlers/multi_agents/wait.rs#L96-L103)).
- **Failure is a status, not a timeout.** A child error, abort (not an interrupt), or shutdown becomes `Errored` or `Shutdown` and is pushed like a completion.
- **Quota.** `agents.max_concurrent_threads_per_session` caps open spawned threads ([Subagents](https://developers.openai.com/codex/subagents.md)); a parent that never closes completed children can hit it.

## Takeaways for Argo

- Codex's model is push-with-pull: the child's final status is pushed into the parent's input as a non-turn-starting message; the model may block on `wait_agent`; and it may list agents.
- A pushed completion does not wake an idle parent by default. Codex keeps that behind an off-by-default feature (`wake_on_agent_messages`).
- Approvals and user input never enter the parent's conversation. They are client-visible thread-scoped requests, with an `activeFlags` thread-status signal for "needs the person".
- There is no child stall detection. A parent only learns of a stall by its own `wait_agent` timeout.
