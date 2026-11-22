# Argo

Argo is a cockpit for coding agents. It runs Sessions with any Agent from the ACP Registry and shows them on desktop, web, and phone.

## Places and processes

**Project**:
A registered git repository that Argo works in. One git common directory is one Project.
_Avoid_: Repo, workspace

**Projects folder**:
The folder on the Server Device where Argo puts a Project it clones or starts, `~/Argo` unless `ARGO_PROJECTS_DIR` names another. A Project added from a folder stays where it is.
_Avoid_: Workspace folder

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
The short-lived, single-use code in a Server's QR that lets one Device start Pairing. The same code is six digits (two groups of three, `482-915`) for a Device with no camera to type. It is not the credential: the Device sends its own Device Key during Pairing and authenticates with that afterwards, and the ticket is spent.
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
A named thing Argo can do, such as listing Projects or starting a Session, defined once with typed arguments, a tier and a permission policy. Agents, the command line and Apps all call the same Operation.
_Avoid_: Command (a Slash command or a shell command), tool, action, capability

**Caller**:
Who an Operation runs for, with the scope it may act within: an Agent in its Session, the command line, or the person at an App. A person's tap on a Plugin page calls as that person, scoped to the page's Project and Session.
_Avoid_: Actor, principal, user (for an Agent)

**Operation tier**:
An Operation's read or write classification. Its permission policy determines whether a caller can run it, must ask, or must use an authenticated App action.
_Avoid_: Permission level, risk level

**Prompt chain**:
How many Prompts stand behind the one a Session is serving: the user's Prompt is 0, and a Prompt an Agent sends from its Turn is one more than the Prompt that started that Turn. Sessions in one Project prompt each other without asking, and past ten the call is `confirm`, so no cascade runs on forever with no user in it.
_Avoid_: Prompt depth, delegation depth (the cap on which Sessions exist), Hook chain

**Screen link**:
A typed link to a Screen on one Server, such as `argo://open/<Server id>/session/<Session id>`, or `/open/...` on the web's own origin. It names a destination by stable ids, never by an address of the App's routes, and only navigates: it never prompts, pairs, grants access or runs an Operation. The `app.open` Operation sends a destination to the one desktop App on the Server Device and answers `delivered` or `not_opened`; `delivered` never claims the Screen opened.
_Avoid_: Deep link (for the typed form), URL scheme, route

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

**Argo instructions**:
Prose core gives every Session's Agent, once per Session, through Argo's MCP server, before any Plugin instructions. It tells the Agent how to work in Argo, such as keeping a Todo list.
_Avoid_: Core prompt, system prompt

**Plugin instructions**:
Prose a Plugin gives every Session's Agent, once per Session, through Argo's MCP server. A Plugin declares it in `contributes.instructions`, a Markdown file beside `plugin.json`, and it tells the Agent when the Plugin's Operations apply.
_Avoid_: Plugin prompt, system prompt

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
The kit components a Plugin's Render answers for one page or Slot, as a value the App fetches, keeps and draws. Everything drawn inside it is the Plugin's, so its Actions cannot claim Argo's reserved shortcuts. The App keeps a page's last one in memory and draws it while the page is fetched again. See ADR-0050.
_Avoid_: Wire tree, Plugin UI

**Last good items**:
The items a Plugin last answered for each context of an items Slot, kept by the Engine across change signals and restarts. While the Plugin's answer is late, fails or it is not running yet, a list draws these instead, so a Session row keeps its pull requests; a late answer that lands after all replaces them. They are dropped when the Plugin is turned off or removed.
_Avoid_: Cached items, stale items

**Replaceable Slot**:
A Slot placed around a core component, a Tool call or a message in the Feed. A Plugin reaches one only through its `ui.render` Hook and may pass it through, change its props or draw its own; core draws its own when the Plugin's tree is refused.
_Avoid_: Override, component override

