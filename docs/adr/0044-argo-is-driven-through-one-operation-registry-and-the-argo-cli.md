# Argo is driven through one Operation registry, and Agents reach it with the `argo` CLI

This amends [ADR-0002](0002-a-local-server-owns-all-machine-work.md) and [ADR-0012](0012-only-human-typed-text-is-a-user-message.md) (owner, 2026-10-28, grilling #1275). The owner wants Agents to drive Argo: list Projects, start a Session, prompt one, read what it did, change Settings. Argo gives Agents no tools today: every Session opens with `mcpServers: []`, and the Server's 63 hand-written tRPC procedures are shaped for Apps. The worry was context: an MCP tool per thing Argo can do costs about 740 to 950 tokens per tool, every Turn, on Agents that don't defer tools (Gemini CLI, OpenCode, Zed), and tool choice gets worse past 30 to 50 tools ([research](../research/agent-tools-for-argo.md)).

PhotoCraft, an open-source Photoshop, has solved this: every menu item runs a command from one registry of 500+, and its UI, its CLI, a JSON control channel and an MCP server all share that registry. Its MCP server exposes `command_list` and `command_run`, not 500 tools. We copy it.

Owner amendment, 2026-10-29: Argo supplies MCP tools automatically when it opens a Session with Agent access. No Skill installation is required. This brings forward the MCP interface described below. PhotoCraft also exposes specialized tools alongside command discovery and execution; Argo starts with two tools to limit context use.

## Decision

- **One Operation registry.** An Operation is defined once, in `packages/contracts/src/operations`:
  - an id of a singular noun and a verb, such as `project.list`, `session.new` or `agent.install`;
  - a label, and a one-line description written for models;
  - Zod params and result;
  - its Operation tier;
  - keywords it is also found by.

  The Server implements it. Every caller uses it: Apps, the CLI, and later MCP, Feed actions and voice mode. Copied from PhotoCraft's command registry.
- **The App runs through Operations too.** The registry generates the tRPC procedure for each Operation, named by its id, so the App, Agents and the CLI hit one code path, and whatever a user can do, an Agent can. Two kinds of procedure stay hand-written:
  - consent, sign-in and presence, which are the user's alone: answering a Permission request or an Elicitation, marking a Session seen, choosing and granting Accounts, signing out, signing in to an Agent, acknowledging Notifications, and — added by [ADR-0045](0045-pairing-gives-every-device-its-own-key.md) (owner, 2026-10-30) — pairing and unpairing a Device, with the Local network access and keep-running-after-quit settings. Pairing is the clearest case this exception has: the whole protocol exists so that a Device is trusted only when the person at the Server Device allows it, so an Agent that could mint a Pairing Ticket or allow a registration would make that confirmation theatre, and one that could unpair could cut the owner off from their own Server. An Agent also runs inside a Session on a Server some Device was already trusted to reach, so letting it pair would let any paired Device pair another, which ADR-0022 forbids for the lost-phone reason. These have no tier, because there is no tier that would make them askable;
  - App plumbing: subscriptions, the Plugin wire, opening a Session for viewing, Blob upload and link previews.

  A CI check refuses a new hand-written tRPC mutation outside that list, so a new feature becomes an Operation first. Today's procedures move over in two steps: the first spec's Operations, then the rest.
- **Two Server procedures, copied from PhotoCraft's control channel.**
  - `operations.list` (its `engine.commands`) returns rows of id, label, description, params and result as JSON Schema generated from Zod, tier, keywords, and `enabled` with `disabledReason` for the caller's scope. A filter matches id, label and keywords.
  - `operations.run` (its `engine.execute`) runs one Operation. It returns at once with what it started, such as a Turn's id; `wait` blocks until that settles, for at most 90 seconds, then answers "still running" with the id. Sessions and Turns are the long-running work, so there is no jobs system.
  - Both go over the Server's existing HTTP; we don't copy PhotoCraft's JSON lines over TCP.
- **Agents use the CLI.** `apps/cli` owns the `argo` binary:
  - `argo operations [filter] [--json]`;
  - `argo run <id> [--params '<json>'] [--wait]`;
  - `argo wait <id>`;
  - `argo server`, which starts the Supervisor; the desktop app spawns it;
  - `argo plugin validate|test`, as before.

  A bare `argo` prints help. The CLI finds the Server through `~/.argo/server.json`, and `apps/server` no longer owns a bin. An Agent's `argo` call shows in the Feed as an ordinary Tool call. Copied from `photocraft-cli`.
- **MCP uses the same registry and control client as the CLI.** `argo mcp` serves two tools over stdio: `operation_list` and `operation_run`. Discovery returns matching Operation descriptions, argument schemas, tiers and availability. Execution accepts an Operation id with params and optional wait, or a wait id alone to observe existing work. The tool definitions do not grow with the registry. Matching schemas and results enter context when requested. This does not eliminate all context use.
  MCP calls use a thirty-second observation budget, below Codex's default sixty-second tool deadline. The control API accepts shorter budgets up to ninety seconds. CLI calls retain the ninety-second default. A wait deadline returns the same native work id and does not cancel the Operation. See [Codex MCP settings](https://developers.openai.com/codex/mcp/).
- **Every Session gets `argo` by default.** The Server puts `argo` on each Agent's `PATH` and gives each Session its own token in `ARGO_TOKEN`, revoked when the Session closes. One Settings switch turns this off.
- **Sessions receive Argo tools automatically.** The Server supplies its stdio MCP launcher through ACP on Session creation and resume. Each MCP connection receives that Session's `ARGO_TOKEN` and Server location explicitly. Configuration discovery and sign-in receive no Argo MCP connection. The existing Agent access switch controls the CLI, token and MCP tools for new Sessions. Existing Sessions retain their access. Agents must honor ACP's client-supplied MCP servers to discover these tools.
  Its MCP server name includes the Session id so native Agent settings named `argo` cannot shadow its scoped connection.
- **Outside Agents can use optional CLI instructions.** PhotoCraft has the user register MCP by hand (`claude mcp add photocraft …`). Argo registers it for its own Sessions. The Settings button, "Add Argo to your Agents", optionally writes instructions for Agents run outside Argo:
  - a small Skill, `argo/SKILL.md`, to `~/.agents/skills` and `~/.claude/skills`, which Claude, Codex, Gemini CLI, OpenCode and Pi read;
  - a Codex prefix rule, `prefix_rule(pattern=["argo"], decision="allow")`, to `~/.codex/rules/argo.rules`. Codex's default sandbox blocks the shell from reaching localhost, so this rule lets only `argo` run outside it. Without it, Codex asks to rerun each blocked call.

  Nothing is written until the user presses it, and the user's repositories are never touched.
- **A call acts as the user, scoped by its caller.**
  - A call with a Session token is scoped to that Session's Project, and the Server knows which Session made it.
  - A call with the user token, read from `~/.argo/control.token` (mode `0600`, made on first start, as PhotoCraft's token file), has the user's full scope. That includes an outside Agent using the CLI from a terminal.
  - `operations.*` refuses a call with no token. This is the Server's first authentication; the rest of tRPC stays open, as ADR-0002 says, until Pairing. ADR-0045 spends that "until": the rest of tRPC is now authenticated too, by the calling Device's key. The control token is unchanged and sits beside it, not under it — a token says which Agent is calling and in whose scope, a Device Key says which Device is connected at all.
- **Operation tiers bind Agents only.** Calls made with a Session token are checked against the Operation's tier:
  - `read` never asks;
  - `act` never asks inside the caller's scope: this Project, and Sessions this Session started;
  - `confirm` always asks, whatever mode the Agent is in. Settings, other Projects, archiving, and prompting a Session the caller didn't start are `confirm`.

  A `confirm` raises Argo's own Permission request in the calling Session, on the same Composer card as the Agent's, saying what will happen. The call waits for the answer. Deny returns "The user refused" as an error. A Turn ending settles the request as cancelled (ADR-0024). The Server enforces tiers, never the Agent. Calls from the App or with the user token never ask, since the person pressing the button or typing `argo run` is the confirmation.
- **A Session that another Session starts is that Session's Agent.** `session.new` called with a Session token makes the new Session one of the caller's Agents (the glossary's second sense). The Sessions list draws it as a nested List item under the Session that started it, as Claude Code does, so it is clear what started what. The caller may prompt and cancel its Agents at the `act` tier, at most 2 levels deep and 5 running at once; past either cap the call is `confirm`.
- **A Prompt has a sender.** This amends ADR-0012. A Prompt comes from the user, from another Session through `session.prompt`, or from a Plugin. The Feed stores the sender and draws "From ‹title›" for a Session's or a Plugin's Prompt. Only the user's is the user's own message. The receiving Agent gets each as an ordinary prompt.
- **Plugins add Operations later.** A Plugin declares them in `contributes.operations`, named `<plugin-id>.<name>`, each with a tier, and each is limited by the Plugin's Capabilities (ADR-0030). Not in the first spec; the registry's search is what lets it grow to hundreds without costing context.

## Considered options

- **Expose the tRPC router to Agents as it is.** Rejected: it is shaped for Apps, with subscriptions, per-Connection state and names such as `addRegistry` that mean nothing to a model.
- **MCP first, with one tool per Operation.** Rejected by the owner: on Agents that load every tool, 150 Operations would cost 50,000 to 140,000 tokens a Turn. Claude Code and Codex defer MCP tools; Gemini CLI, OpenCode and Zed don't.
- **MCP with `search`, `read` and `act` tools,** as Stripe ships. Rejected for now: CLI first, and when MCP comes PhotoCraft's single run tool is simpler, with tiers enforced by the Server.
- **MCP-over-ACP.** Rejected for now: a draft RFD that no Agent implements; Codex ACP refuses it.
- **Code mode,** where the Agent writes code against a typed client, as Cloudflare does. Rejected for now: only Codex and Pi have it built in, and Argo would need its own sandbox.
- **Write the Skill automatically, or a line in the Project's `AGENTS.md`.** Rejected: one writes into the user's dotfiles unasked, the other dirties every repository.
- **Open Codex's sandbox to loopback with its network proxy.** Rejected: it opens every local port, databases included, not just Argo's.
- **Let tiers apply to every caller.** Rejected: the App already confirms where it should, and asking twice is noise.
- **Consent as Operations flagged "user only".** Rejected: keeping them out of the registry means none can leak to an Agent by mistake.
