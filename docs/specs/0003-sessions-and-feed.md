# Spec 0003: Sessions and the Feed

This spec is milestone 1. It covers running Claude and Codex Sessions from Argo, and drawing them on a phone and on a wide window. The words are in `GLOSSARY.md`. Spec 0002 has the machines, and this spec changes them where the section "Changes to other documents" says. When this spec and an ADR disagree, stop and ask the owner.

Sources, which this spec does not repeat:

- `docs/research/feed-presentation.md`, the Codex Feed rules
- `docs/research/subagents-and-shells.md`, vendor facts for Subagents and Shells

The layout and navigation decisions come from a UI map agreed with the owner on 2026-10-03. The section "App layout and navigation" writes out every one that this milestone uses, so nothing here depends on the prototype branch.

## Problem Statement

I run Claude and Codex in terminals today. I can't see from my phone what they're doing, answer them when they ask, or start new work when I'm away from my desk. Each Agent draws its work differently, so moving between them means learning two UIs. Old Argo solved part of this on the desktop only. It grew by watching Sessions it didn't own, and that cost a lot of sync code that kept breaking.

## Solution

Argo runs its own Sessions through a local Server, and every App shows them the same way: the desktop app, the web app, and the phone app (on a simulator for now).

- I start a Session with Claude or Codex in its own worktree, and pick the model, mode and effort.
- I watch its Feed live. The Feed follows the Codex app's rules for both Agents: grouped Tool calls, an exploration summary, collapsed Agent thoughts, and a live header that says what the Agent is doing.
- I answer Permission requests, Elicitations and Plan proposals from any App. The first answer wins.
- I see its Plan, its changed files, its Subagents and its Shells.
- The Session list tells me which Sessions need me, which are running, which failed, and which have news I haven't seen.
- I rename and archive Sessions. Archive has an Undo.

On a phone, the app uses a drawer of sections, and detail screens push full screen. On a wide window it uses old Argo's layout: an icon rail, a list sidebar, the detail pane and a right Inspector. The same URL opens the same thing on both.

## User Stories

### Starting a Session

1. As a developer, I want a write button on the Sessions list, so that I can start new work from where I look for work.
2. As a developer, I want the New Session page to show which Server and Project the Session starts in, so that I know where the Agent will run.
3. As a developer, I want to choose Claude or Codex in the composer, so that I can pick the Agent for the job.
4. As a developer, I want to see when an Agent is not installed or not signed in, with the step that fixes it, so that I'm not surprised by a failed start.
5. As a developer, I want to choose the model, mode and effort before I send, so that the first Turn runs the way I want.
6. As a developer, I want the effort choices to follow the model I picked, so that I can't choose an effort the model lacks.
7. As a developer, I want Plan in the same Mode picker for both Agents, so that I don't need to know that Codex calls it something else.
8. As a developer, I want dangerous modes shown in red, so that I don't pick full access by accident.
9. As a developer, I want each new Session in its own worktree by default, so that two Sessions never edit the same files.
10. As a developer, I want to choose the branch a new worktree starts from, or the Project's main checkout instead, so that I can build on the work I mean.
11. As a developer, I want Argo to remember my checkout choice per Project, so that I don't pick it every time.
12. As a developer, I want the Session to start only when I send the first prompt, so that empty Sessions never pile up.
13. As a developer, I want my first prompt to hold text and images, so that I can show the Agent a screenshot.
14. As a developer, I want the New Session page replaced by the Session after I send, so that Back returns to the list and not to an empty form.
15. As a developer, I want the first line of my prompt as the title right away, so that the new Session is findable before the Agent names it.

### Watching the Feed

16. As a developer, I want the Feed to update live while the Agent works, so that I see progress as it happens.
17. As a developer, I want my own messages shown as I typed them, so that I can find what I asked.
18. As a developer, I want Agent messages shown in full, so that I can read every answer.
19. As a developer, I want Agent thoughts collapsed into "Thinking" and then "Thought for 4s", so that reasoning doesn't bury the answer.
20. As a developer, I want consecutive Tool calls merged into one group with a short title, so that a burst of work reads as one step.
21. As a developer, I want reads, searches, listings and read-only shell commands merged into one "Explored" line, so that looking around takes one line.
22. As a developer, I want each command row to show the command, its duration and its exit code in red on failure, so that I see what failed at a glance.
23. As a developer, I want a collapsed command row to show the last three lines of output, so that I get the gist without expanding it.
24. As a developer, I want each edit row to show the path and the lines added and removed, so that I see the size of a change.
25. As a developer, I want to open an edit's diff, inline on a phone and in the Inspector on a wide window, so that I can review it where there's room.
26. As a developer, I want a live header that says what the Agent is doing, such as "Running pnpm test", so that I know where the Turn is.
27. As a developer, I want the live header to use the Agent's own description of a tool where it gives one, and the tool's name otherwise, so that both Agents read well.
28. As a developer, I want the Plan as a sticky panel on a wide window, and behind a Plan button showing done out of total on a phone, so that I always know how far the Agent got.
29. As a developer, I want a Compaction row that says when the Agent compacted its context, so that I understand why it may have forgotten details.
30. As a developer, I want error Notices in red and other Notices dimmed, so that problems stand out.
31. As a developer, I want a retry shown in the live header, so that a slow Turn explains itself.
32. As a developer, I want a stopped Turn to end with "You stopped after 1m 20s", so that the Feed records that I interrupted it.
33. As a developer, I want older Feed rows to load as I scroll up, so that long Sessions open fast.
34. As a developer, I want the Feed to catch up after my phone loses its connection, so that I never miss rows.
35. As a developer, I want the Feed of a Claude Session and a Codex Session to look the same, so that switching Agents costs nothing.

### Answering the Agent