**Plugin wire version**:
The one version of the Plugin wire that an App reports when it connects. The Server sends Plugin trees only to an App at or above the minimum; an older App sees "Update Argo" in place of Plugin pages and Slots, and core's own component in Replaceable Slots. See ADR-0034.
_Avoid_: Kit component version, kit version, protocol version

**Page path**:
The path a Plugin defines one of its pages at, with `argo.pages.define`, and the same path its `navigate` Action opens. It never holds the App's route: the App finds the nav item the page sits under and builds the route itself.
_Avoid_: App path, route (for what a Plugin writes)

**Page address**:
What names one drawing of a Plugin page: the Plugin, the Page path, the Page state and the Project or Session it opened for. The App keeps one Plugin tree per Page address, so two addresses never share a tree.
_Avoid_: Query key, cache key, URL

**Stale mark**:
The Server telling every connected App that a Plugin's pages may have changed: all of them when a new worker of the Plugin runs, or the Page addresses that read a Query whose answer changed, which a write finds by reading the held Queries again. A write that changes no answer sends none, except to pages whose draws read nothing core can compare. An App asks again for the marked pages it shows, and asks for the rest when they are next opened.
_Avoid_: Invalidation, refresh event, push update

**Loader**:
The read half of a Plugin page or Slot: it runs on the Server, takes the page's path, Page state and context, and answers the data the page draws from. It never writes.
_Avoid_: Fetcher, data hook, `useData`

**Live page**:
A Plugin page whose Loader answers over time, such as a log tail. The App follows it while it is on screen and draws each new answer as it comes; leaving the page ends the Loader. Stale marks and a page's clock do not draw it again.
_Avoid_: Streaming view, push page

**Render**:
The draw half of a Plugin page or Slot: a pure function from the Loader's answer to a Plugin tree, with no hooks and no state.
_Avoid_: View (a view per Connection no longer exists), component, template

**Page state**:
What one open Plugin page must remember to draw differently, such as a tab, a range or a page size. The page declares it with defaults, the App keeps it, and it is part of the page's address.
_Avoid_: Local state, `useState`, params (for what the App keeps)

**Draft**:
A Plugin page drawn from canned data so its author can review the design in the App before the page reads real data. It shows every state the page can be in and may carry Variants. A Draft never ships.
_Avoid_: Preview, mockup, prototype, gallery

**Variant**:
One of several structurally different designs for a region of a Draft, which the author switches between in the App and picks from. Picks may mix regions from different Variants.
_Avoid_: Option, alternative, theme

**Component event**:
A named handler prop on a kit component, such as `onPress`. In a Plugin tree it holds a value, never a function: a navigation, a Page state change, or an Operation with its arguments.
_Avoid_: Interaction, action (Action is a kit component), handler

