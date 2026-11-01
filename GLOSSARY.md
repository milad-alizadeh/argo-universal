# Argo

Argo is a cockpit for coding agents. It runs Sessions with any Agent from the ACP Registry and shows them on desktop, web, and phone.

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

**Writer**:
The one queue in the Engine that writes Session updates, Turns, and Sessions to storage. Until a job commits, readers show its queued copy over the stored one.
_Avoid_: Write queue, persister, flusher

**Queued role**:
A part a Writer job plays in reads while it waits in the queue, such as the Session row or Feed rows it will write. A reader finds a role by what the job offers, never by its kind.
_Avoid_: Projection, job type

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

Server Device and Paired Device describe a Device's relationship to one Server, not a kind of computer, so one Device can be both at once for different Servers: a laptop is the Server Device for its own Server and a Paired Device for the desktop's.

**Pairing Ticket**:
The short-lived, single-use code in a Server's QR that lets one Device start Pairing. It is not the credential: the Device sends its own Device Key during Pairing and authenticates with that afterwards, and the ticket is spent.
_Avoid_: Pairing code (in code), token, invite, key

**Device Key**:
The long-term keypair an App makes for its Device and keeps in the platform's secure storage. Its public half is what a Server stores for a Paired Device, so unpairing that Device is one row deleted. A Device that cannot store one securely is refused rather than half-trusted.
_Avoid_: Client key, certificate, identity (for the key)

**Local network access**:
The Server Device-only setting, off by default, that lets a Server listen beyond `127.0.0.1` and advertise itself for discovery. Pairing is unavailable until it is on, and nothing turns it on as a side effect.
_Avoid_: Remote access (that reaches the internet), LAN mode, network sharing

**Issue**:
A work item in an Issue tracker that a Plugin draws, such as Linear or GitHub Issues. Argo has no Issues of its own.
_Avoid_: Ticket, task

## Operations

**Operation**:
A named thing Argo can do, such as listing Projects or starting a Session, defined once with typed arguments and a tier. Agents, the command line and Apps all call the same Operation.
_Avoid_: Command (a Slash command or a shell command), tool, action, capability

**Operation tier**:
How far an Operation may go without asking the user: `read` never asks, `act` stays within the caller's own scope and never asks, and `confirm` always asks first, whatever mode the Agent is in.
_Avoid_: Permission level, risk level

**Prompt chain**:
How many Prompts stand behind the one a Session is serving: the user's Prompt is 0, and a Prompt an Agent sends from its Turn is one more than the Prompt that started that Turn. Sessions in one Project prompt each other without asking, and past ten the call is `confirm`, so no cascade runs on forever with no user in it.
_Avoid_: Prompt depth, delegation depth (the cap on which Sessions exist), Hook chain

**Operation work**:
What an Operation started that its caller can wait for by a wait id: a Session opening, a Turn, or the Operation's own Tool call. A wait gives up after ninety seconds and never stops the work.
_Avoid_: Job, task

**Session directory**:
The Sessions an Operation can see, read the way the Operations that act on them read them: the stored row with the Writer's queued changes over it, and a Session that is still opening. A Session caller's scope and the Operations themselves read the same directory, so they never disagree about which Sessions exist.
_Avoid_: Session registry, Session lookup

**Session work source**:
Where an Operation reads and watches its Operation work: a Session opening, a Turn, or an Operation's Tool call, read again on each change.
_Avoid_: Work store, work tracker

**Open Sessions**:
The Engine's live Sessions, keyed by Session id. A Session command reaches a Session only through them, and a Session they no longer hold is not found.
_Avoid_: Session registry, active Sessions

**Ready Session**:
An open Session that accepts Session commands now. Its statechart says so with a tag; nothing outside the statechart reads its state names.
_Avoid_: Idle Session, live Session (for this)

## Plugins

**Plugin**:
A folder the Server loads that adds nav items, pages, Settings sections or Slot content to Argo. Argo's own Issue tracker and Atlas are Plugins.
_Avoid_: Extension, add-on, mod