36. As a developer, I want a Permission request to take the composer's place until it's answered, so that it can't scroll away under new output.
37. As a developer, I want to Allow once or Deny, so that I control each risky action.
38. As a developer, I want to add a message when I Deny, so that the Agent knows what to do instead.
39. As a developer, I want the Tool call to keep a one-line outcome after I answer, so that the Feed records what I decided.
40. As a developer, I want to answer an Elicitation in a form in the same place, so that the Agent can ask me for information.
41. As a developer, I want a Plan proposal to take the composer's place and show the plan with Approve and Keep planning, so that I can review a plan before the Agent works on it.
42. As a developer, I want Approve to switch the Agent to its default working mode and continue, so that one tap starts the work.
43. As a developer, I want Keep planning to stay in plan mode with my feedback, so that I can steer the plan.
44. As a developer, I want a request to wait for me with no deadline, so that work done before the question is never thrown away.
45. As a developer, I want "already answered" when another device answered first, so that two answers never clash.

### Controlling a Session

46. As a developer, I want Send replaced by Stop while a Turn runs, so that I can interrupt the Agent.
47. As a developer, I want to change model, mode or effort at any time, so that I can adjust as the work changes.
48. As a developer, I want a change made during a Turn to apply from the next Turn on both Agents, and the picker to say so, so that nothing changes under a running Turn.
49. As a developer, I want a context ring in the composer, with token counts on hover or press, so that I know when the context is filling up.
50. As a developer, I want to rename a Session from the title on a wide window or from the ⋯ menu on a phone, so that I can name it my way.
51. As a developer, I want my rename to win over the Agent's title, and to reach the Agent's own records, so that the terminal CLIs agree with Argo.
52. As a developer, I want the Agent's own title to replace my first prompt line when it arrives, so that titles read well without effort.
53. As a developer, I want my unsent draft to stay on the device where I typed it, so that two devices never fight over one text box.

### Changed files

54. As a developer, I want a Changed files chip in the header on a wide window, and "Changed files · n" in the ⋯ menu on a phone, showing the file count and lines added and removed in the Checkout, so that I see what the Session changed so far.
55. As a developer, I want it to open a file list with a diff for each file, in the Inspector on a wide window and in a popover on a phone, so that I can review the work.
56. As a developer, I want the Inspector to expand to the full width, so that big diffs are readable.

### Subagents and Shells

57. As a developer, I want a Subagents button with a count that is green while any run, so that I know delegated work is going on.
58. As a developer, I want the Subagents list grouped into Running and Finished, each row showing model, duration and tokens, so that I can see what each one cost.
59. As a developer, I want to open a Subagent's own Feed, in a page sheet on a phone and in the Inspector on a wide window, so that I can see what it did.
60. As a developer, I want the Subagent row in the Feed to open the same place, so that I can jump from where it started.
61. As a developer, I want Subagents kept out of the Sessions list, so that the list shows only my Sessions.
62. As a developer, I want a Shells button with a count that is green while any run, so that I know background commands are going.
63. As a developer, I want to open a Shell's output and watch it live, so that I can check a dev server or a long test run.
64. As a developer, I want to stop a running Shell, so that I can end a command the Agent left running.
65. As a developer, I want a Shell shown as lost when the Agent process died, so that its state is never a guess.

### The Session list

66. As a developer, I want each Session to show one state: Needs input, Running, Failed, Unread or Idle, so that I know where to look.
67. As a developer, I want Unread as a blue dot and Idle as grey, so that news stands out.
68. As a developer, I want a Session to stay Unread until I've seen the end of its Feed on any device, so that reading on my phone clears it on my laptop.
69. As a developer, I want old Argo's row: the Agent logo with its animation and status mark, the title, the activity line, the Subagent count, the Plan progress and an Archived badge, so that each row tells me what the Session is doing.
70. As a developer, I want the row to keep empty places for an Issue and a PR, so that they can arrive later without a redesign.
71. As a developer, I want Sessions grouped under their Project heading and sorted by newest activity, so that the list is ready for more Projects and the busiest work is on top.
72. As a developer, I want to search the list by title and filter between Active and Archived, so that I can find any Session.
73. As a developer, I want the list to update live on every device, so that I never refresh.

### Archive

74. As a developer, I want Archive to ask first only when the worktree has uncommitted files, so that I'm warned only when work could be lost.
75. As a developer, I want Archive to show a toast with Undo, so that a mistaken archive costs nothing.
76. As a developer, I want the worktree deleted only after the toast closes and the branch always kept, so that committed work is never lost.
77. As a developer, I want an archived Session to show its Feed read-only with an "Archived · read-only" banner, so that I can still read it.

### Attention

78. As a developer, I want a badge on the Sessions section that counts the Sessions that need input or are Unread, so that I see it from any screen.
79. As a desktop user, I want a dock badge with the same count, so that I see it from other apps.
80. As a desktop user, I want a native notification when a Session needs me or a Turn ends while the window is not focused, so that I can leave Argo in the background.
81. As a desktop user, I want clicking a notification to open that Session, so that I can act at once.
82. As a desktop user, I want Argo to ask whether to keep Sessions running when I quit during a Turn, so that I don't kill work by accident.
83. As a developer, I want my Mac kept awake while a Turn runs, so that a long Turn finishes while I'm away.

### Reliability

84. As a developer, I want a Turn that was running when the Server stopped to end as interrupted, with nothing resumed on its own, so that no side effect runs twice.
85. As a developer, I want Argo to restart a crashed Agent and say so in the Feed, so that one crash doesn't end the Session.
86. As a developer, I want a Session marked Failed after repeated crashes, so that a broken Session doesn't loop forever.
87. As a developer, I want a Notice when a Session continued in a terminal outside Argo, so that I understand why the Agent knows more than the Feed shows.
88. As a developer, I want an Agent that starts a Turn on its own to show it like any other Turn, so that the Feed stays complete.

