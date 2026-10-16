# Argo

Argo is a cockpit for coding agents. It runs Claude and Codex Sessions on your machine and shows them on desktop, web, and phone.

## Places and processes

**Project**:
A registered git repository that Argo works in. One git common directory is one Project.
_Avoid_: Repo, workspace

**Server**:
The local program that owns Sessions, git work, and storage for its Server Device. It runs as a Supervisor and an Engine. It plays the role that ACP calls the Client.
_Avoid_: Daemon, backend, host

**Supervisor**:
The long-lived Server process that starts the Engine, restarts it when it fails, and tells Apps where the Server is.
_Avoid_: Parent, watchdog, launcher

**Engine**:
The Server process that runs storage, the Connections, and Sessions. The Supervisor can restart it without the Server going away.
_Avoid_: Worker, child, core

**App**:
A program that shows Argo to a person: the universal app on iOS, Android, and web, or the desktop app.
_Avoid_: Client (ACP uses that word for the Server), frontend

**Connection**:
The live link between an App and one Server. An App can hold one Connection to each of several Servers.
_Avoid_: Binding, socket

**Device**:
A computer or phone that runs an App.
_Avoid_: Client, machine (for a phone)

**Server Device**:
The Device that a Server runs on. Each Server has one.
_Avoid_: Host, host Device, Server machine

**Pairing**:
Giving a Device access to a Server that runs on another Device.
_Avoid_: Linking, enrolment, registration

**Paired Device**:
A Device whose App has access to a Server through Pairing. It is never that Server's Server Device.
_Avoid_: Remote Device, guest, client

**Issue**:
A work item in a Project's Tracker, such as Linear or GitHub Issues.
_Avoid_: Ticket, task

**Integration**:
A Project's link to an outside service, such as GitHub. A Project's chosen Tracker is an Integration.
_Avoid_: Connection, account link

## Plugins

**Plugin**:
A folder the Server loads that adds nav items, pages, Settings sections or Slot content to Argo. Argo's own Issue tracker and Atlas are Plugins.
_Avoid_: Extension, add-on, mod

**Plugin host**:
The Server process that runs Plugin code, each Plugin in its own worker thread with no Node; a Plugin reaches the machine only through its `argo` object. Apps never run Plugin code.
_Avoid_: Extension host, sandbox

**Hook**:
A Plugin function on a core event, such as `prompt.submit` or `tool.call`. Hooks on one event form a chain: each passes the event on, rewrites it, or answers for core.
_Avoid_: Listener, interceptor, middleware

**Slot**:
A named, versioned place in a core page that Plugins fill, such as Project details.
_Avoid_: Contribution point, hook, outlet

**Replaceable Slot**:
A Slot placed around a core component, such as a Tool call in the Feed. A Plugin may pass it through, change its props or draw its own; core draws its own when the Plugin's tree is refused.
_Avoid_: Override, component override

**Tracker**:
A source of Issues inside the Issue tracker Plugin, such as GitHub Issues or Linear. Each Project chooses one.
_Avoid_: Provider, backend, issue source

## Agents and Sessions

**Agent**:
A coding agent program that Argo drives, such as Claude or Codex.
_Avoid_: Harness, provider, vendor, model

**Session**:
One conversation with one Agent, with an Argo id and the Agent's own session id.
_Avoid_: Chat, thread, conversation

**Empty Session**:
A Session that New Session opened and no prompt has reached yet. It is not listed, and closing it discards it with its worktree and branch.
_Avoid_: Draft Session, pending Session

**Subagent**:
A Session that another Session started to do delegated work.
_Avoid_: Child agent, task agent

**Shell**:
A command an Agent started in the background, which keeps running while the Turn goes on.
_Avoid_: Background task, terminal, process

**Goal**:
An objective that the Agent keeps working toward across Turns, starting the next Turn itself until the Goal is met.
_Avoid_: Target, loop

**Checkout**:
The git working tree that a Session runs in: its own worktree, or the Project's main checkout.
_Avoid_: Workspace, worktree (when the main checkout is also possible)

**Composer**:
Where the user writes the next prompt for a Session, with its Agent, model and mode controls.
_Avoid_: Input, chat box, prompt bar

**Slash command**:
A command or skill the Agent offers, named in a prompt as `/name` with optional arguments.
_Avoid_: Command (alone), shortcut, action

**Issue reference**:
An Issue named in a prompt as `#` and its number.
_Avoid_: Mention, issue link, tag

