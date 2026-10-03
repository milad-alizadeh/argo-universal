# Spec 0003: Sessions and the Feed

This spec is milestone 1. It covers running Claude and Codex Sessions from Argo, and drawing them on a phone and on a wide window. The words are in `GLOSSARY.md`. Spec 0002 has the machines, and this spec changes them where the section "Changes to specs 0001 and 0002" says. When this spec and an ADR disagree, stop and ask the owner.

Sources, which this spec does not repeat:

- the agreed UI map, decided on 2026-10-03. It is committed on the branch `prototype/universal-session-ui` (commit `2425408`), and a copy is published as a private artifact. Its decision ids (L, S, P, O, N, R, X) appear below.
- `docs/research/feed-presentation.md`, the Codex Feed rules
- `docs/research/subagents-and-shells.md`, vendor facts for Subagents and Shells

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

On a phone, the app uses a drawer of sections, and detail screens push full screen. On a wide window it uses old Argo's layout: an icon rail, a list sidebar, the detail pane and a right inspector. The same URL opens the same thing on both.

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
10. As a developer, I want to choose the Project's main checkout instead, so that I can work on what I already have open.
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
25. As a developer, I want to open an edit's diff, inline on a phone and in the inspector on a wide window, so that I can review it where there's room.
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
41. As a developer, I want a Plan proposal to show the plan with Approve and Keep planning, so that I can review a plan before the Agent works on it.
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

### Changed files

53. As a developer, I want a Changed files chip showing the file count and lines added and removed in the Checkout, so that I see what the Session changed so far.
54. As a developer, I want the chip to open a file list with a diff for each file, in the inspector on a wide window and in a popover on a phone, so that I can review the work.
55. As a developer, I want the inspector to expand to the full width, so that big diffs are readable.

### Subagents and Shells

56. As a developer, I want a Subagents button with a count that is green while any run, so that I know delegated work is going on.
57. As a developer, I want the Subagents list grouped into Running and Finished, each row showing model, duration and tokens, so that I can see what each one cost.
58. As a developer, I want to open a Subagent's own Feed, in a page sheet on a phone and in the inspector on a wide window, so that I can see what it did.
59. As a developer, I want the Subagent row in the Feed to open the same place, so that I can jump from where it started.
60. As a developer, I want Subagents kept out of the Sessions list, so that the list shows only my Sessions.
61. As a developer, I want a Shells button with a count that is green while any run, so that I know background commands are going.
62. As a developer, I want to open a Shell's output and watch it live, so that I can check a dev server or a long test run.
63. As a developer, I want to stop a running Shell, so that I can end a command the Agent left running.
64. As a developer, I want a Shell shown as lost when the Agent process died, so that its state is never a guess.

### The Session list

65. As a developer, I want each Session to show one state: Needs input, Running, Failed, Unread or Idle, so that I know where to look.
66. As a developer, I want Unread as a blue dot and Idle as grey, so that news stands out.
67. As a developer, I want a Session to stay Unread until I've seen the end of its Feed on any device, so that reading on my phone clears it on my laptop.
68. As a developer, I want old Argo's row: the Agent logo with its animation and status mark, the title, the activity line, the Subagent count and the Plan progress, so that each row tells me what the Session is doing.
69. As a developer, I want the row to keep empty places for a Ticket and a PR, so that they can arrive later without a redesign.
70. As a developer, I want Sessions grouped under their Project heading, so that the list is ready for more Projects.
71. As a developer, I want to search the list and filter between Active and Archived, so that I can find any Session.
72. As a developer, I want the list to update live on every device, so that I never refresh.

### Archive

73. As a developer, I want Archive to ask first only when the worktree has uncommitted files, so that I'm warned only when work could be lost.
74. As a developer, I want Archive to show a toast with Undo, so that a mistaken archive costs nothing.
75. As a developer, I want the worktree deleted only after the toast closes and the branch always kept, so that committed work is never lost.
76. As a developer, I want an archived Session to show its Feed read-only with an "Archived · read-only" banner, so that I can still read it.

### Attention