### Navigation and layout

89. As a phone user, I want a drawer with Sessions, Issues, Atlas and Settings, opened from ☰ or a swipe from the left edge, so that I can reach every section.
90. As a phone user, I want each section to open on its list and details to push full screen with Back and a swipe back, so that navigation feels native.
91. As a desktop user, I want an icon rail, a list sidebar, the detail pane and a right Inspector, so that I see a list and a Session side by side.
92. As a desktop user, I want each section to open a detail next to its list, so that the pane is never empty.
93. As a user resizing a window, I want the layout to switch at 720 px with the URL kept, so that I never lose my place.
94. As a phone user, I want menus, filters and pickers to open as popovers anchored to their button, so that they behave the same on every platform.
95. As a phone user, I want a Subagent's Feed and a Shell's output in a native page sheet that I swipe down to close, so that I stay in the Session.
96. As a user, I want Issues, Atlas, Accounts and Project settings to show placeholders, so that the app's shape is in place before they are built.
97. As a user, I want Settings to show the Agents with their status, and the Server Connection, so that I can see why something doesn't work.
98. As a developer, I want every detail URL to open the same thing on every platform, and a section URL to open its list, plus its first detail beside it on a wide window, so that links work everywhere.

## Implementation Decisions

### Scope

- Argo runs only Sessions it started (ADR 0014). Import of stopped external Sessions is a later spec. Watching or controlling external Sessions is never in scope.
- One Project. The Server seeds it on startup from the `ARGO_PROJECT_PATH` environment variable, which defaults to the repo the Server runs from. Apps still read Projects through a list procedure, so adding Projects later changes no screen.
- Simulators only. The Server still binds to `127.0.0.1` (ADR 0002).
- Every App is a full peer. The Server applies the first action and rejects a late one with `CONFLICT` and a reason that the App shows, such as "already answered".
- What syncs: everything the Server stores, including Unread. What never syncs: composer drafts, which stay on each device, and UI state such as scroll position, expanded rows and the selected Session.

### Session procedures

The procedures are named after ACP methods, and the existing contracts carry them. This milestone adds or changes:

- `session.new {projectId, agent, checkout, configOptions, prompt}` returns `{sessionId}`. A Session is created and prompted in one call, so no empty Session exists.
  - `checkout` is `{type: 'worktree', baseBranch}` or `{type: 'main'}`.
  - `configOptions` is `{configId, value}[]`.
  - `prompt` is `ContentBlock[]`: text and images.
  - The Server stores the checkout choice on the Project, so the next New Session starts with it.
- `session.prompt`, `session.cancel` and `session.setConfigOption` stay as they are.
- `session.answerPermission {sessionId, toolCallId, optionId, message?}`. Each adapter offers exactly two options, `allow_once` and `reject_once`. `message` goes to the Agent with a rejection.
- `session.answerElicitation {sessionId, requestId, action, content?}`.
- `session.answerPlanProposal {sessionId, planId, decision: 'approve' | 'keep_planning', feedback?}`. `feedback` is required for `keep_planning`.
- `session.rename {sessionId, title}`.
- `session.archive {sessionId}` and `session.unarchive {sessionId}`. Unarchive is only the Undo: it succeeds during the 5 seconds before the Checkout is removed, and fails with `CONFLICT` afterwards. This holds for a Session on the main checkout too.
- `session.markSeen {sessionId, revision}`.
- `session.list {projectId?, archived, query?, cursor?}` returns `SessionInfo` rows, newest activity first. `query` filters by title on the Server, because the list is paged. `session.listUpdates` is a subscription that sends a changed `SessionInfo` or a removal. Subagents are never listed.
- `session.counts` is a subscription that sends `{attention, running}` whenever either changes. `attention` counts Sessions that are `needs_input` or `unread`. `running` counts Sessions with a running Turn. Archived Sessions and Subagents are not counted. Every badge uses `attention`: the drawer, the rail and the dock.
- `session.changes {sessionId}` returns the Checkout's changed files, and `session.diff {sessionId, path}` returns one file's unified diff.
- `session.subagents {sessionId}` returns `Subagent[]`, and `session.shells {sessionId}` returns `Shell[]`. Both update through the Session snapshot.
- `shell.output {sessionId, shellId, after?}` is a subscription that sends the stored output, then new output as it arrives. `session.stopShell {sessionId, shellId}` stops one.
- `agents.list {refresh?}` returns each registered Agent: `{agent, label, logo, availability, installStep?, configOptions}`.
  - The Server probes each Agent once when it starts and answers from that probe. `refresh` probes every Agent again first, for the Settings Agent pages. A Session whose Agent cannot start probes that Agent again too. A call during a probe waits for it rather than starting another (owner, 2026-10-05).
  - `availability` is `available`, `not_installed`, `not_signed_in` or `unavailable`.
  - `logo` is SVG text from the adapter, so no screen names a vendor.
  - `configOptions` is the template for the New Session composer.
- `projects.list` returns the one Project with its `checkoutChoice`. `projects.branches {projectId}` returns its local branches and the current one, which is the default base branch.
- The Feed procedures from spec 0001 section 6 are built as written. `feed.page` and `feed.subscribe` also serve Subagents.
- `blob.upload` is a mutation whose input is `FormData` with one file. It stores the file as a content-addressed blob and returns its `BlobRef`, which `session.new` and `session.prompt` then put in an image `ContentBlock`. It is the only call over HTTP (see "Server transport").

### Session list contract

`SessionInfo` gains:

