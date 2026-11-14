# Core gives every Session Argo instructions

This amends [ADR-0044](0044-argo-is-driven-through-one-operation-registry-and-the-argo-cli.md) (owner). ADR-0044 sends the MCP server's `instructions` as the discovery line, then each Plugin's prose. Only a Plugin can tell every Session's Agent how to work in Argo, so a behaviour that belongs to Argo itself, such as keeping a Plan the person can follow, has nowhere to go.

## Decision

- **Core has Argo instructions: prose it gives every Session's Agent, beside the Plugin instructions.** The MCP server's `instructions` are the discovery line, then each Argo instruction under its name, in the order core lists them, then each Plugin's prose under its name, ordered by Plugin id.
- **Argo instructions ship in `argo mcp`.** They are fixed text in the CLI, as the discovery line is, so they need no Server read and still arrive when the Server will not give Plugin instructions.
- **Each is at most 1,000 characters,** the Plugin instructions limit, and a test holds it.
- **They reach the same Sessions Plugin instructions do:** every Session with Agent access, unfiltered by Project, fixed for the life of the MCP connection.
- **The first is the Plan.** It asks the Agent to keep a Plan for work of three or more steps with its own checklist tool, so the Feed and the Sessions list show progress. It names no tool: Claude Code reports `TodoWrite` as a Plan once its install seed turns it on, and Codex reports `update_plan`.

Owner amendment, 2026-11-14: Codex keeps MCP server instructions from its model, so a Codex Session never saw them and kept no Plan. Codex's install seed (ADR-0004) now carries the Argo instructions as `developer_instructions` in its `CODEX_CONFIG`, beside `update_plan`. Only the Codex seed does this: it is a seed, not a per-Session ACP field, so the person still edits or clears it in Settings, and it is fixed at install, as the rest of the seed is. A Codex installed earlier keeps its saved environment until the person sets it or installs Codex again. Drop it when Codex gives its model MCP server instructions.

Owner amendment, 2026-11-14 (#2075): the second Argo instruction is **Agents**. Most Agents' spawn tools cannot carry a role (Codex's `spawn_agent` is told to omit its `agent_type`), so every spawned Agent drew the General mark. The instruction asks the Agent to run `session.declareSubagentRole` with an Agent role before each spawn. The live Session queues the roles; each Agent its Agent spawns takes the next one, stored on its spawn row, where it outranks any role the Agent reports. Argo does not guess a role from an Agent's title: the owner rejected that, since an Agent may be called anything. An Agent that skips the call draws the role it reports, or General. The queue lives only in the open Session, so a role declared and never spent is dropped when the Session closes.

## Considered options

- **A built-in Plugin that holds only instructions.** Rejected: a person could disable it, and it would make a core behaviour look optional.
- **Serve Argo instructions from the Server through the instructions read.** Rejected for now: the CLI and Server ship together, and the CLI already owns the discovery line.
- **Per-Agent ACP system-prompt fields.** Rejected again, as in ADR-0044: they differ from Agent to Agent.
- **Write them to the Project's `AGENTS.md`.** Rejected: ADR-0044 never touches the user's repositories.