77. As a developer, I want a badge on the Sessions section that counts Sessions waiting for me, so that I see it from any screen.
78. As a desktop user, I want a dock badge with the same count, so that I see it from other apps.
79. As a desktop user, I want a native notification when a Session needs me or a Turn ends while the window is not focused, so that I can leave Argo in the background.
80. As a desktop user, I want clicking a notification to open that Session, so that I can act at once.
81. As a desktop user, I want Argo to ask whether to keep Sessions running when I quit during a Turn, so that I don't kill work by accident.
82. As a developer, I want my Mac kept awake while a Turn runs, so that a long Turn finishes while I'm away.

### Reliability

83. As a developer, I want a Turn that was running when the Server stopped to end as interrupted, with nothing resumed on its own, so that no side effect runs twice.
84. As a developer, I want Argo to restart a crashed Agent and say so in the Feed, so that one crash doesn't end the Session.
85. As a developer, I want a Session marked Failed after repeated crashes, so that a broken Session doesn't loop forever.
86. As a developer, I want a Notice when a Session continued in a terminal outside Argo, so that I understand why the Agent knows more than the Feed shows.
87. As a developer, I want an Agent that starts a Turn on its own to show it like any other Turn, so that the Feed stays complete.

### Navigation and layout

88. As a phone user, I want a drawer with Sessions, Issues, Atlas and Settings, opened from ☰ or a swipe from the left edge, so that I can reach every section.
89. As a phone user, I want each section to open on its list and details to push full screen with Back and a swipe back, so that navigation feels native.
90. As a desktop user, I want an icon rail, a list sidebar, the detail pane and a right inspector, so that I see a list and a Session side by side.
91. As a desktop user, I want each section to open a detail next to its list, so that the pane is never empty.
92. As a user resizing a window, I want the layout to switch at 720 px with the URL kept, so that I never lose my place.
93. As a phone user, I want menus, filters and pickers to open as popovers anchored to their button, so that they behave the same on every platform.
94. As a phone user, I want a Subagent's Feed and a Shell's output in a native page sheet that I swipe down to close, so that I stay in the Session.
95. As a user, I want Issues and Atlas to show placeholders, so that the app's shape is in place before they are built.
96. As a user, I want Settings to show the Agents with their status, and the Server Connection, so that I can see why something doesn't work.
97. As a developer, I want every URL to open the same screen on every platform, so that links work everywhere.

## Implementation Decisions

### Scope

- Argo runs only Sessions it started. A new ADR records this (ADR 0014). Import of stopped external Sessions is a later spec. Watching or controlling external Sessions is never in scope.
- One Project. The Server seeds it on startup from `ARGO_PROJECT_PATH`, which defaults to the repo the Server runs from. Apps still read Projects through a list procedure, so adding Projects later changes no screen.
- Simulators only. The Server still binds to `127.0.0.1` (ADR 0002).
- Every App is a full peer. The Server applies the first action and rejects a late one with `CONFLICT` and a reason that the App shows, such as "already answered".

### Session procedures

The procedures are named after ACP methods, and the existing contracts carry them. This milestone adds or changes:

- `session.new` takes `{projectId, agent, checkout, configOptions, prompt}` and returns `{sessionId}`. A Session is created and prompted in one call, so no empty Session exists.
- `session.prompt`, `session.cancel` and `session.setConfigOption` stay as they are.
- `session.answerPermission {sessionId, toolCallId, optionId, message?}`. Each adapter offers exactly two options, `allow_once` and `reject_once`. `message` goes to the Agent with a rejection.
- `session.answerElicitation {sessionId, action, content?}`.
- `session.answerPlanProposal {sessionId, planId, decision: 'approve' | 'keep_planning', feedback?}`.
- `session.rename {sessionId, title}`.
- `session.archive {sessionId}` and `session.unarchive {sessionId}`. Unarchive is only the Undo: it succeeds while the Checkout still exists, and fails with `CONFLICT` afterwards.
- `session.markSeen {sessionId, revision}`.
- `session.list {projectId?, archived, cursor?}` returns `SessionInfo` rows, and `session.listUpdates` is a subscription that sends a changed `SessionInfo` or a removal. Child Sessions are never listed.
- `session.changes {sessionId}` returns the Checkout's changed files, and `session.diff {sessionId, path}` returns one file's unified diff.
- `session.subagents {sessionId}` returns the Subagents, and `session.shells {sessionId}` returns the Shells. Both update through the Session snapshot.
- `shell.output {sessionId, shellId, after?}` is a subscription that sends the stored output, then new output as it arrives. `session.stopShell {sessionId, shellId}` stops one.
- `agents.list` returns each registered Agent: `{agent, label, logo, availability, installStep?, configOptions}`.
  - `availability` is `available`, `not_installed`, `not_signed_in` or `unavailable`.
  - `logo` is SVG text from the adapter, so no screen names a vendor.
  - `configOptions` is the template for the New Session composer.