- `status`: `needs_input`, `running`, `failed`, `unread` or `idle`, taken in that order. The Server derives it, and no App works it out.
  - `needs_input`: a Permission request, an Elicitation or a Plan proposal is pending.
  - `running`: a Turn is running.
  - `failed`: the newest Turn ended with `error` for a reason other than an interrupted Server, or the Session gave up after repeated crashes.
  - `unread`: none of the above, and `maxRevision` is above `seenRevision`.
- `title` and `titleSource`: `user`, `agent` or `prompt`.
- `activity`: the live header while running, the request's title while needing input, and otherwise the first line of the newest Agent message.
- `activityAt`: when the Feed last changed. The list sorts by it.
- `checkout: {type, path, branch}`.
- `plan: {done, total} | null`, `subagents: {running, total}`, `shells: {running, total}`.
- `archivedAt: number | null`.
- `issue: null` and `pullRequest: null`. The row keeps these slots, with no data in this milestone.

### Session snapshot

`SessionSnapshot` gains:

- `pendingPlanProposal: {planId, content} | null`, where `content` is markdown.
- `pendingElicitation` gains `requestId`, which the Session makes.
- `changes: {files, additions, deletions}`: the uncommitted changes in the Checkout, for the chip.
- `subagents: Subagent[]` and `shells: Shell[]`, so the buttons update live.
- `liveHeader: string | null`.
- `title`, `titleSource`, `checkout` and `archivedAt`.

`state` stays `running`, `requires_action` or `idle`. A pending Plan proposal makes it `requires_action`. A Session with only running Shells or Subagents is `idle` for prompts.

### Subagent and Shell shapes

These come from the research note's proposed model.

- `Subagent`: `{sessionId, parentSessionId, toolCallId, title, role, model, state: 'running' | 'finished', stopReason, startedAt, endedAt, durationMs, tokens}`. Parent and Subagent tokens overlap, so the App never adds them up.
- `Shell`: `{id, sessionId, toolCallId, command, cwd, status, exitCode, startedAt, endedAt, durationMs}`.
  - `status` is `running`, `exited`, `stopped` or `lost`.
  - `exitCode` is null where the Agent gives none. Claude gives none, so a Claude Shell only says "exited".

### Agent catalog

- Config options follow ACP v2 (`configId`). The adapter sends the full array after every change, so effort follows the model with no dependency graph.
- `_meta.argo` on a mode value holds `icon` and `tone`: `planning`, `safe`, `moderate` or `dangerous`. `_meta.argo` on a model value holds that model's support flags, so the composer can preview them.
- The contract is loosened to match ACP. A category is any string. An unknown category is kept, ignored by the UI, and counted. `_meta` is allowed on an option, a value and a group.
- Plan is a mode value for both Agents. The Codex adapter maps it onto its collaboration mode. Claude's `dontAsk` is not offered. Dangerous modes are offered.
- A change made while a Turn runs is held by the Session and applied right before the next prompt, on both Agents. The held value carries `_meta.argo.heldUntilNextTurn` so the picker can say so.

### Feed contract

Fields that ACP lacks go in `_meta.argo` (ADR 0006):

- `tool_call_update`: `commandActions[]`, each `{type: 'read' | 'search' | 'list' | 'unknown', command, path?, query?}`, plus `startedAt`, `endedAt` and `shellId?`. Codex sends command actions. The adapters for other Agents fill them with one shared command parser in the agents package, which names no vendor.
- `subagent_update`: `toolCallId`, `action` (`spawn`, `message`, `wait` or `close`), `prompt` and `result`.
- `plan_update` of type `markdown` that was proposed: `proposalOutcome` (`approved` or `kept_planning`) once answered.
- A new kind, `session_message`, is the first row of a Subagent's Feed: the prompt its parent sent, with `_meta.argo.senderSessionId`. It is not a `user_message`, because no human typed it (ADR 0012).
- A `task_update` for a finished Shell or Subagent carries `_meta.argo.shellId` or `subagentSessionId`.
- Row ids stay as spec 0001 section 6 says: Claude text rows use `message.id#blockIndex`. Claude writes one record per content block, all with the same `message.id`, and the block index is on stream events only. So the Claude adapter counts the blocks it has seen for each `message.id`, which gives a record the same index its stream events had. The streamed row and the final row then share an id, with or without streaming.
- There is no Turn diff, no `phase` and no `goal_update` kind in this milestone.

### Feed presentation

- One pure function in the client package, `toFeedView(rows, snapshot)`, turns Feed rows into what the Feed draws. That covers the groups, the exploration line, the group titles and the Plan. No screen does this work itself.
- The live header has one producer, a pure function on the Server that `toSessionSnapshot` calls. It picks the first that applies:
  1. a pending request: "Awaiting approval", "Waiting for your answer" or "Plan ready"
  2. a retry: "Retrying (2 of 5)"
  3. the newest Agent thought's title, when the Agent gives one
  4. the running Tool call's title, when the Agent gave it a description
  5. the running Tool call's kind label, such as "Running pnpm test", "Reading spec.md" or "Editing app.tsx"
  6. the running Tool call's name
  7. "Working"

  The App adds the elapsed time. There is no "Esc to stop". `SessionInfo.activity` uses the same text.
- It follows the 17 rules in `feed-presentation.md`, with these changes:
  - Rule 1: there is no Turn fold.
  - Rule 2: the live header follows the order above.
  - Rule 4: group titles have no counts, and no "· N failed". A failed call shows red in its own row.
  - Rule 7: an edit's diff expands inline on a phone and opens in the Inspector on a wide window.
  - Rule 8: there is no "N files changed" card. The Changed files chip replaces it.
  - Rule 10: the final answer shows in full like any Agent message, with no actions under it.
  - Rule 11: the Plan is a sticky panel on a wide window and a popover from the header on a phone. It is never a Feed row.
  - Rule 15: a pending Permission request is a card in the composer's place, not inline. Its Tool call row reads "Awaiting approval" until answered, then keeps a one-line outcome. Elicitations and Plan proposals use the same card place.
  - Rule 16: a Subagent row opens the Subagent's Feed, in the Inspector on a wide window and in a page sheet on a phone. The Subagents button's list replaces the panel, grouped into Running and Finished.
  - Rule 17: there is no Goal UI in this milestone.