**Plugin host**:
The Server process that runs Plugin code, each Plugin in its own worker thread with no Node; a Plugin reaches the machine only through its `argo` object. Apps never run Plugin code.
_Avoid_: Extension host, sandbox

**Plugin API**:
The `argo` object a Plugin's `register` receives: its calls to files, processes, the network, storage, secrets, settings and Accounts, its OAuth redirect, and its pages, Slots, Hooks, Queries and background pass. `@argo/plugin-kit` exports its type as `Argo`.
_Avoid_: SDK, host API, `api`

**Hook**:
A Plugin function on a core event, such as `prompt.submit` or `tool.check`. Hooks on one event form a chain: each passes the event on, rewrites it, or answers for core.
_Avoid_: Listener, interceptor, middleware

**Slot**:
A named, versioned place in a core page that Plugins fill, such as Project details. Each Plugin adds its own content; Argo decides where it goes and how much fits, and Plugins never change Argo's or each other's. A Slot takes either a page of kit components or items of a fixed shape that Argo draws, such as a Session row's meta items, asked for once per list.
_Avoid_: Contribution point, hook, outlet

**Plugin tree**:
The kit components a Plugin sends for one page or Slot, which the App draws. Everything drawn inside it is the Plugin's, so its Actions cannot claim Argo's reserved shortcuts.
_Avoid_: Wire tree, Plugin UI

**Single-owner Slot**:
An items Slot only one source shows at a time, such as a Session row's Activity line. Every Plugin that declares it answers; the App shows the answer of the one Plugin the user chose in Settings on that Device, or Argo's own while none is chosen or the chosen Plugin is turned off or has no answer.
_Avoid_: Part, takeover, exclusive Slot

**Replaceable Slot**:
A Slot placed around a core component, a Tool call or a message in the Feed. A Plugin reaches one only through its `ui.render` Hook and may pass it through, change its props or draw its own; core draws its own when the Plugin's tree is refused.
_Avoid_: Override, component override

**Plugin wire version**:
The one version of the Plugin wire that an App reports when it connects. The Server sends Plugin trees only to an App at or above the minimum; an older App sees "Update Argo" in place of Plugin pages and Slots, and core's own component in Replaceable Slots. See ADR-0034.
_Avoid_: Kit component version, kit version, protocol version

**Page path**:
The path a Plugin registers one of its pages at with `argo.pages.register`, and the same path its `navigate` Action opens. It never holds the App's route: the App finds the nav item the page sits under and builds the route itself.
_Avoid_: App path, route (for what a Plugin writes)

**Component event**:
A named handler prop on a kit component, such as `onPress`; the App sends it to the Plugin by node key and event name, checked against the kit component's schema.
_Avoid_: Interaction, action (Action is a kit component), handler