- `projects.list` returns the one Project.
- The Feed procedures from spec 0001 section 6 are built as written, and `feed.page` and `feed.subscribe` also serve child Sessions.

### Session list contract

`SessionInfo` gains:

- `status`: `needs_input`, `running`, `failed`, `unread` or `idle`, taken in that order. The Server derives it, and no App works it out.
  - `needs_input`: a Permission request, an Elicitation or a Plan proposal is pending.
  - `running`: a Turn is running.
  - `failed`: the newest Turn ended with `error`, or the Session gave up after repeated crashes.
  - `unread`: none of the above, and `maxRevision` is above `seenRevision`.
- `title` and `titleSource`: `user`, `agent` or `prompt`.
- `activity`: the live header while running, the request's title while needing input, and otherwise the first line of the newest Agent message.
- `plan: {done, total} | null`, `subagents: {running, total}`, `shells: {running, total}`.
- `archivedAt: number | null`.
- `ticket: null` and `pullRequest: null`. The row keeps these slots, with no data in this milestone.

### Session snapshot

`SessionSnapshot` gains:

- `pendingPlanProposal: {planId, content} | null`, where `content` is markdown. It can be pending while no Turn runs, because Codex ends a plan-mode Turn with its plan.
- `changes: {files, additions, deletions}`: the Checkout summary for the chip.
- `subagents` and `shells`: their lists, so the buttons update live.
- `liveHeader: string | null`.
- `title`, `titleSource` and `archivedAt`.

`state` stays `running`, `requires_action` or `idle`. A pending Plan proposal makes it `requires_action`. A Session with only running Shells or Subagents is `idle` for prompts.

### Agent catalog

- Config options follow ACP v2 (`configId`). The adapter sends the full array after every change, so effort follows the model with no dependency graph.
- `_meta.argo` on a mode value holds `icon` and `tone`: `planning`, `safe`, `moderate` or `dangerous`. `_meta.argo` on a model value holds that model's support flags, so the composer can preview them.
- The contract is loosened to match ACP. A category is any string, unknown categories are kept and ignored, and `_meta` is allowed on an option, a value and a group.
- Plan is a mode value for both Agents. The Codex adapter maps it onto its collaboration mode. Claude's `dontAsk` is not offered. Dangerous modes are offered.
- A change made while a Turn runs is held by the Session and applied right before the next prompt, on both Agents. The held value carries `_meta.argo.heldUntilNextTurn` so the picker can say so.

### Feed contract

Fields that ACP lacks go in `_meta.argo` (ADR 0006):

- `agent_message`: `phase`, either `commentary` or `final_answer`. Codex sends it. The Claude adapter marks the last Agent message of a Turn as the final answer when the Turn ends.
- `tool_call_update`: `commandActions[]`, each `{type: 'read' | 'search' | 'list' | 'unknown', command, path?, query?}`, plus `startedAt`, `endedAt` and `shellId?`. Codex sends command actions. The adapters for other Agents fill them with one shared command parser in the agents package, which names no vendor.
- `subagent_update`: `toolCallId`, `action` (`spawn`, `message`, `wait` or `close`), `prompt` and `result`.
- `permissionOutcome`: gains `decidedBy`.
- A new kind, `session_message`, is the first row of a Subagent's Feed: the prompt its parent sent, with `_meta.argo.senderSessionId`. It is not a `user_message`, because no human typed it (ADR 0012).
- A `task_update` for a finished Shell or Subagent carries `_meta.argo.shellId` or `subagentSessionId`.
- Row ids: spec 0001 section 6 says Claude text rows use `message.id#blockIndex`. Claude sends one record per content block, all with the same `message.id`, and the block index exists only on stream events. The Claude adapter uses the record's own id instead.
- There is no Turn diff and no `goal_update` kind in this milestone.