### Session machine changes

These amend spec 0002 section 6.

- **Agent-started Turns.** In `live.idle`, `agent.turnStarted` makes a Turn id with the id function the Session gets in its input, the same one the services use. It inserts the Turn and goes to `running.working` with no `user_message`. The adapter maps its own Turn ids onto Argo's. Goals need this, and the Goal UI comes later.
- **Plan proposals.** `agent.planProposed {planId, content}` sets `pendingPlanProposal`.
  - Claude proposes during a Turn: the Session goes to a new state, `running.awaitingPlanApproval`.
  - Codex ends a plan-mode Turn with its plan: the Session goes to a new state, `live.planProposed`, with no Turn running.
  - `toSessionSnapshot` maps both states to `requires_action`. In `live.planProposed`, `session.prompt` fails with `CONFLICT`, because the card has replaced the composer. `session.setConfigOption` still works.
  - `session.answerPlanProposal` sends `agent.answerPlanProposal` and sets `proposalOutcome` on the plan's row.
  - Approve on Claude allows the plan request and switches to the default mode. Approve on Codex starts a Turn in the default collaboration mode, and the service makes its id. That Turn has no `user_message`.
  - Keep planning writes the feedback as a `user_message`, because a person typed it (ADR 0012). On Claude, it rejects the plan request with the feedback, and the Turn goes on in plan mode. On Codex, it starts a new plan-mode Turn with the feedback as its prompt.
- **Held config options.** `session.setConfigOption` in `running` stores the value. The Session sends every held value with `agent.setConfigOption` before the next `agent.prompt`.
- **Titles.** `agent.titleChanged {title}` updates the title unless `titleSource` is `user`. `session.rename` sets the title with source `user` and sends `agent.rename`. The Codex adapter generates titles itself, the way the Codex CLI does, with a small model after the first Turn. The Claude adapter passes Claude's own title through. If Claude does not stream it, the adapter reads it after the first Turn ends.
- **Subagents.** A Subagent is a read-only Session: a `session` row with `parentSessionId`, the parent's Agent and the parent's Checkout (ADR 0008 as amended). It has no Session actor and no agent machine of its own.
  - `agent.subagentChanged {subagent}` reports a Subagent by its parent's `toolCallId`. The first one for a `toolCallId` makes the Subagent's Session id, inserts its row, writes its `session_message`, and invokes a feed actor for it.
  - `agent.feed {change, subagentToolCallId?}` carries a Subagent's rows. With `subagentToolCallId` set, the change goes to that Subagent's feed actor.
  - The adapter buffers a Subagent's traffic that arrives before its spawn, and never guesses a parent.
  - Each run of work is a `turn` row on the Subagent, which gives its duration, tokens and stop reason.
  - The Claude adapter turns on the option that forwards a Subagent's whole conversation. After an Engine restart, or for a Subagent that streams nothing, the adapter reads the Subagent's history from the Agent and the Server rebuilds its rows (ADR 0005 allows this).
  - This replaces spec 0002's line that a Subagent shows only as `subagent_update` rows.
- **Shells.** The Session keeps the list of Shells in its context and writes each change to the `shell` table. There is no separate Shell machine.
  - `agent.shellChanged {shell}` adds or updates one. `agent.shellOutput {shellId, text}` appends output. Neither goes to the Feed.
  - Both adapters send output the same way: the Claude adapter tails Claude's output file, and the Codex adapter forwards Codex's output deltas.
  - The Session appends output to a file per Shell. When the Shell ends, that file becomes a blob (ADR 0005).
  - `session.stopShell` sends `agent.stopShell`. The Claude adapter stops one background task without stopping the others.
  - When the agent fails or stops, every running Shell becomes `lost`.
- **Terminal continuation.** `agent.ready` carries `continuedOutside: boolean`. The adapter works it out by comparing the newest vendor record with the newest one Argo stored. When it is true, the Session adds a Notice and imports no rows.
- **Archive.** `session.archive` is accepted only when no Turn runs.
  - It sets `archivedAt` on the Session and its Subagents, stops the agent, marks running Shells `stopped`, and ends running Subagent Turns with `cancelled`.
  - The Session then waits in a new state, `archived`, for 5 seconds (`checkoutRemovalDelay`). `session.unarchive` in that state clears `archivedAt` and closes the Session. After the delay, it removes the worktree and closes. The branch is always kept. A Session on the main checkout removes nothing.
  - The toast shows for 3 seconds, and the extra 2 absorb a slow network.
  - Before archiving, the App calls `session.changes`, and asks first when any file is uncommitted.
- **Idle close.** A Session actor closes after 5 minutes (`idleCloseDelay`) with no running Turn, Subagent or Shell and no pending request, and the next command opens it again. Old Argo learned this. A Session that holds an Agent process forever wastes memory.
- **Giving up.** When the Session gives up after 3 crashes in 10 minutes, it writes the failure to the `session` row. A later command that opens the Session and starts the agent clears it.

### Session registry and Feed routing

These amend spec 0002 sections 5 and 8.

- `sessions.open` refuses a Subagent's id with `CONFLICT`, and so does every command for one. A Subagent is read-only.
- `feed.page` serves a Subagent's stored rows, and `feed.subscribe` its changes, as for a Session (spec 0001 section 6). While its parent is open, the parent's feed actor for that Subagent sends live changes. While the parent is closed, nothing changes, so nothing is sent. Subscribing does not open the parent.

