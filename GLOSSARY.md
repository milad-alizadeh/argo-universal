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
A work item in a Project's tracker, such as Linear or GitHub.
_Avoid_: Ticket, task

**Integration**:
A Project's link to an outside service, such as GitHub.
_Avoid_: Connection, account link

## Agents and Sessions

**Agent**:
A coding agent program that Argo drives, such as Claude or Codex.
_Avoid_: Harness, provider, vendor, model

**Enabled**:
The user's choice to offer an Agent for new Sessions, kept per Registry catalog entry. Only the user changes it: finding, removing or reinstalling the Agent keeps it. A disabled Agent leaves the New Session picker and stays in Settings › Agents.
_Avoid_: Active, available (for this choice)

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

**Readiness**:
Whether an installed Agent can start a Session now, found by launching its saved launch and answering ACP initialize without creating an Agent session. Its status is one of Checking…, Ready, Sign-in needed, Account not supported, Not compatible, Can't start, Couldn't check or Not found, with a reason that never carries credentials. An Agent that does not report its account is Ready until it asks for sign-in when a Session opens or a prompt runs, which makes it Sign-in needed; Account not supported means the Agent reported an account that is not a subscription.
_Avoid_: Availability, Unavailable, health, probe result

**Resolver**:
The Engine part that looks for each catalog Agent and custom Agent on this Mac: first in Argo's own folder, then on `PATH`. It runs at Server start, after the first catalog sync, when the Agents page opens with a stale look, after an install, update, removal or Repair, on Check again, and again whenever a Session opens.
_Avoid_: Detector, scanner, discovery

**Installation observation**:
What the Resolver last saw for one Agent: the launch it found, whether Argo owns that copy (Installed by Argo) or not (Found on this Mac), and when it looked; or that it found nothing, which shows Not found. Ownership is read from where the file is, never stored as a choice.
_Avoid_: Install record, detection result

**Stop reason**:
Why a Turn ended: `end_turn`, `max_tokens`, `max_turn_requests`, `refusal`, `cancelled`, or `error`.
_Avoid_: Exit status, finish reason

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