### Feed presentation

- One pure function in the client package, `toFeedView(rows, snapshot)`, turns Feed rows into what the Feed draws. That covers the groups, the exploration line, the group titles, the live header and the Plan. No screen does this work itself.
- It follows the 17 rules in `feed-presentation.md`, with these changes:
  - There is no Turn fold.
  - The live header shows the running Tool call's title when the Agent gave a description, and its name otherwise. It drops "Esc to stop".
  - Group titles have no counts.
  - An edit's diff expands inline on a phone and opens in the inspector on a wide window.
  - The Plan is a sticky panel on a wide window and a popover from the header on a phone. It is never a Feed row.
  - A Subagent row opens the Subagent's Feed instead of expanding in place.
  - There is no "N files changed" card; the Changed files chip replaces it.

### Session machine changes

These amend spec 0002 section 6.

- **Agent-started Turns.** In `live.idle`, `agent.turnStarted {turnId}` inserts a Turn and goes to `running.working` with no `user_message`. The adapter makes the id. Goals need this, and the Goal UI comes later.
- **Plan proposals.** `agent.planProposed {planId, content}` sets `pendingPlanProposal` in `running` or in `idle`. `session.answerPlanProposal` sends `agent.answerPlanProposal`.
  - Claude: approving allows the plan request and switches to the default mode.
  - Codex: approving starts a Turn in the default collaboration mode. That Turn has no `user_message`.
- **Held config options.** `session.setConfigOption` in `running` stores the value. The Session sends every held value with `agent.setConfigOption` before the next `agent.prompt`.
- **Titles.** `agent.titleChanged {title}` updates the title unless `titleSource` is `user`. `session.rename` sets the title with source `user` and sends `agent.rename`. The Codex adapter generates titles itself, the way the Codex CLI does, with a small model after the first Turn.
- **Subagents.** A Subagent is a read-only child Session: a `session` row with `parentSessionId`, the parent's Agent and the parent's Checkout. It has no Session actor and no agent machine of its own.
  - The parent's adapter sends child rows as `agent.feed {change, subagent}`.
  - The parent Session invokes one feed actor per child.
  - Each run of work is a `turn` row on the child, which gives its duration, tokens and stop reason.
  - The Claude adapter turns on the option that forwards a Subagent's whole conversation.
  - This replaces spec 0002's line that a Subagent shows only as `subagent_update` rows.
- **Shells.** `agent.shellChanged {shell}` and `agent.shellOutput {shellId, text}` go to a Shell store, not to the Feed. `session.stopShell` sends `agent.stopShell`. The Claude adapter stops one background task without stopping the others.
- **Terminal continuation.** `agent.ready` carries `continuedOutside: boolean`. The adapter works it out by comparing the newest vendor record with the newest one Argo stored. When it is true, the Session adds a Notice and imports no rows.
- **Archive.** `session.archive` is accepted only when no Turn runs. It sets `archivedAt` and closes the Session actor. Five seconds later the Server removes the worktree, unless `session.unarchive` came first. The toast shows for three seconds, and the extra two absorb a slow network. The branch is always kept. A Session on the main checkout is only hidden.
- **Idle close.** A Session actor closes after 5 minutes with no running Turn, Subagent or Shell and no pending request, and the next command opens it again. Old Argo learned this. A Session that holds an Agent process forever wastes memory.

### Database