### Database

- `session` gains `title`, `titleSource`, `archivedAt`, `seenRevision`, `activityAt`, `failure`, `parentToolCallId` and `subagentRole`. The database writer sets `activityAt` whenever it raises `maxRevision`.
- `turn` gains `model`, because a Codex Subagent can change it between Turns.
- `project` gains `checkoutChoice`.
- New table `shell`: `sessionId`, `id`, `toolCallId`, `command`, `cwd`, `status`, `exitCode`, `startedAt`, `endedAt` and `outputBlobId`. Its primary key is `(sessionId, id)`.
- Recovery after an Engine restart (spec 0002 section 9) also:
  - marks running Shells `lost`
  - gives each Turn it ends `error: {code: 'interrupted'}`, and adds a warning Notice saying the Server stopped during the Turn. The list does not count an interrupted Turn as Failed.
  - removes the worktree of every archived Session whose Checkout still exists, which finishes an archive that a restart cut short

### Server transport

These amend ADR 0002 and spec 0001 section 5. The source is tRPC's guides on non-JSON content types and the standalone adapter.

- One router serves both transports. The Engine's one `node:http` server sends `/blobs/:id` to a plain handler that streams the file, and every other request to tRPC's `createHTTPHandler` with `basePath: '/trpc/'`. The WebSocket server sits on the same server with the same router.
- Hono and `@hono/node-server` are removed. `/health` goes, and the dev wait script calls `system.info` over HTTP instead.
- The client's links are a `splitLink`: a call whose input is not JSON-serialisable (`isNonJsonSerializable`) goes through `httpLink`, and every other call goes through `wsLink`.
- The Server must not read a request body before tRPC does, since tRPC parses it by `Content-Type`.
- The `Host` check covers every request. The `Origin` check that guards the WebSocket also guards tRPC over HTTP, so a website cannot post to the Server.
- An upload is at most 20 MB. A blob that no prompt refers to is deleted when the Engine starts, if it is older than a day.
- Before any other upload work, check `FormData` with a file through `httpLink` on the iOS simulator and the Android emulator. tRPC's guide has no React Native notes. If it fails, stop and ask the owner.

### Server work

- Changed files: the Server runs `git status` and `git diff --numstat` on the Checkout after each edit Tool call settles and when each Turn ends. The result goes into the snapshot.
- Keep awake: while any Turn runs on macOS, the Engine keeps the Mac from idle sleep with `caffeinate`, bound to the Engine's pid, as a named actor. Closing the lid still sleeps the Mac.

### Desktop

- The Electron main process gets its own tRPC client over the WebSocket, as the renderer has, and subscribes to `session.counts`. It sets the dock badge from `attention`, and uses `running` on quit. The preload stays as ADR 0002 says, with nothing added. The main process's client only reads counts. It never watches or repairs the Engine (ADR 0003).
- On quit, when this App started the Supervisor and `running` is above 0, the main process asks "N Sessions are running. Keep them going?". Keep quits without stopping the Supervisor. Stop stops it as today. When this App did not start the Supervisor, it quits as today and asks nothing. When the main process's client is not connected, it treats `running` as 0. This amends ADR 0003, spec 0001 section 9 and spec 0002 section 10.
- Native notifications use the web Notification API from the renderer, only while the window is not focused. They fire when a Session needs input and when a Turn ends. Clicking one brings the window forward and opens the Session. If the renderer cannot bring the window forward, stop and ask the owner.

### App layout and navigation

These come from the UI map agreed on 2026-10-03.

- **One route tree, two shells.** One Expo Router tree. At 720 px or wider it draws old Argo's desktop layout, and below that the phone layout. When a window crosses 720 px, the shell swaps and the URL stays.
- **Phone.**
  - A left drawer holds the sections: Sessions, Issues, Atlas and Settings. It opens from ☰ or by a swipe from the left edge. Sessions has a badge with the `attention` count.
  - Each section opens on its list, which is the desktop sidebar's list drawn full screen. The list title has ☰ on the left, and search and filter icons on the right.
  - Detail screens push full screen over the drawer with a back chevron, and iOS also allows a swipe back from the edge. The open detail screen has a back stack that returns to its section list.
- **Desktop.** An icon rail with the sidebar toggle at the top, then Sessions, Issues and Atlas, and Settings at the bottom. Then a list sidebar, the detail pane and a right Inspector. Sessions in the rail has the same badge.
- **Section roots on a wide window** open a detail beside the list: Sessions opens the first active Session, or New Session when there is none, and Settings opens Accounts. Issues and Atlas show their placeholder.
- **URLs.** `/` is the Sessions list and replaces today's Projects screen. `/sessions/new` and `/sessions/[id]` follow it. `/issues` and `/atlas` are placeholders. Settings has `/settings/accounts` and `/settings/projects/[name]`, which are placeholders this milestone, plus `/settings/connection` and `/settings/agents/[agent]`.
- **Route groups.** Two route groups carry the layout: one picks the shell by width, and one is the phone drawer of sections. Detail routes sit beside the sections group, so on a phone they push over the drawer. Storybook stays outside the shell.
- Layout files own the navigators and render shell pieces from the client package. Route files only render a screen (ADR 0009).
- The client package stays free of `expo-router`. Screens navigate through a `useNavigate()` context with typed destinations, such as `{to: 'session', id}`. The app fills it from `expo-router`, and Storybook fills it with a recorder that play functions can check.
- Components adapt with a `useWide()` hook. They split into separate phone and desktop components only for the shell, the Session header and the list screen frame.
- **Overlays.** Every menu, filter, picker and confirmation is a popover anchored to its button, on every platform. There are no bottom sheets, and the Subagents and Shells lists are popovers too. A full view that belongs to a Session, a Subagent's Feed or a Shell's output, opens as a native page sheet on iOS and full screen on Android and narrow web.
- **Lists.** Every section list has the same shape:
  - A title row, then search and filter as icons. Search opens in place of the title, and the filter opens a popover. The Sessions filter switches between Active and Archived.
  - Rows are grouped under a plain Project heading. Tapping the heading collapses it, and a collapsed heading shows its count. An empty Project keeps its heading unless search or the filter narrows the list.
  - New work starts from one floating round write button: bottom right on a phone, bottom left of the sidebar on the desktop.
  - The "Projects ⋯ +" sub-header, a heading's ⋯ and Add Project come later.
