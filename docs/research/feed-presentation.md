# Feed presentation: how Codex draws a Session, and what Argo should copy

Researched 2026-10-03. Argo's Feed should behave almost like Codex's, for Claude and Codex alike.

## Sources

- **TUI**: the Codex CLI at openai/codex `b741e48`. Paths are under `codex-rs/tui/src/` unless stated.
- **App**: the minified webview bundle of the Codex IDE extension 26.908.40401, which the ChatGPT desktop app shares (`~/.cursor/extensions/openai.chatgpt-26.908.40401-darwin-arm64/webview/assets/`). Citations name the file and the function.
- **Docs and issues**: learn.chatgpt.com docs linked below, and screenshots in openai/codex issues (#N).
- **Argo**: `docs/specs/0001-scaffold.md:279-310`, ADR 0005, ADR 0006, ADR 0012.

## 1. Agent thoughts

- Codex sends a reasoning summary in sections, each with a bold title.
- In the App, an Agent thought is a disclosure:
  - It reads "Thinking" while it streams, then "Thought for {elapsed}" or "Thought".
  - The body is markdown in a scroll box about 8.75rem tall, with the title removed (conversation-blocks `$H`, `eU`).
  - The live heading of the Turn uses the newest title (local-conversation-turn `initialHeading`).
- The TUI hides Agent thoughts outside Ctrl+T (`history_cell/messages.rs:323-440`). Its status line shows the newest title, or "Working" (`chatwidget/streaming.rs:9-62`).
- An Agent thought never breaks a group of Tool calls in either one (agent-activity-units `G()`, `chatwidget/activity_groups.rs:7-41`).

## 2. Grouping Tool calls

**Classification** (agent-activity-item `rn`). Each item falls into one of three classes:

- **Groupable**: commands, file edits, MCP calls, web searches, and dynamic tools.
- **Standalone**, which breaks a group: Agent messages, user messages, Compaction, Subagent rows, errors, and image views.
- **Outside the flow**, which never breaks a group: Agent thoughts, Plans, the turn diff, Plan proposals, and Permission requests.

**Grouping** (agent-activity-units):

- `Z()` merges consecutive groupable items.
- `G()` folds runs of read-only commands (read, search, list) and Agent thoughts into an "exploration" unit.
- `Ke()` draws a one-item group as a plain row, unless the item is running or the edit touches several files.

**Summary.** `Oe()` joins fixed parts in this order:

1. integrations
2. edits ("Edited a file")
3. exploration ("Read files")
4. commands ("ran commands")
5. web ("Searched the web")

The result reads like "Read files, ran commands, edited a file". The fallback is "Worked". Builds from April 2026 used counts instead, such as "Edited 3 files, explored 2 files, 2 searches" (#19891).

**Live wording** (`qe()`):

- The newest unit shows its active item: "Running {command}", "Editing files", "Searching the web for {query}", or "Thinking".
- Exploration reads "Exploring", then "Explored" (also `exec_cell/render.rs:324-326`).

**Expanded rows** (toolSummaryForCmd strings):

- Read: "Read {path}". Consecutive reads combine as "Read a.rs, b.rs" (render.rs:342-375).
- Search: "Searched for {query} in {path}".
- List: "Listed files in {path}".
- Command:
  - "Ran {command} in {elapsed}", or "Running command for {elapsed}" while it runs. A stopped command reads "Stopped {command} after {elapsed}".
  - Expanded: a "Shell" card with `$ cmd`, output, and "✓ Success" (#49928; `exec_cell/transcript.rs:17-70`).
  - Collapsed: the last 3 output lines, then "… +N lines" (`history_cell/activity_preview.rs:7`).
- A failed read or search does not end exploration (render.rs:405-427).
- MCP: "Called server.tool(args)" (`history_cell/mcp.rs:144-170`).

The TUI is stricter. It groups only exploration. Every other command gets its own cell (`exec_cell/model.rs:110-116, 233-244`).

## 3. Edits and diffs

- One file reads "Edited {file} +a −r". Several files read "Edited N files", with one line per file (`diff_render.rs:442-500`). New and removed files read "Added" and "Deleted".
- Edit rows have Undo and Review ([IDE docs](https://learn.chatgpt.com/docs/codex/ide)).
- A failed edit reads "Failed to apply patch" (`history_cell/patches.rs:107`). A large diff reads "Too large to render inline".
- After the Turn, a card shows "N files changed +a −r". It opens the Review pane on "Last turn" (#40830). The protocol sends it as `turn/diff/updated` (`app-server-protocol/src/protocol/common.rs:1968`).

## 4. Agent message streaming and phase

- Each Agent message carries a `phase`: `commentary`, `final_answer`, or absent (`protocol/src/models.rs:944`).
- Commentary streams in plain sight and closes the open group (`chatwidget/replay.rs:94-97`).
- While the Turn runs, the header reads "Working for 21s".
- When the final answer starts and the Turn is not cancelled, all earlier activity collapses, including commentary. It sits behind "Worked for {time}" with a chevron (conversation-blocks `rK()`; #28261, #47494).
- A Turn with only commentary hides everything in the fold. This is a known bug (#23221).

## 5. Plans, Turns, interruptions, errors, Compaction, Permission requests

- **Plan**: never a Feed row in the App. A sticky panel reads "{completed} out of {total} tasks completed", with numbered steps and done steps struck through. The TUI prints "Updated Plan" cells (`history_cell/plans.rs:228-270`).
- **Turn end**: "Worked for Xm Ys" is both the fold and the divider (`history_cell/separators.rs:59-94`).
- **Interruption**: the App shows "You stopped after {time}" and does not fold. The TUI shows "■ Conversation interrupted" (`chatwidget/input_restore.rs:312-335`).
- **Errors**: a red "■ message" (`history_cell/notices.rs:331-337`). Retries show "Reconnecting {n}/{max}" in the live status.
- **Compaction**: a standalone row. It reads "Compacting context", then "Context automatically compacted" (#37319). The TUI adds " · 12s" (`chatwidget/compaction.rs:42-55`).
- **Permission request**:
  - While it waits, the header reads "Awaiting approval", and the card asks "Allow {actor} to edit the following files?".
  - History keeps the outcome, for example "You approved codex to run X this time" or "You did not approve…" (`history_cell/approvals.rs:60-230`).
  - The fold label counts denied actions.

## 6. Subagents

- Rows read "Created {agent} with the instructions: …", "Messaged {agent}: {prompt}", "Waiting for N agents", and "Finished waiting", with one result per agent (`multi_agents.rs:324-463`).
- Activity rows read "{name} started working" or "{name} finished", with "Open {name} subagent". Several finish together as "A, B and N more finished".
- A Subagents panel lists "Active · n" and "Done · n" ([docs](https://learn.chatgpt.com/docs/agent-configuration/subagents)).
- Every Subagent row is standalone.

## 7. /goal

- A goal is never a Feed row.
- The user message that set it is tagged "Sent as goal".
- A row above the composer shows "Pursuing goal", "Paused goal", "Goal stalled", or "Goal achieved", with "{used} / {budget}" and controls ([long-running work](https://learn.chatgpt.com/docs/long-running-work)).
- Continuation Turns have no user message (`chatwidget/turn_runtime.rs:203-215`).
- A Turn stopped by the budget reads "Goal budget reached - the turn was stopped."

## 8. Gaps in our row kinds, and how Claude maps

Our row kinds (`docs/specs/0001-scaffold.md:279-310`) lack:

1. the `agent_message` phase, which a fold needs
2. command actions on `execute` calls: read, list, or search, with path and query
3. Tool call timing
4. a turn diff
5. Subagent action, prompt, and result
6. goals
7. who decided a Permission request

A thought title is its leading bold line. Turn times give "Worked for".

| Claude | Codex | Row | Presentation |
|---|---|---|---|
| Read | read-only command | kind `read` | Exploration "Read a, b" |
| Grep | `rg`, `grep` | kind `search` | Exploration "Searched for q in p" |
| Glob | `ls`, `fd` | kind `search`, list action | Exploration "Listed files in p" |
| Bash | CommandExecution | kind `execute` + `terminal` | Exploration when read-only, else "Ran cmd" |
| Edit, Write | FileChange | kind `edit` + `diff` | "Edited/Added path +a −r" |
| WebSearch, WebFetch | WebSearch | kind `fetch` | "Searched the web for q" |
| MCP tool | McpToolCall | kind `other` | "Called server.tool" |
| Task | Collab, SubAgentActivity | `subagent_update` | Standalone row |
| TodoWrite | turn plan | `plan_update` | Sticky panel only |
| thinking | Reasoning summary | `agent_thought` | Disclosure in group |

- Claude sends no phase. At the end of a Turn, its adapter can patch the last `agent_message` after the last Tool call to `final_answer`.
- Claude Bash needs a shared, vendor-neutral command parser that matches `shell-command/src/parse_command.rs:54`.

## Other products

- **Claude Code desktop**: Ctrl+O switches the Transcript view between Normal (summarised Tool calls), Thinking, and Verbose. Edits show "+12 -1" and open a diff pane ([docs](https://code.claude.com/docs/en/desktop)).
- **Paseo 0.9.2**: a "Summary" or "Full detail" setting. Groups read "edited 2 files, ran 3 commands and read 1 file". It also has "Worked for" (app bundle, `toolCallGroup` strings).
- **T3 Code** (`f391794a`):
  - `summarizeToolGroup` keeps the top two categories with counts and calls the rest "Performed N other actions" (`packages/client-runtime/src/work-log/presentation.ts:642`).
  - `deriveTurnFolds` folds behind "Worked for". A stopped Turn reads "You stopped after" (`apps/web/src/components/chat/MessagesTimeline.logic.ts:857`).

## Proposed presentation spec

1. **Turn fold.** A Turn settles with a `final_answer` and a stop reason other than `cancelled`. Fold every row before the answer behind "Worked for {duration}". Failed calls, errors, and pending requests stay visible. A Turn with no final answer does not fold.
2. **Live header.** While a Turn runs, show "{activity} ({elapsed} • Esc to stop)". The activity is the newest thought title. Otherwise it is the active Tool call's label, and otherwise "Working".
3. **Group.** Merge consecutive `tool_call_update` rows.
   - Agent messages, user messages, Compaction, Subagent rows, and error Notices close a group.
   - Agent thoughts, Plans, and Permission outcomes do not.
   - A finished one-item group draws as its item.
4. **Group title.** While running, use the newest item's live label. When done, join parts in this order: edits, exploration, commands, web, tools. Add " · N failed" when any call failed.
5. **Exploration.** Consecutive read, search, and list calls, plus read-only commands, form one sub-row.
   - It reads "Exploring", then "Explored".
   - Its lines read "Read a, b", "Searched for q in p", and "Listed files in p".
   - A failure does not end it.
6. **Command.** "Running {cmd}", then "Ran {cmd}" with the duration.
   - Red with "(exit N)" on failure.
   - Collapsed: the last 3 lines of output and "+N lines".
   - Expanded: `$ cmd`, the output, then "✓" or "✗ code".
7. **Edit.** "Edited|Added|Deleted {path} +a −r", or "Edited N files". Expanding shows a highlighted unified diff.
8. **Turn changes.** After the answer, a card reads "N files changed +a −r" and opens a Review pane.
9. **Agent thought.** A collapsed disclosure inside its group. It reads "Thinking", then "Thought for {s}". The body scrolls at a fixed height.
10. **Agent message.** Commentary shows in full. The final answer follows the fold, with actions below it.
11. **Plan.** A sticky panel reads "{done} out of {total} tasks completed". There is no Feed row.
12. **Compaction.** A standalone row reads "Compacting context", then "Context compacted · {s}".
13. **Notice.** Errors are red rows. Retries show in the live header. Other Notices are dim rows.
14. **Interruption.** The Turn ends with "You stopped after {duration}" and is not folded.
15. **Permission request.** While pending, it is an inline card at its Tool call, and the header reads "Awaiting approval". Afterwards the Tool call keeps a one-line outcome. The fold counts denials.
16. **Subagent.** A standalone row reads "{name} started working" or "{name} finished" and opens the child Session. A panel lists Active and Done.
17. **Goal.** A row above the composer and a tag on the user message that set it. It appears only for an agent that can pursue goals.

**Schema.** Add these in `_meta.argo`:

- `agent_message.phase`
- `tool_call_update.commandActions[]`, `startedAt`, and `endedAt`
- `subagent_update.action`, `prompt`, and `result`
- `permissionOutcome.decidedBy`

Add two ACP-style kinds: `turn_diff_update` and `goal_update`. ADR 0006 allows both. Large diffs go to blobs under ADR 0005. No ADR is contradicted, and ADR 0012 already covers continuation Turns that have no user message.

## Open questions for the product owner

1. Group titles with counts ("read 4 files") or without them, as Codex now does ("read files")?
2. Group all Tool calls, as the App does, or only exploration, as the TUI does?
3. Should commentary fold into "Worked for", or stay visible?
4. Should there be a detail setting, like Codex's "Thread detail" or Claude's Transcript view?
5. Should Agent thoughts be visible by default (App) or hidden (TUI)?
6. Should the Plan be in a sticky panel only, or also a Feed row?
7. Should Undo and the Review pane be in the first version?
8. Should the turn diff come from the Checkout's git state for both agents?
9. Should goals ship now, given that only Codex has them?