- `session` gains `title`, `titleSource`, `archivedAt`, `seenRevision`, `parentToolCallId` and `subagentRole`.
- `turn` gains `model`, because a Codex child can change it between Turns.
- New table `shell`: `sessionId`, `id`, `toolCallId`, `command`, `cwd`, `status` (`running`, `completed`, `failed`, `stopped` or `lost`), `exitCode`, `startedAt`, `endedAt` and `outputBlobId`. Its primary key is `(sessionId, id)`.
- Shell output: while a Shell runs, the Server tails the Claude output file or appends Codex deltas to a file under `~/.argo/`. When the Shell ends, the output becomes a blob (ADR 0005).
- Recovery after a restart (spec 0002 section 9) also marks running Shells as `lost`.
- The checkout choice is remembered per Project, as a column on `project`.

### Server work

- Changed files: the Server runs `git status` and `git diff --numstat` on the Checkout after each edit Tool call settles and when each Turn ends. The result goes into the snapshot.
- Keep awake: while any Turn runs on macOS, the Engine keeps the Mac from idle sleep with `caffeinate`, bound to the Engine's pid. Closing the lid still sleeps the Mac.

### Desktop

- The renderer tells the main process the attention count and the running count through two new preload calls. The main process sets the dock badge and uses the running count on quit.
- On quit with a running Turn, the main process asks "N Sessions are running. Keep them going?". Keep quits without stopping the Supervisor. Stop stops it as today. This changes spec 0001's rule "on quit, stop it only if this app started it", and spec 0002 section 10's `app.quit`.
- Native notifications use the web Notification API from the renderer, and only while the window is not focused. Clicking one opens the Session.
- **This contradicts ADR 0002,** which says the preload gives only the Server address and window controls. The owner must approve the two new preload calls before this lands.

### App layout and navigation (from the agreed UI map)

- One Expo Router tree. Two route groups carry the layout: one picks the shell by width (720 px), and one is the phone drawer of sections. Detail routes sit beside the sections, so they push over the drawer on a phone (L1, R3).
- URLs: `/` is the Sessions list and replaces today's Projects screen. `/sessions/new` and `/sessions/[id]` follow it. `/issues` and `/atlas` are placeholders. `/settings` has `/settings/agents` and `/settings/connection` (R1, R2).
  - On a wide window, Settings opens Agents, because Accounts is not in this milestone. This differs from L6.
- Layout files own the navigators and render shell pieces from the client package. Route files only render a screen (ADR 0009, R4).
- The client package stays free of `expo-router`. Screens navigate through a `useNavigate()` context with typed destinations. The app fills it from `expo-router`, and Storybook fills it with a recorder (R5).
- Components adapt with a `useWide()` hook. They split into separate phone and desktop components only for the shell, the Session header and the list screen frame (R7).
- Every menu, filter, picker and confirmation is a popover anchored to its button, on every platform. There are no bottom sheets. A full view that belongs to a Session, a Subagent's Feed or a Shell's output, opens as a native page sheet on iOS and full screen on Android and narrow web (O1 to O3).
- The bottom of a Session shows exactly one of: the composer, a request card, or the "Archived · read-only" banner (P3).
- Headers: P1 on a phone, P2 on a wide window. Subagents and Shells: P6.
- Lists: S1 to S4 and S6 for the Sessions list, with the one Project heading. The Projects sub-header's + and Project settings come later.
- New Session: N1 and N3, with one Server row and one Project row.
- React Native Reusables primitives replace the prototype's hand-made ones (X3). No size, spacing or colour comes from the prototype or the map.
- What is copied from old Argo's rail, sidebar, inspector, composer and Session row is decided with the owner, piece by piece, in the UI work for each slice.

## Testing Decisions

A good test checks what a user or a caller sees, through the highest seam that reaches it. It never checks a machine's internal state names, a component's internal state, or which function was called.

1. **Main seam: Playwright end-to-end** against the web build and the real Server, with only the Agent CLI mocked (ADR 0011). The mock CLIs in `mocks/cli/<agent>/` replay recordings. This seam covers:
   - creating, prompting and cancelling
   - answering requests and Plan proposals
   - titles and rename
   - archive and Undo
   - Unread
   - changed files
   - Subagents and Shells

   One test opens two browser pages on one Session, to check that they stay in sync and that the late answer sees "already answered". The scaffold's `projects.spec.ts` is the prior art.