- **Session header.**
  - On a phone, it keeps four things: back, the status mark with the title, a Plan button showing done out of total when a Plan exists, and ⋯. The ⋯ menu holds "Changed files · n", Rename and Archive.
  - On a wide window, it shows the title and its state (click the title to rename), the checkout path and branch, the Subagents and Shells buttons, the Changed files chip, ⋯, and the Inspector toggles.
- **Session bottom.** It shows exactly one of: the composer, a request card (Permission request, Elicitation or Plan proposal), or the "Archived · read-only" banner.
- **Plan.** On a wide window, a sticky panel at the top of the Feed. On a phone, a popover from the header's Plan button.
- **Changed files.** On a wide window, the chip opens the file list in the Inspector, which can expand to the full width. On a phone, ⋯ then "Changed files · n" opens a popover.
- **Subagents and Shells.** Two buttons, each with a count that is green while anything runs and grey once all have ended. Each opens a list grouped into Running and Finished, and each row shows model · duration · tokens. On a wide window the buttons sit at the top right of the header, and an item opens in the Inspector. On a phone they are pills above the composer, and an item opens in a page sheet. A Subagent row in the Feed opens the same place.
- **Archive.** Archiving a Session that has uncommitted files asks first in a popover. Archiving shows a toast with Undo, and the Session moves to the Archived filter with the read-only banner.
- **New Session.** "Start the Session in" rows for Server and Project sit above the composer. Server has one entry until the app supports more machines. The composer holds the Agent, model, mode, effort and checkout: a worktree from a branch, or the main checkout. The wide window shows the heading "What should we work on?". Sending replaces the New Session page with the Session.
- **Settings.** The list has four groups: Projects, Server (Accounts and Connection), Agents (Claude and Codex), and App (Appearance and Notifications). This milestone builds Connection and the Agent pages, which show availability and the install step. The rest are placeholders.
- React Native Reusables primitives replace the prototype's hand-made ones. No size, spacing or colour comes from the prototype or the map.
- What is copied from old Argo's rail, sidebar, Inspector, composer and Session row is decided with the owner, piece by piece, in the UI work for each slice.

## Testing Decisions

A good test checks what a user or a caller sees, through the highest seam that reaches it. It never checks a machine's internal state names, a component's internal state, or which function was called.

1. **Main seam: Playwright end-to-end** against the web build and the real Server, with only the Agent CLI mocked (ADR 0011). The mock CLIs replay recordings. This seam covers:
   - creating with text and image prompts, prompting and cancelling, and the remembered checkout choice
   - an Agent that is not installed or not signed in, with a mock CLI variant for each
   - answering requests and Plan proposals, Approve and Keep planning
   - titles and rename
   - archive and Undo
   - Unread and the attention badge
   - changed files
   - Subagents and Shells
   - list search, the Archived filter, and the list updating live
   - the layout switch at 720 px with the URL kept, by resizing the viewport
   - an upload from a page on another origin, which the Server refuses
   - a Feed that catches up after the Engine restarts

   One test opens two browser pages on one Session, to check that they stay in sync and that the late answer sees "already answered". The scaffold's Projects end-to-end test is the prior art.
2. **Playwright's Electron project** covers the desktop: the dock badge, read in the main process; the quit prompt with Keep and Stop; and a notification and its click, with the Notification API stubbed in the page.
3. **Server composition tests** drive the Engine's services through tRPC callers, with recordings and a temp database (spec 0002 section 12). They cover what a browser can't reach:
   - Engine restarts, interrupted Turns, and archives cut short
   - Agent crashes and giving up
   - Agent-started Turns
   - held config options
   - the terminal continuation Notice
   - lost Shells
   - the archive timer
   - Feed paging
   - keep awake, with the `caffeinate` actor provided as a mock
4. **Pure function tables:**
   - `toFeedView`, with rows built from both Agents' recordings, so parity is checked in one place
   - the live header function
   - each adapter's `toAgentEvents`, including Claude's block counting for row ids
   - the shared command parser
   - `toSessionSnapshot`
   - the list status derivation
5. **Storybook play functions** in `*.test.stories.tsx` for every screen and component. Screens get tRPC fixtures at the link, and components get props (ADR 0010). They cover the row states, the Feed groups, the request cards, the pickers, and navigation. Navigation is checked through the `useNavigate()` recorder. The Feed fixtures come from recordings run through the real converter, never from hand-written rows. The existing Projects screen and app providers stories are the prior art.
6. **`xstate/graph` model-based tests** for every new or changed machine (AGENTS.md): the Session machine with its new states, the registry, and the Electron Server connection with the quit prompt. The Supervisor, Engine and Connection machine tests are the prior art.

The native page sheet on iOS is checked by hand on the simulator.

**Recordings come first.** The real Claude and Codex streams needed are:

- a Turn with edits and commands
- a Permission request
- an Elicitation
- a Plan proposal, approved, and one kept planning with feedback
- Compaction
- a foreground Subagent, and a background one
- a background Shell, and stopping it
- a Codex Subagent given more work
- a Codex process that outlives its Turn
- a Codex Turn the Agent started itself
- Claude's title event
- a prompt with an image
- a terminal continuation, made by prompting the same Session from the CLI