**Turn**:
A stretch of Agent work started by a prompt or by the Agent, ending with a stop reason when the Agent finishes or the Session ends it.
_Avoid_: Run, request, exchange

**Agent session**:
The Agent's own live session behind a Session, identified by the Agent's session id.
_Avoid_: Vendor session, upstream session, Agent connection, process

**Registry**:
The public ACP Registry that lists the Agents that Argo can run; Argo's Agent catalog is synced from it.
_Avoid_: Session Registry (the Engine's live Sessions are its open Sessions), catalog (for the upstream list)

**Stop reason**:
Why a Turn ended: `end_turn`, `max_tokens`, `max_turn_requests`, `refusal`, `cancelled`, `error`, or `auth_required`.
_Avoid_: Exit status, finish reason, interrupted (as a Stop reason)

**Settled**:
A Session update that will not change again. Every Turn ending settles its Turn's Session updates, and a Tool call still running then is settled as cancelled.
_Avoid_: Closed, finalised

## What a Session shows

**Feed**:
The ordered list of Session updates that Argo shows for one Session.
_Avoid_: Timeline, transcript, log, history

**Session update**:
One entry in the Feed, such as an agent message, a tool call, or a plan update. Its kinds use ACP names.
_Avoid_: Event, item, message

**Agent message**:
Text that the Agent wrote to the user in a Turn.
_Avoid_: Assistant message, reply

**Agent thought**:
Reasoning text that the Agent showed in a Turn. It is never read as an Agent message.
_Avoid_: Reasoning, thinking

**Tool call**:
One action that the Agent took, such as reading a file, editing files, or running a command.
_Avoid_: Tool use, function call, command (for the action)

**Plan**:
The Agent's live checklist for a Session. The Agent replaces it whole on each change.
_Avoid_: Todo list, task list

**Plan proposal**:
A written plan that the Agent offers and that the user approves or rejects.
_Avoid_: Plan (for the document), exit-plan

**Written plan**:
A plan document the Agent keeps without asking for approval, as Markdown text or only as a URI.
_Avoid_: Plan (for the document), Plan proposal (when nothing is asked)

**Attachment**:
An image or file the user adds to a prompt from their device. The Server stores it as a Blob, and the Agent receives an image as a picture and any other file as the file itself.
_Avoid_: Upload (in UI), Resource reference

**Resource reference**:
A resource the Agent names in its content by URI, with a name and optionally a description and embedded text. Argo shows it and does not open it.
_Avoid_: Link, attachment

**Permission request**:
A question from the Agent to let a Tool call run, with options to allow or reject.
_Avoid_: Approval, prompt

**Elicitation**:
A question from the Agent that asks the user for information.
_Avoid_: User question, ask

**Compaction**:
A point where the Agent condensed the Session history so that the Session can continue.
_Avoid_: Summarisation, context reset

**Unread**:
A Session whose Feed changed after anyone last saw its end, on any App.
_Avoid_: New, unseen

**Live header**:
The one line that says what the Agent is doing while a Turn runs, such as "Running pnpm test".
_Avoid_: Status line, spinner text

**Notice**:
A short message about the Session that is not from the Agent's conversation, such as a retry or a hook result.
_Avoid_: Notification, system message

## UI

**UI kit**:
Argo's small set of components, tokens and prop names that every screen, and later every plugin, is built from. Its components are the primitives of ADR-0020.
_Avoid_: Design system (for the code), component library

**Frame**:
The App's chrome around its pages: the rail, the section sidebar and the panes. It places them with a Scaffold.
_Avoid_: Shell, app shell, chrome

**Scaffold**:
A kit component that arranges a screen's panes for its Size class, such as list and detail side by side on wide windows and drill-in on phones. Content is written once; the Scaffold places it.
_Avoid_: Layout (for a whole screen), template

**Surface**:
A named background a kit component draws on, such as `card`, `tray`, `glass` or `overlay`, with its fill, radius and depth.
_Avoid_: Panel, background, layer

**Slot**:
A named place in a kit component that takes another component, such as a row's `leading` or `trailing`. Each Slot names the components it accepts.
_Avoid_: Render prop, child (for a named place)

**Size class**:
The width class an App lays itself out for: `compact` (below 600, and every phone), `medium` (600 to 1099) or `wide` (1100 and up).
_Avoid_: Breakpoint, wide mode