2. **Server composition tests** drive the Engine's services through tRPC callers, with recordings and a temp database (spec 0002 section 12). They cover what a browser can't reach:
   - Engine restarts and interrupted Turns
   - Agent crashes and giving up
   - Agent-started Turns
   - held config options
   - the terminal continuation Notice
   - lost Shells
   - the archive timer
3. **Pure function tables:**
   - `toFeedView`, with rows built from both Agents' recordings, so parity is checked in one place
   - each adapter's `toAgentEvents`
   - the shared command parser
   - `toSessionSnapshot`
   - the list status derivation
4. **Storybook play functions** in `*.test.stories.tsx` for every screen and component, with tRPC fixtures at the link (ADR 0010). They cover the row states, the Feed groups, the request cards, the pickers, and navigation. Navigation is checked through the `useNavigate()` recorder. The Feed fixtures come from recordings run through the real converter, never from hand-written rows. The existing `ProjectsScreen` and `app-providers` stories are the prior art.
5. **`xstate/graph` model-based tests** for every new or changed machine (AGENTS.md). The Supervisor, Engine and Connection machine tests are the prior art.

**Recordings come first.** The real Claude and Codex streams needed are:

- a Turn with edits and commands
- a Permission request
- an Elicitation
- a Plan proposal
- Compaction
- a foreground Subagent, and a background one
- a background Shell, and stopping it
- a Codex child given more work
- a Codex process that outlives its Turn

Old Argo's recordings (claude-cli 2.1.286, codex-app-server 0.157.0) and mock CLIs are ported as a start.

## Out of Scope

Each item below becomes its own issue, labelled `needs-triage`. The issues are shown to the owner before they are created.

1. Queueing a message while a Turn runs.
2. Importing stopped external Sessions. Research is in a separate session.
3. A real phone over the network (Tailscale and a pairing token), and a Server that outlives the desktop app, with a menu bar item.
4. Push notifications.
5. Delete, pin, fork, handoff and search.
6. Pulling in history after a terminal continuation (parked).
7. Project navigation with Atlas and Issues, Add Project, and Project settings.
8. "Allow for this Session".
9. Unarchive beyond the Undo.
10. The Goal UI.
11. PR and Ticket data on the Session row.
12. A Feed detail setting, only if people ask for it.
13. The Review pane and undoing changes.
14. Stopping a Subagent.
15. Settings: Accounts, Appearance and Notifications.

## Further Notes

### Delivery in vertical slices

Each slice is one ticket that first fixes its contract: Zod schemas, tRPC procedure signatures and recorded fixtures. Then two agents work in parallel:

- **UI**, labelled `ready-for-human`: builds the screens in Storybook against the fixtures with the owner, until the design is right.
- **Backend**, labelled `ready-for-agent`: builds the Server side, connects the screen to live data, and adds the end-to-end test.

Every backend part covers both Agents, because parity is part of every Session change. The foundations from spec 0002 section 14 come first, and so do the recordings, since fixtures depend on them.

The slices, in order:

1. The app shell, routes, `useNavigate()`, and placeholder Issues, Atlas and Settings screens.
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

### Changes to specs 0001 and 0002

- Spec 0001:
  - The Desktop rule for quit.
  - The Claude row id in section 6.
  - The config option contract.
  - The list of Session procedures.
- Spec 0002:
  - Section 6: Agent-started Turns, Plan proposals, held config options, titles, Subagents, Shells, archive and idle close.
  - Section 7: the new agent events.
  - Section 9: lost Shells.
  - Section 10: `app.quit` with Keep.

### Decisions taken while writing, for the owner to check

These were not discussed in the grilling sessions:

- Archive is refused while a Turn runs.
- The worktree is removed 5 seconds after archive, while the toast shows for 3.
- The idle close after 5 minutes.
- What the activity line shows.
- Agent logos come from the adapter as SVG text.
- Desktop attention goes through two preload calls, which needs ADR 0002 amended.
- Settings opens Agents on a wide window.
- Approving a Codex Plan proposal starts a Turn with no `user_message`.