**Board**:
A kit component of columns of cards that a person moves between columns, by drag or from a card's menu. Each card names the columns it may move to, and a move fills an Operation call with the card and its new column. The kit draws a Board's columns as a List's lanes, so "lane" is the kit's word inside and "column" the Plugin's.
_Avoid_: Kanban, lanes (for the Plugin's columns)

**SessionRow**:
A kit component that draws one of the App's own Sessions as its row in the Sessions list, from the live Session. A Plugin sends only the Session's id, and needs `sessions:read`; it opens the Session when pressed. A Session the App does not list draws nothing. Not the Session row Slot, which adds items to the list's own rows.
_Avoid_: Session card, attached Session row

**Capability**:
Something a Plugin's manifest says it needs, such as running `gh` or reaching `api.github.com`. Without any, a Plugin's calls to the machine can only read Projects and use the Plugin's own data.
_Avoid_: Permission (that is the Agent's Permission request), scope, entitlement

**Grant**:
The answer, from the user or from Argo for a first-party Plugin, about a Capability or about one Plugin's use of one Account: allowed or refused. Unset means nobody has been asked, and the first use asks. The user can remove a single Grant.
_Avoid_: Approval, permission

**Query**:
A read a Plugin describes as a value instead of making, which Argo performs, keys by its normalised form and refreshes on a clock Argo owns. It is the one place Argo keeps a Plugin's reads; a write makes them due.
_Avoid_: Descriptor, query key, request object

**Named read**:
A Query that is the Plugin's own read, defined once by name and asked for with args, for a read that combines several calls. Argo keeps its answer and runs it again when it is due, so it may only read.
_Avoid_: Cached function, custom query, memo

**Call origin**:
What a Plugin's `argo` call runs for: the draw, the Operation run or the Project whose code made it, as the event that started that code said. Argo decides from it which Project and Account the call reaches and whether it reaches the Server Device. A named read runs for its Project alone.
_Avoid_: Call context, call scope, caller

**Query holder**:
What keeps a Query's answer wanted: a Page address whose last draw read it. A Background pass holds nothing and reads fresh. A changed answer marks the Page addresses holding it stale.
_Avoid_: Subscriber, owner, registration

**Session follow-up**:
A stored instruction for the Server to send a Prompt once or at an interval in an existing Session. Each occurrence goes through that Session’s Prompt queue and uses its Checkout. The person manages it from Follow-ups in the Workbench.

**Background pass**:
One run of a Plugin's declared background entry on its interval, for one Project: its Loader runs and its answer is discarded. It may set its own nav badge; it draws nothing and never raises a Notification.
_Avoid_: Job, cron, tick

**Watch**:
One run of a Plugin's declared watch entry on its interval, for one Project, whether or not an App is open. Unlike a Background pass it may act: it reads, and it may prompt or archive the Project's Sessions within the Capabilities its manifest declares.
_Avoid_: Watcher, poller, Background pass (for one that acts)

**Nav badge**:
The count a Plugin puts on one of its own nav items with `argo.nav.badge(id, count)`; zero clears it. It belongs to the whole Plugin, not to a Project, so the Plugin sets the total it wants shown.
_Avoid_: Nav count, badge count, unread count

**Borrow**:
One Plugin using an Account another Plugin provides. Argo checks the Grant, asks the providing Plugin for a fresh token and sets the header; the borrowing Plugin never sees the token, and the header never leaves the Account's host.
_Avoid_: Share, delegate, proxy

**Plugin icon**:
The icon `plugin.json` names for a Plugin, drawn in its rail tile, drawer row and Settings row. It is SF and Material symbol names, which every Plugin gives, and optionally `icon.svg`, an SVG file of the Plugin's own that the Server makes one colour and the rail and drawer draw in Argo's tint (ADR-0058). A brand logo in colour belongs to the Plugin's sign-in, not here.
_Avoid_: Plugin logo, app icon

**Account**:
A sign-in one Plugin provides and other Plugins borrow, named by the API host its token opens, such as `api.linear.app`, rather than by the button that gets it. CircleCI and GitHub are separate Accounts though both sign in with GitHub. A Plugin asks Argo for an Account, and the user approves each Plugin once per Account. See ADR-0036.
_Avoid_: Login, credential, identity, Tracker, Integration

**Secret**:
A private value, such as a token or an OAuth client secret, that Argo keeps for a Plugin or for the person. See ADR-0051.
_Avoid_: Credential, password, Keychain item

**OAuth flow**:
The kit's ready-made sign-in for a service that signs in with OAuth: the Plugin names the service's authorize and token URLs, its client ID and the Account's host, and the flow opens the browser, waits for the person, keeps the token and adds the Account. It holds where the sign-in stands, such as waiting or failed, for the Plugin's sign-in page to draw, and a sign-in started can be cancelled. It runs on the Server Device only.
_Avoid_: OAuth helper, login flow, auth handler

**Token paste**:
The kit's ready-made sign-in for a service that takes a personal API token: the Plugin names the Account's host, the header the token goes in and a check that names whose token it is, and the kit draws the field, checks a pasted token, keeps it and adds the Account. A refused token is shown beside the field. It runs on any Device.
_Avoid_: API key login, token form, manual token

## Agents and Sessions

**Agent**:
A coding agent program that Argo drives, such as Claude or Codex. The Agents page lists the Installed ones with the Registry below them. The word has a second sense, below.
_Avoid_: Harness, provider, vendor, model

**Session**:
One line of work with one Agent: its Prompts, Turns and Feed, with an Argo id and the Agent's own session id.
_Avoid_: Chat, thread, Conversation (that is the spoken feature)

**Empty Session**:
A Session that New Session opened in the Project's main checkout and no prompt has reached yet. It is not listed, and leaving New Session discards it.
_Avoid_: Draft Session, pending Session

**Agent**:
A Session that another Session's Agent started over ACP to do delegated work. Only that parent drives it: it takes no prompt from the person, and it is shown in its parent's Workbench and Inspector, never as a row in the Sessions list. This is the second sense of the word and not the one above: that Agent is a program Argo runs, this one is a Session. The owner dropped Subagent on 2026-10-21 and coined no second name, so which sense is meant is read from the sentence, and a doc that would be ambiguous says so; the code still says `Subagent` and `parentSessionId`. The owner split off Started Session on 2026-11-10.
_Avoid_: Subagent, child agent, task agent

**Agent role**:
What an Agent (the second sense) is for: Explore, Plan, Implement, Review, Test or General. Its parent's Agent declares it through `session.declareSubagentRole` before the spawn, since most Agents' spawn tools cannot carry one; a role the Agent itself reports counts only when none was declared, and an Agent with neither is General. Argo draws each role with its own mark, in its own colour, in the Feed and the Agents list.
_Avoid_: Agent type, subagent type

**Usage limit**:
One limit on the plan an Agent is signed in with, such as Claude's 5-hour or weekly window, read from what the Agent reports. Each says how much is used, when it resets and whether it is exhausted; a number the Agent did not report is unknown, never zero. The Server keeps the latest Usage limits for each Agent and Project, the same pair its sign-in is kept for. The shape follows Copilot's quota observations.
_Avoid_: Quota, rate limit, plan limit, subscription usage

**Started Session**:
A Session that another Session started through an Operation, such as `session.create`. It is a full Session: the person, its starter or any other Session can prompt it. It is listed nested under its starter in the Sessions list, and it is not one of the starter's Agents, so it is never in the Workbench or Inspector. The code calls the link `startedBySessionId`. It runs in a new worktree, in the main checkout, or, when its starter passes the `starter` Checkout, in its starter's own Checkout, which it borrows and never owns (ADR-0008).
_Avoid_: Agent, Subagent, child Session, delegated Session

**Background Task**:
A command an Agent started in the background, which keeps running while the Turn goes on. The owner renamed Shell to Background Task on 2026-11-02; the code still says `Shell`. It is never a Run or a Terminal.
_Avoid_: Shell, terminal (that is a Terminal), process

**Goal**:
An objective that the Agent keeps working toward across Turns, starting the next Turn itself until the Goal is met.
_Avoid_: Target, loop

**Project Schedule**:
A Project’s stored instructions and cadence for starting fresh Sessions on its Server. Each occurrence can start a Session with its own Checkout. The person finds Project Schedules in Scheduled.

**Checkout**:
The git working tree that a Session runs in: its own worktree, or the Project's main checkout.
_Avoid_: Workspace, worktree (when the main checkout is also possible)

**Run Configuration**:
A named way to run a Project's own app, such as its dev server, that the Project checks in for every Checkout to use. A group of Run Configurations starts and stops together.
_Avoid_: Launch config, launch.json, task, script, profile

**Run**:
One live instance of a Run Configuration in one Checkout, shown as a Terminal. Every Session on that Checkout sees the same Run.
_Avoid_: Dev server, process, job, Background Task

**Terminal**:
An interactive terminal that runs in a Checkout on the Server Device: a Run's own, or a shell a person opened. Each one is an Inspector tab.
_Avoid_: Shell (that was the old name for a Background Task), console, PTY

**Change**:
One line of work in a Session, named by its branch, at one of five stages: Working, Branch, Open, Merged or Closed. A Session can have several at once.
_Avoid_: PR, pull request, diff, branch (for the work)

**Reviewer**:
A repository definition of what to examine in a Change and whether to return Findings or a Score.
_Avoid_: Review Agent (for the definition), review prompt

**Reviewer run**:
One execution of a Reviewer for one Review, represented by a Started Session.
_Avoid_: Review (for one run), Subagent

**Review**:
The Reviewer runs and their results for one Change at one head commit. A later Review keeps the earlier one as history.
_Avoid_: GitHub review (for Argo’s Review), report

**Finding**:
A located problem from a Reviewer run, with a severity and an open, resolved or dismissed state. An open high Finding blocks readiness.
_Avoid_: Comment (for an Argo Finding), issue

**Score**:
A Reviewer run’s bounded assessment of a Change, with a reason and a direction that says whether higher or lower is better.
_Avoid_: Rating, grade

**Check**:
A code host’s reported result for a commit. An unknown Check is not a passed Check.
_Avoid_: Test (for every Check), CI status

**Argo Approval**:
A person’s consent to merge one Change at one head commit. It is separate from a GitHub review and clears when the head changes.
_Avoid_: Approval (without Argo when ambiguous), Agent approval

**Stage**:
How far a Change has come: Working, Branch, Open, Merged or Closed. A draft or a conflict describes an Open Change; it is not a Stage of its own.
_Avoid_: Status, state

**PR association**:
A Plugin's own record that a Session produced one pull request, named by its repository and number. It survives a branch switch and a Server restart until detached, and it makes the pull request a Change in that Session.
_Avoid_: PR link, attachment

**Auto-fix**:
A person's choice, per PR association, that the Session's Agent is prompted to fix each new failed Check run, review comment or merge conflict on that pull request; a re-run that fails again is new. One Prompt lists everything new on a head commit at the time it is read; a failed Check is prompted as soon as it fails, without waiting for the other Checks, so Checks that fail at different times come in separate Prompts. When CI is still red on a head it already prompted about and the Session has been idle for 30 minutes, it prompts again to go on and push. A push, a close, or turning it off withdraws a Prompt that has not started. It is off until turned on.
_Avoid_: Babysit, watch, auto-repair

**Auto-merge**:
The code host's own promise to merge an Open pull request once its required Checks and reviews pass. Argo turns it on or off and reads it back; it keeps no choice of its own.
_Avoid_: Merge when ready (for the concept), auto-land

**Auto-archive**:
A person's choice, per PR association, that the Session is archived once that pull request is Merged or Closed and the Session has no other Open Change and no uncommitted files. It is off until turned on.
_Avoid_: Auto-close, cleanup

**Pull request record**:
What a Plugin last read of one pull request, kept in its own storage: the pull request, its Checks, and while it is Open its auto-merge and review comments, and why the latest read failed. The Session row, the Changes and the Operations all read it, and only the Plugin's sync writes it.
_Avoid_: PR cache, PR status, snapshot

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
A command or skill the Agent offers, named in a prompt as `/name` with optional arguments. Argo has two of its own, `/clear` and `/reload`, which act on the Session's Agent session and never reach the Agent; the Agent's own wins a name both have.
_Avoid_: Command (alone), shortcut, action

**Composer suggestion**:
An item offered in the Composer's `/` menu, from an Agent or a Plugin. An Agent's Composer suggestion represents a Slash command, which it states with `command`; a Plugin result is never one, whatever it inserts.
_Avoid_: Slash command (for a Plugin result), autocomplete item

**Follow-up suggestion**:
A proposed next Prompt based on the Session's context, offered in the Composer when what the user would naturally say next is clear. It becomes a draft only when the user accepts it.
_Avoid_: Composer suggestion (for this), autocomplete, next step

**Suggestion model**:
The model an Installed Agent predicts Follow-up suggestions with: the Session's own, or one from the Agent's model list. Each Agent starts on its vendor default.
_Avoid_: Prediction model, fast model

**Issue reference**:
An Issue named in a prompt as `#` and its number.
_Avoid_: Mention, issue link, tag

**Prompt**:
What is sent to a Session's Agent to start a Turn. It comes from the user, from another Session or from a Plugin, and the Feed shows which; only the user's is the user's own message.
_Avoid_: Message (alone), input, instruction

**Queued Prompt**:
A Prompt waiting in a Session’s ordered queue for a Turn of its own: the person’s, a Plugin’s, the Conversation’s or another Session’s. It is future work, outside the Feed until it starts. A Plugin may withdraw one it sent, never anyone else’s. A Conversation keeps at most one waiting: its next request joins that one until it starts or the person edits it (ADR-0064).
_Avoid_: Pending message, draft Prompt

**Sent Prompt**:
A Prompt from a sender other than the person: another Session, a Plugin or a Conversation. An idle Session starts a Turn with it; a busy or paused one takes it at the end of its queue with its sender, and never resumes a paused queue. When the Agent supports steering, the running Turn takes it in at once, unless a Plugin sent it. The person's own Prompt is typed, not sent, and keeps its own busy behaviour.
_Avoid_: Plugin Prompt, non-user Prompt, steered Prompt

**Turn**:
A stretch of Agent work started by a Prompt or by the Agent, ending with a stop reason when the Agent finishes or the Session ends it.
_Avoid_: Run, request, exchange

**Conversation**:
A live spoken exchange between the person and a voice model, attached to one Session. What the person asks for reaches that Session's Agent as Prompts.
_Avoid_: Voice call, call, voice mode, live, chat

**Voice**:
One of a Conversation provider's voices, or a custom voice built on one, that a Conversation speaks with.
_Avoid_: Persona, speaker

**Read-out**:
The voice saying an Agent's result aloud in a Conversation, from the hand-over until the person speaks again. The Agent's message is the record, so a Read-out is never a Feed row.
_Avoid_: Readback, voice summary

**Spoken answer**:
The person's allow-once or reject to a Permission request, said in a Conversation. Argo reads it from the person's own words, heard after the voice announced the request, and applies it as a click would. Always-allow is never a Spoken answer.
_Avoid_: Voice consent, reply form, voice approval

**Conversation provider**:
A service or local model that runs a Conversation.
_Avoid_: Voice provider, realtime provider, voice backend

**Preview clip**:
A voice's one-line greeting as the App recorded it from the voice's first preview, kept on the Server and replayed by the App with no Conversation provider call. It is kept by the provider, the voice, its description and the name it greets with. It is the only audio the App hands to the Server.
_Avoid_: Sample, voice recording, cached preview

**Screen sight**:
Letting an Agent or the voice of a Voice call see the person's whole screen as one still picture, taken by the desktop App when asked. Nothing asks the person before a capture. Off until the person turns it on for the Device, shown to the person as one Notice, and never stored. The person reads it as "Screen sharing", the label of its switch on the Agent access page; "Screen sight" is the term in code and docs.
_Avoid_: Screen share, screen capture, screenshot (for the feature; `app.screenshot` is the Operation); "Screen sight" in any text the person reads

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

**Launch environment**:
The environment variables an Installed Agent starts with, saved with it on the Server and edited on the Agent's page in Settings. Installing an Agent seeds it; a change applies from the Agent's next Session.
_Avoid_: Agent settings, env config

**MCP server**:
A program or service that gives an Agent tools over the Model Context Protocol. The Argo MCP server gives Agents access to Argo Operations.
_Avoid_: Connector, integration, tool server, context server

**MCP sign-in**:
A named identity the person uses with one MCP server, such as Personal or Work in Sentry. It is shared by the Projects that select it.

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

**Reading place**:
Where a reader left a Session's Feed: the row they were reading and where it sat in the view, or the Feed's end.
_Avoid_: Scroll position, scroll offset

**Session snapshot**:
Everything a Session shows that is not in its Feed, such as its title, state, Live header, Background Tasks, and the Agents it started. It is sent whole on each change.
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

**Todo list**:
The Agent's live checklist for a Session, which shows the person how much of the work is done and how much is left. The Agent sets it whole with `session.setTodos` and then changes one step at a time with `session.setTodoStep`, where completing a step completes those before it; a checklist an Agent reports through ACP's `plan` is one too. The person turns it on or off in Settings. ACP calls it a plan, so its Feed row and wire types keep ACP's names (ADR-0006).
_Avoid_: Plan (for the checklist), task list

**Written plan**:
A plan document the Agent keeps without asking for approval, as Markdown text or only as a URI.
_Avoid_: Plan (for the document), Plan proposal, Todo list

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
A short message about the Session that is not from the Agent, such as a retry or a hook result.
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

**SignIn**:
The kit component a Plugin's sign-in draws, laid out as Settings is: the step beside the service's mark, then FieldGroup rows, a device flow's code among them. The mark is the service's logo when the Plugin ships one, and the Plugin's own icon otherwise. `provideSignIn` and `signInGate` draw it for every step of either OAuth flow.
_Avoid_: OAuth window, sign-in card, login screen

**FieldGroup**:
A page's fixed rows of values and controls, such as Project details or Plugin settings, arranged in sections. Values save as they change, or a page that sends them puts one submit button below the FieldGroup. A Screen's `aside` holds one of the item's properties, such as an Issue's status, labels and assignees, drawn with the same rows; there it sizes to its rows instead of scrolling.
_Avoid_: Grouped list, settings list, Form, Metadata

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

**Diagram**:
A ` ```mermaid ` fence in Markdown, drawn in Argo's colours instead of shown as code, with a switch to its code. Agents check one with `diagram.validate` before sending it (ADR-0058).
_Avoid_: Chart (a Plugin's `Chart` draws data), graph

**Chart**:
A visual that plots named data series. A Chart has a label and a table that presents the plotted data to screen readers.

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
The column a Screen's heading and content keep to: on a wide window the reading width centred in the pane, inside the Screen's side margins; the aside's column beside the content widens it, so the reading width stays the content's. Each part of a Screen offers it to what it holds; a scroll view or grouped cards claim it and keep to it themselves, and the part pads anything else. A popover, a sheet's page or a FieldGroup's rows are outside it.
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
Where every region of a wide window's Frame sits: the rail, the list, the page and its content column, the Workbench and the Inspector, with the dividers between them and how far each drags. It is worked out once from the window's width, the preferred pane widths and what the person asked of the sidebar, the Workbench and the Inspector; the content keeps its floor before the list folds, and the Workbench, drawn over the page, takes no width and shows where the page's gutters hold it by Codex's thresholds, the content column centring in the room beside it on a page too narrow to keep it centred.
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
The surface that shows a Workbench card's section in full, with a tab for its list and item details. Details include a Change's diff, an Agent's Feed or a Background Task's output; each Terminal is a tab of its own. The Workbench stays open beside it.
_Avoid_: Stage, detail pane, viewer

**Section**:
One kind of a Session's work, such as Changes, Agents, Background Tasks or a Plugin's. Each has a Workbench card that summarises it and an Inspector tab that shows it in full. Changes is always offered; Agents and Background Tasks are offered once the Session has some.
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