An Agent crash needs no recording: the mock CLI exits mid-Turn. Old Argo's recordings (claude-cli 2.1.286, codex-app-server 0.157.0) and mock CLIs, in its mocks folder, are ported as a start.

## Out of Scope

Each item below becomes its own issue, labelled `needs-triage`. The issues are shown to the owner before they are created, and each item links its issue once created.

1. Queueing a message while a Turn runs.
2. Importing stopped external Sessions. Research is in a separate session.
3. A real phone over the network (Tailscale and a pairing token), and a Server that outlives the desktop app, with a menu bar item.
4. Push notifications.
5. Delete, pin, fork and handoff, and searching inside Sessions.
6. Pulling in history after a terminal continuation (parked).
7. Project navigation with Atlas and Issues, Add Project, Project settings, and the "Projects ⋯ +" sub-header.
8. "Allow for this Session".
9. Unarchive beyond the Undo.
10. The Goal UI.
11. PR and Issue data on the Session row.
12. A Feed detail setting, only if people ask for it.
13. The Review pane and undoing changes.
14. Stopping a Subagent.
15. Settings: Accounts, Appearance and Notifications.
16. `@` file mentions and slash commands in the composer.
17. Actions under the final answer, such as copy.

## Further Notes

### Delivery in vertical slices

Each slice becomes several small GitHub issues, each sized for one agent session:

1. **Contract**, labelled `ready-for-agent`: Zod schemas, tRPC procedure signatures, the recordings the slice needs, and fixtures built from them.
2. **UI**, labelled `ready-for-human`, one issue per component or screen region: built in Storybook against the fixtures, with the owner. It is blocked by the contract and by the design foundations (theme tokens and primitives), and uses only what those provide. When it needs a token or a primitive that is missing, the agent stops and asks.
3. **Backend**, labelled `ready-for-agent`: the Server side with its Server tests. It is blocked by the contract only, so it runs alongside the UI.
4. **Wire-up**, labelled `ready-for-agent`: the screen on live data, and the end-to-end test. It is blocked by the backend and by the owner's approval of the UI.

Every UI issue has a design gate:

- Before building, the agent shows the owner the matching piece of old Argo and asks what to keep.
- The PR posts screenshots of every state, at phone and wide widths, in light and dark.
- The owner's approval of the PR is the gate. After it, the stories are the reference, and later issues reuse the component without restyling it.

Each issue lists its stories or tests as its acceptance check. When an agent finds the work bigger than its issue, it stops and proposes a split.

Every backend part covers both Agents, because parity is part of every Session change. The machines from spec 0002 section 14 come first, and so do the recordings, since fixtures depend on them.

The slices, in order:

1. The app shell, routes, `useNavigate()`, and placeholder Issues, Atlas and Settings screens. The backend part replaces Hono with tRPC's HTTP handler.
2. The Sessions list and row.
3. New Session and the first Turn.
4. The Feed.
5. Answering requests and Plan proposals.
6. Cancel, config options and the context ring.
7. Titles and rename.
8. Unread and attention.
9. Changed files.
10. Archive with Undo.
11. Subagents.
12. Shells.
13. Recovery and the terminal continuation Notice.
14. Settings for Agents and Connection.

### Changes to other documents

This PR makes these changes:

- ADR 0002: tRPC over HTTP for uploads, one plain blob route, no Hono.
- ADR 0003: Electron's quit asks whether to keep running Sessions going.
- ADR 0008: a Subagent borrows its parent's Checkout.
- Spec 0001:
  - Section 5: the Shell output files in the runtime layout, and the HTTP server without Hono.
  - Section 6: the new kinds and `_meta.argo` fields, the `SessionSnapshot` and `SessionInfo` fields, the config option contract, and the Session procedures.
  - Section 7: the `shell` table and the new columns.
  - Section 8: the Sessions list replaces the Projects screen at `/`.
  - Section 9: the quit rule.
- Spec 0002:
  - Section 3: the Subagents' feed actors, and the Electron main process's tRPC client.
  - Section 5: refusing Subagent ids, and idle close.
  - Section 6: Agent-started Turns, Plan proposals, held config options, titles, Subagents, Shells, terminal continuation, archive, idle close and giving up.
  - Section 7: the new agent events, `message` on `agent.answerPermission`, `continuedOutside` on `agent.ready`, and Turns that start in `ready.idle` with no prompt.
  - Section 8: routing a Subagent's changes to its feed actor.
  - Section 9: lost Shells, interrupted Turns and archives cut short.
  - Section 10: the quit prompt.

### Decisions taken while writing, for the owner to check

These were not discussed in the grilling sessions:

- Archive is refused while a Turn runs.
- The worktree is removed 5 seconds after archive, while the toast shows for 3.
- The idle close after 5 minutes.
- What the activity line shows.
- Agent logos come from the adapter as SVG text.
- Approving a Codex Plan proposal starts a Turn with no `user_message`.
- Keep planning needs feedback. On Codex it starts a new plan-mode Turn.
- The Electron main process reads the counts over its own tRPC client, so the preload needs nothing new.
- List search filters titles on the Server, because the list is paged.
- On a wide window, Sessions with no active Session opens New Session.
- The Agent pages live at `/settings/agents/[agent]`.
- The live header's order, with the kind label between the description and the name.
- The final answer has no actions, and `phase` is dropped.
- Claude row ids keep `message.id#blockIndex`, with the index counted from records.
- A restart's interrupted Turns are not Failed, and get a Notice.
- Uploads are capped at 20 MB, and an unused blob is deleted after a day.
- `/health` is replaced by `system.info` over HTTP.
