# Argo

Argo is a cockpit for coding agents. It runs Claude and Codex sessions on your machine and shows them on desktop, web, and phone.

## Places and processes

**Project**:
A registered git repository that Argo works in. One git common directory is one Project.
_Avoid_: Repo, workspace

**Server**:
The local program that owns Sessions, git work, and storage for one machine. It runs as a Supervisor and an Engine. It plays the role that ACP calls the Client.
_Avoid_: Daemon, backend, host

**Supervisor**:
The long-lived Server process that starts the Engine, restarts it when it fails, and tells Apps where the Server is.
_Avoid_: Parent, watchdog, launcher

**Engine**:
The Server process that does the Server's work: storage, the Connections, and Sessions. The Supervisor can restart it without the Server going away.
_Avoid_: Worker, child, core

**App**:
A program that shows Argo to a person: the universal app on iOS, Android, and web, or the desktop app.
_Avoid_: Client (ACP uses that word for the Server), frontend

**Connection**:
The live link between an App and the Server.
_Avoid_: Binding, socket

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

**Session**:
One conversation with one Agent, with an Argo id and the Agent's own session id.
_Avoid_: Chat, thread, conversation

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

**Turn**:
One prompt to an Agent and everything the Agent does until it stops, ending with a stop reason.
_Avoid_: Run, request, exchange

**Agent adapter**:
The plain functions that connect Argo to one Agent: start or resume its vendor session, and map its messages into Agent events.
_Avoid_: Driver, provider, integration

**Agent machine**:
The one state machine that runs every Agent adapter for a Session: it starts the vendor session, runs commands in order, and tracks the Turn.
_Avoid_: Claude machine, adapter machine

**Vendor session**:
The Agent's own live session that an Agent adapter starts or resumes, identified by the Agent's session id.
_Avoid_: Agent connection, connection, process

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