**Capability**:
Something a Plugin's manifest says it needs, such as running `gh` or reaching `api.github.com`. Without any, a Plugin's calls to the machine can only read Projects and use the Plugin's own data.
_Avoid_: Permission (that is the Agent's Permission request), scope, entitlement

**Grant**:
The answer, from the user or from Argo for a first-party Plugin, about a Capability or about one Plugin's use of one Account: allowed or refused. Unset means nobody has been asked, and the first use asks. The user can remove a single Grant.
_Avoid_: Approval, permission

**Query**:
A read a Plugin describes as a value instead of making, which Argo performs, keys by its normalised form and refreshes on a clock Argo owns.
_Avoid_: Descriptor, query key, request object

**Background pass**:
One run of a Plugin's declared background entry on its interval, for one Project. It refreshes Queries and may set its own nav badge; it draws nothing and never raises a Notification.
_Avoid_: Job, cron, tick

**Nav badge**:
The count a Plugin puts on one of its own nav items with `argo.nav.badge(id, count)`; zero clears it. It belongs to the whole Plugin, not to a Project, so the Plugin sets the total it wants shown.
_Avoid_: Nav count, badge count, unread count

**Borrow**:
One Plugin using an Account another Plugin provides. Argo checks the Grant, asks the providing Plugin for a fresh token and sets the header; the borrowing Plugin never sees the token, and the header never leaves the Account's host.
_Avoid_: Share, delegate, proxy

**Account**:
A sign-in one Plugin provides and other Plugins borrow, named by the API host its token opens, such as `api.linear.app`, rather than by the button that gets it. CircleCI and GitHub are separate Accounts though both sign in with GitHub. A Plugin asks Argo for an Account, and the user approves each Plugin once per Account. See ADR-0036.
_Avoid_: Login, credential, identity, Tracker, Integration

## Agents and Sessions

**Agent**:
A coding agent program that Argo drives, such as Claude or Codex. The Agents page lists the Installed ones with the Registry below them. The word has a second sense, below.
_Avoid_: Harness, provider, vendor, model

**Session**:
One conversation with one Agent, with an Argo id and the Agent's own session id.
_Avoid_: Chat, thread, conversation

**Empty Session**:
A Session that New Session opened in the Project's main checkout and no prompt has reached yet. It is not listed, and leaving New Session discards it.
_Avoid_: Draft Session, pending Session

**Agent**:
A Session that another Session started to do delegated work. This is the second sense of the word and not the one above: that Agent is a program Argo runs, this one is a Session. The owner dropped Subagent on 2026-10-21 and coined no second name, so which sense is meant is read from the sentence, and a doc that would be ambiguous says so.
_Avoid_: Subagent, child agent, task agent

**Shell**:
A command an Agent started in the background, which keeps running while the Turn goes on.
_Avoid_: Background task, terminal, process

**Goal**:
An objective that the Agent keeps working toward across Turns, starting the next Turn itself until the Goal is met.
_Avoid_: Target, loop

**Checkout**:
The git working tree that a Session runs in: its own worktree, or the Project's main checkout.
_Avoid_: Workspace, worktree (when the main checkout is also possible)

**Change**:
One line of work in a Session, named by its branch, at one of five stages: Working, Branch, Open, Merged or Closed. A Session can have several at once.
_Avoid_: PR, pull request, diff, branch (for the work)

**Comparison**:
What a Checkout's changed files are measured against: `main`, `uncommitted`, or another branch.
_Avoid_: Base, diff target

**Composer**:
Where the user writes the next prompt for a Session, with its Agent, model and mode controls.
_Avoid_: Input, chat box, prompt bar

**Starting choices**:
The model, effort and mode a new Session starts with, sent in that order because the model decides which effort levels and modes remain. Effort is ACP's `thought_level`; whether the model has effort at all comes from its `supportsEffort`.
_Avoid_: Preferences, defaults, config options (for the three alone)

**Session configuration**:
The Agent options a Session runs with: its model, effort, mode and the rest the Agent offers. Choices made before Send are applied in Starting choices order; a choice made during a Turn is held until the Turn ends.
_Avoid_: Settings, config options (for the whole set)

**Held choice**:
A Session configuration choice made while a Turn runs, held and sent to the Agent when the Turn ends.
_Avoid_: Pending option, queued config

**Slash command**:
A command or skill the Agent offers, named in a prompt as `/name` with optional arguments.
_Avoid_: Command (alone), shortcut, action

**Composer suggestion**:
An item offered in the Composer's `/` menu, from an Agent or a Plugin. An Agent's Composer suggestion represents a Slash command, which it states with `command`; a Plugin result is never one, whatever it inserts.
_Avoid_: Slash command (for a Plugin result), autocomplete item

**Issue reference**:
An Issue named in a prompt as `#` and its number.
_Avoid_: Mention, issue link, tag

**Prompt**:
What is sent to a Session's Agent to start a Turn. It comes from the user, from another Session or from a Plugin, and the Feed shows which; only the user's is the user's own message.
_Avoid_: Message (alone), input, instruction

**Turn**:
A stretch of Agent work started by a Prompt or by the Agent, ending with a stop reason when the Agent finishes or the Session ends it.
_Avoid_: Run, request, exchange

**Stored Turn**:
A Turn as read back from storage, before the Writer's queued changes are laid over it.
_Avoid_: Turn row, saved Turn

**Agent session**:
The Agent's own live session behind a Session, identified by the Agent's session id.
_Avoid_: Vendor session, upstream session, Agent connection, process

**Registry**:
The public ACP Registry of Agents that Argo can run, and the copy the Server keeps for use offline.
_Avoid_: Session Registry (the Engine's live Sessions are its open Sessions), catalog (for the upstream list)

**Installed Agent**:
A Registry Agent the user installed on a Server, stored in `agent_servers` and downloaded on first launch.
_Avoid_: Saved Agent, configured Agent, catalog

**Stop reason**:
Why a Turn ended: `end_turn`, `max_tokens`, `max_turn_requests`, `refusal`, `cancelled`, `error`, or `auth_required`.
_Avoid_: Exit status, finish reason, interrupted (as a Stop reason)

**Settled**:
A Session update that is closed: its Turn ended, or it belongs to no Turn. Every Turn ending settles its Turn's Session updates, which will not change again, and a Tool call still running then is settled as cancelled. A row that belongs to no Turn is written settled at once, because no Turn ending will come for it, and it may still grow. The exception is a turnless Tool call still `pending` or `in_progress`, which stays unsettled until the Agent reports how it ended.
_Avoid_: Closed, finalised

## What a Session shows

**Feed**:
The ordered list of Session updates that Argo shows for one Session.
_Avoid_: Timeline, transcript, log, history

**Session snapshot**:
Everything a Session shows that is not in its Feed, such as its title, state, Live header, Shells, and the Agents it started. It is sent whole on each change.
_Avoid_: Session state (one field of it), session details

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

**Tool call facts**:
What the Feed needs to know about a Tool call, decoded once from its wire details: whether it explores, edits or runs a command, the path it names, and its permission outcome.
_Avoid_: Tool call meta

**Plan**:
The Agent's live checklist for a Session. The Agent replaces it whole on each change.
_Avoid_: Todo list, task list

**Written plan**:
A plan document the Agent keeps without asking for approval, as Markdown text or only as a URI.
_Avoid_: Plan (for the document), Plan proposal

**Attachment**:
An image or file the user adds to a prompt from their device. The Server stores it as a Blob, and the Agent receives an image as a picture and any other file as the file itself.
_Avoid_: Upload (in UI), Resource reference

**Resource reference**:
A resource the Agent names in its content by URI, with a name and optionally a description and embedded text. Argo shows it and does not open it.
_Avoid_: Link, attachment

**Permission request**:
A question from the Agent, or from Argo about an Operation the Agent called, to let a Tool call run, with options to allow or reject. The answer is only the chosen option. An Agent's request to leave plan mode is one: its Tool call carries the plan.
_Avoid_: Approval, prompt, Plan proposal

**Elicitation**:
A question from the Agent that asks the user for information.
_Avoid_: User question, ask

**Input request**:
A Permission request or Elicitation that waits for the user's answer. A Session's pending Input request is its oldest Permission request, else its oldest Elicitation.
_Avoid_: Prompt, pending action

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

**Notification**:
An alert that tells the person a Session needs input or a Turn ended, outside that Session's Feed.
_Avoid_: Notice, Feed entry

## UI

**UI kit**:
Argo's small set of kit components, tokens and prop names that every screen, and later every plugin, is built from.
_Avoid_: Design system (for the code), component library

**Kit component**:
One component of the UI kit, such as Button, List or Screen, drawn by Argo on every platform. A Plugin sends one by name and props; a Contracts schema defines its props, Slots and events once. A plain component is a function a Plugin author writes in JSX.
_Avoid_: Part, UI kit component, primitive

**FieldGroup**:
A page's fixed rows of values and controls, such as Project details or Plugin settings, arranged in sections. Values save as they change, or a page that sends them puts one submit button below the FieldGroup.
_Avoid_: Grouped list, settings list, Form

**Field**:
One row in a FieldGroup, of a fixed type such as a value, a link, a toggle, a text field or a choice.
_Avoid_: Settings row, ListItem (for a Field)

**Control**:
A standalone input that sits on its own in a screen, such as a search field, a segmented control, a filter pill or a slider. A value that belongs to a page of fixed rows is a Field in a FieldGroup, not a Control.
_Avoid_: Input (for the kit folder), Field (for a standalone control)

**List**:
Rows of data of any length, such as Sessions or Agents, optionally in List sections.
_Avoid_: FieldGroup (for data rows)

**Selection mode**:
The state of a List while its rows are being chosen. Its own header (the count, Select All and Done or Close, and the selected Actions) replaces the Screen's header until selection ends. A Screen on iOS draws the Select entry that starts it.
_Avoid_: Edit mode (except for iOS's own), multi-select

**List section**:
A distinct group of items in a List, with an optional heading and footer.
_Avoid_: Group (when naming a List section)

**List look**:
How one List draws, resolved once from the platform, its appearance and where it sits (a popover, a sidebar): its insets, its headings and footers, whether rows are separated, and whether the web draws its grouped sections as cards or a phone draws them as corners. Every part of the List reads it; none asks the platform itself.
_Avoid_: Theme, style

**Density**:
How tightly a List or a Card draws its content: `regular` or `compact`. A compact List draws each row as one line on a wide desktop or web window; phones and narrow windows always draw regular rows.
_Avoid_: Size, dense, condensed

**Nested row**:
A ListItem written inside another ListItem, its parent. A wide desktop or web window draws it one tree lane further in, with a rail from its parent, and folds it under its parent's chevron; phones draw it flat, right after its parent.
_Avoid_: Sub-item, child row, tree item

**Pill**:
A short, static label that shows an Argo status or a label from a Plugin. A tracker label keeps its colour: the text takes it, over a lighter fill of it.
_Avoid_: Badge, chip

**Path text**:
A file path drawn on one line with its folder muted and its name strong. A narrow box cuts the folder's start, never the name, and the whole path shows in a tooltip only while it is cut; compact widths scroll it sideways instead.
_Avoid_: Breadcrumb, file label

**Row badge**:
A status dot or count drawn at the top-end corner of a row's leading icon or image.
_Avoid_: Badge (for a Pill)

**Avatar**:
A circular image or initials that identifies a person or Agent, with an optional StatusDot.
_Avoid_: Profile picture

**StatusDot**:
A small coloured dot that shows an item's state.
_Avoid_: Status indicator

**Metadata**:
Read-only label and value fields for a detail view, such as a Project's Device and Path. Each field is a named part: Label, Link, Pills, StatusDot or Avatar. On desktop and web, beside a Detail's content, it is headed "Properties" unless the Plugin names it; a Detail too narrow for that column draws it as one line of values under the title.
_Avoid_: key-value list

**Screen**:
One entry on a navigation stack: its header (title, search, primary Action, Actions) and its content, declared together. A route shows one Screen; a Sheet stacks Screens of its own.
_Avoid_: Page, view (for a stack entry)

**Screen header**:
What a Screen's header holds once it is known where it is drawn: Argo's own heading, the iOS toolbar, or Android's top app bar and FAB. Each has its own room, so the header decides which Actions are buttons and which go to the overflow menu, the one primary Action, and the Select entry; a selecting List's header replaces all of them. The platforms only draw it.
_Avoid_: Header items, toolbar model

**Header site**:
Where a Screen's header draws, decided once from the facts around it: its own heading, the navigator's stack header, a list column's top row, or the window's band. One function picks it; each site's drawing only draws.
_Avoid_: Header placement, header mode

**Content column**:
The column a Screen's heading and content keep to: on a wide window the reading width centred in the pane, inside the Screen's side margins; a Metadata column beside the content widens it, so the reading width stays the content's. Each part of a Screen offers it to what it holds; a scroll view or grouped cards claim it and keep to it themselves, and the part pads anything else. A popover, a sheet's page or a FieldGroup's rows are outside it.
_Avoid_: Scroll column, heading inset

**Content wide**:
Whether a content column is at least the threshold (`--container-content-wide`) that draws the desktop Composer and cards. Under a Frame the page takes it from the column the Frame layout placed; a host with no Frame, such as Storybook, measures it; with neither, it follows the window. The threshold, the column's maximum and its gutters are one content rule.
_Avoid_: Container query, second measurement

**Centred modal**:
The one overlay a Dialog and a web Sheet both open in: a card centred over a dimmed backdrop that keeps focus inside, closes on Escape, a backdrop press or the back button unless its content holds unsaved input, and hands focus back to what opened it.
_Avoid_: Dialog overlay, modal sheet (for the shared overlay)

**Actions**:
The verbs a Screen, a row or a tile offers, in sections, declared once and drawn as each platform draws them: header controls for a Screen, a context menu for a row or tile. They hold verbs only; a choice is a Menu.
_Avoid_: ActionList, action panel, action menu (for the declaration)

**Frame**:
The App's chrome around its pages: the rail, the section sidebar and the panes. It places them with a Scaffold.
_Avoid_: Shell, app shell, chrome

**Frame layout**:
Where every region of a wide window's Frame sits: the rail, the list, the page and its content column, the Workbench and the Inspector, with the dividers between them and how far each drags. It is worked out once from the window's width, the preferred pane widths and what the person asked of the sidebar, the Workbench and the Inspector; the content keeps its floor first, then the Workbench undocks, then the list folds.
_Avoid_: Geometry, legacy layout

**Scaffold**:
A kit component that arranges a screen's panes for its Size class, such as list and detail side by side on wide windows and drill-in on phones. Content is written once; the Scaffold places it.
_Avoid_: Layout (for a whole screen), template

**Workbench**:
The column beside a Session's Feed with summary cards for its sections, including Plugin cards. Cards show counts, totals and bounded previews; their bodies or items open full Inspector tabs, also reachable on phones.
_Avoid_: Inspector, right panel, second sidebar

**Place**:
Somewhere in the Frame that a page fills while it is shown: the window band, the sidebar or the Inspector column. The Frame offers it and a page claims it with what to draw; only the shown page holds it, and only on a wide window. The newest claim shows, and an older one is not restored when it ends. Selection mode is the one Place where the first claim holds it, unless a selecting List claims it.
_Avoid_: Host, slot (a Slot is a Plugin's)

**Inspector**:
The surface that shows a Workbench card's section in full, with a tab for its list and item details. Details include a Change's diff, an Agent's Feed or a Shell's output; the Workbench stays open beside it.
_Avoid_: Stage, detail pane, viewer

**Section**:
One kind of a Session's work, such as Changes, Agents, Shells or a Plugin's. Each has a Workbench card that summarises it and an Inspector tab that shows it in full. Changes is always offered; Agents and Shells are offered once the Session has some.
_Avoid_: Panel, pane, Workbench card (for the whole kind)

**Surface**:
A named background a kit component draws on: `background`, `card`, `muted` or `glass`, with its fill, radius and depth. There is no overlay kind; overlays draw their own.
_Avoid_: Panel, layer, tray

**Slot**:
A named place in a kit component that takes another component, such as a row's `leading` or `trailing`. Each Slot names the components it accepts.
_Avoid_: Render prop, child (for a named place)

**Size class**:
The width class an App lays itself out for: `compact` (below 600, and every phone), `medium` (600 to 1099) or `wide` (1100 and up).
_Avoid_: Breakpoint, wide mode
