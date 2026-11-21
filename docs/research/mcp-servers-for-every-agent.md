# One MCP server list for every Agent

Research date 2026-11-21. Question: does every Agent read one `mcp.json`, or must Argo keep the person's MCP servers itself and give them to each Agent? The source checks cover the installed Claude ACP 0.109.0, Codex ACP 2.8.0 (Codex 0.170.0), Gemini CLI 0.70.0, pi ACP 0.0.35 (pi 1.6.0), Antigravity ACP 1.5.2 and the ACP SDK 1.7.0. The five Agents, the ACP spec and Argo's own code were each read from source or docs and then checked by a second reader told to refute them. The two tables on other ACP clients and on config files come from each project's documentation and were not checked a second time, apart from Zed's page. Nothing was run. The last section lists what stayed unverified.

## Answer

Among the five Agents read here, no shared file exists. Each reads its own MCP config, in its own format, and only Claude reads a project `.mcp.json`. The other Registry Agents were not read; GitHub Copilot's documentation describes a workspace-root `.mcp.json` as well. The Model Context Protocol has no standard config file: the proposal to define one has been open since 2025-04-08. [MCP issue 292](https://github.com/modelcontextprotocol/modelcontextprotocol/issues/292)

The one thing every ACP Agent shares is the `mcpServers` array the client sends when a Session opens. Argo already uses it for the Argo MCP server. So Argo can keep one list and send it to every Agent, with three limits: pi ignores the array, each Agent still loads its own list as well, and one sign-in for OAuth servers needs more than passing the list through.

## What each Agent does

| Agent | Its own MCP config | Reads a project `.mcp.json` | Uses the servers Argo sends | Transports it takes from Argo | Same name in both lists |
| --- | --- | --- | --- | --- | --- |
| Claude | `~/.claude.json`, project `.mcp.json`, managed policy, claude.ai connectors | Yes | Yes | stdio, http, sse | Not tested |
| Codex | `~/.codex/config.toml`, and `.codex/config.toml` in a trusted project | No | Yes | stdio, http | Codex's own entry wins; Argo's is dropped |
| Gemini | `mcpServers` in `settings.json` | No | Yes | stdio, http, sse | Argo's entry wins |
| pi | `~/.pi/agent/mcp.json`, `.pi/mcp.json` | No | No | None | pi's own entry wins over one a pi extension registers |
| Antigravity | `~/.gemini/config/mcp_config.json` | No | Yes | stdio, http; sse is run as http | Argo's entry wins |

### Claude

- The adapter starts Claude Code with `settingSources: ["user", "project", "local"]`, so the person's and the project's own servers load beside the ones Argo sends. [acp-agent.ts](https://github.com/agentclientprotocol/claude-agent-acp/blob/v0.109.0/src/v1/acp-agent.ts#L10205)
- `~/.claude.json`, managed policy and claude.ai connectors load whatever `settingSources` says. [What settingSources does not control](https://code.claude.com/docs/en/agent-sdk/claude-code-features.md)
- A project `.mcp.json` loads with no approval prompt, because an Agent SDK session cannot show one. `disabledMcpjsonServers` still blocks a server. This rests on the docs and was not run. [Claude Code MCP](https://code.claude.com/docs/en/mcp.md)
- It advertises `mcpCapabilities: { http: true, sse: true, acp: true }`. [acp-agent.ts](https://github.com/agentclientprotocol/claude-agent-acp/blob/v0.109.0/src/v1/acp-agent.ts#L1866-L1871)
- A stdio entry must carry no `type` field. Argo opens connections at ACP protocol version 1 (`packages/engine/src/agents/acp/connection/initialize.ts`). At version 1 the adapter keeps http, sse and acp entries and an entry with no `type`, and drops anything else without an error, an explicit `type: "stdio"` included. A second entry with the same name replaces the first. At protocol version 2 the adapter rejects duplicate names and unknown types with `invalid_params` instead, so moving Argo to version 2 changes this. [mcp-servers.ts](https://github.com/agentclientprotocol/claude-agent-acp/blob/v0.109.0/src/mcp-servers.ts)
- `strictMcpConfig` makes Claude use only the servers passed in and ignore `.mcp.json`, user settings, plugin servers and claude.ai connectors. The adapter never sets it, but it spreads `_meta.claudeCode.options` into the SDK options, the channel Argo already uses for `persistSession`. [Agent SDK options](https://code.claude.com/docs/en/agent-sdk/typescript.md)
- OAuth for a server Argo sends runs as an ACP URL elicitation, and only when the client advertises URL elicitation. A server from Claude's own config that needs a sign-in is left to `/mcp`. [mcp-oauth.ts](https://github.com/agentclientprotocol/claude-agent-acp/blob/v0.109.0/src/mcp-oauth.ts)

### Codex

- It advertises `mcpCapabilities: { acp: <when Codex supports it>, http: true, sse: false }`. [CodexAcpServer.ts](https://github.com/agentclientprotocol/codex-acp/blob/v2.8.0/src/CodexAcpServer.ts)
- An `sse` entry fails the whole request with "Codex doesn't support MCP SSE transport protocol". Two names that are equal after whitespace becomes underscores fail it with "MCP server names must be unique". [McpServerConfig.ts](https://github.com/agentclientprotocol/codex-acp/blob/v2.8.0/src/McpServerConfig.ts)
- A server Argo sends is dropped when Codex's own config already has that name, even a disabled one. The adapter reports it as a failed tool call titled `mcp__<name>__startup`. `DISABLE_MCP_CONFIG_FILTERING=true` in the Agent's environment turns the rule off. Nothing turns Codex's own list off for one Session. Read from the installed adapter, `@agentclientprotocol/codex-acp/dist/index.js` lines 44784-44807.
- A stdio entry becomes `{command, args, env}` and an http entry becomes `{url, http_headers}`. Codex's own `bearer_token_env_var` and OAuth settings cannot be sent this way. [Codex MCP](https://developers.openai.com/codex/mcp.md)
- OAuth is tried only when a server fails to start with `reauthenticationRequired`, and only when the client advertises URL elicitation.
- Codex documents no `.mcp.json` for a project; it names the file only for its own plugins.

### Gemini

- It advertises `mcpCapabilities: { http: true, sse: true }`. Its session setup starts from the person's `settings.json` servers and writes each server Argo sends over them by name. Read from the installed bundle, `@google/gemini-cli/bundle/gemini-FRSP6LA3.js` lines 18625-18665 and 18743-18746.
- No OAuth handling for a server Argo sends was found; headers pass through as given.
- Its own format has no `type` field: `url` means SSE and `httpUrl` means streamable HTTP. [Gemini CLI MCP servers](https://github.com/google-gemini/gemini-cli/blob/main/docs/tools/mcp-server.md)

### pi

- The adapter stores the array and never connects it, stdio included, and advertises `mcpCapabilities: { http: false, sse: false }`. Its README says so. [pi-acp](https://github.com/svkozak/pi-acp)
- 0.0.35 is the latest release, so no fix is close.
- pi itself has MCP support and reads `~/.pi/agent/mcp.json` and `.pi/mcp.json`. It takes stdio and streamable HTTP and rejects SSE. No flag to pass a config file appears in pi 1.6.0's docs or code; the only documented MCP flag is `--no-mcp`. Read from pi's bundled `docs/mcp.md` and `docs/cli.md`.
- A pi server name holds only letters, digits, `_` and `-`.
- The adapter's README points to the `pi-mcp-adapter` extension as the workaround. It replaces pi's built-in MCP, and it was not tested beside the `argo-pi` extension. [pi-mcp-adapter](https://github.com/nicobailon/pi-mcp-adapter)
- Argo already works around the gap for its own server: the `argo-pi` launcher loads a pi extension that calls `pi.registerMcpServer` (`packages/engine/src/operations/pi-launcher.ts`, [ADR-0053](../adr/0053-core-gives-every-session-argo-instructions.md)). A server registered this way loses to a same-named entry in pi's own `mcp.json`.

### Antigravity

- It is closed source. Everything here was read from strings in the two installed binaries, so it is the weakest row. [ACP Registry](https://cdn.agentclientprotocol.com/registry/v1/latest/registry.json)
- It loads `~/.gemini/config/mcp_config.json`, then applies each server Argo sends by name. `GEMINI_HOME` moves that folder.
- It advertises http and sse. An `sse` entry is run over streamable HTTP, and an `acp` entry is dropped.
- A Gemini Enterprise admin setting can drop every server after the merge.
- Tools load lazily behind one `call_mcp_tool` step unless the Session names the server in `_meta.antigravity.eagerMcpServers`.

## What ACP says

- Every Agent must take stdio. Http and sse are optional, and a client must check `agentCapabilities.mcpCapabilities` before sending one. [Session setup](https://agentclientprotocol.com/protocol/session-setup.md)
- A stdio entry is `{name, command, args, env}` with no `type`. Http and sse entries are `{type, name, url, headers}`. `env` and `headers` are arrays of `{name, value}`.
- The array is sent on `session/new` and again on `session/load` and `session/resume`.
- The spec says nothing about an Agent's own config, name clashes or OAuth. It says only that an Agent should connect to every server the client names.
- Its Security section treats `env` and `headers` as credentials. A client should not send a stdio server taken from workspace files until the person approves its exact command, args and env names, and should keep saved credentials in the OS secret store.
- MCP-over-ACP, a server of `type: "acp"` that the client itself answers, is a draft. The SDK marks it unstable. Claude 0.109.0 and Codex 2.8.0 both implement it, so the reason ADR-0044 gave for rejecting it, that no Agent does, no longer holds. [MCP-over-ACP](https://agentclientprotocol.com/rfds/mcp-over-acp.md)

## What Argo does today

- Argo sends exactly one MCP server: its own, a stdio entry named `argo-<Session id without dashes>` that runs `argo mcp` with the Session's token. `appendServer` in `packages/engine/src/agents/acp/resources/resource-mcp.ts` adds it to whatever list the opening already holds, so that is where a second list would join.
- Only a Session with Agent access gets it. A Session without Agent access shares a connection and gets an empty list, as do the follow-up suggestion and Agent options sessions.
- The Engine never reads `mcpCapabilities`; it only ever sends stdio.
- The Engine advertises `elicitation: { form: {} }` and no URL elicitation (`packages/engine/src/agents/acp/connection/initialize.ts`). Neither Claude nor Codex will start OAuth for a server Argo sends until it does.
- Nothing exists for the person's own MCP servers: no table, contract, Operation, Settings page or Plugin contribution, and Argo reads no `.mcp.json`.
- A Launch environment is plain text in SQLite. Before the 2026-11-21 amendment to ADR-0051, only a Plugin could keep a Secret.
- [ADR-0044](../adr/0044-argo-is-driven-through-one-operation-registry-and-the-argo-cli.md) says Argo never writes into the person's repositories or dotfiles unasked, which rules out writing each Agent's own config file.

## What other ACP clients do

All four keep one list in the client and can send it to agents over ACP.

| Client | How |
| --- | --- |
| Zed | `context_servers` in settings is forwarded to external agents, which may also read their own config. [Zed MCP](https://zed.dev/docs/ai/mcp.md) |
| JetBrains AI Assistant | `default_mcp_settings` in `~/.jetbrains/acp.json`, with a "Pass custom MCP servers" switch that is on by default. [JetBrains ACP](https://www.jetbrains.com/help/ai-assistant/acp.html) |
| CodeCompanion.nvim | The person sets an adapter's `defaults.mcpServers` to `"inherit_from_config"`, and the servers in `mcp.opts.default_servers` are then sent in `session/new`. The default is an empty list. [codecompanion.nvim](https://github.com/olimorris/codecompanion.nvim) |
| AionUi | Its MCP management sends each agent the transports that agent can take. [AionUi](https://github.com/iOfficeAI/AionUi) |

## Config files to import from

A Claude-style `.mcp.json` is the most useful first import format. VS Code's own MCP configuration uses a separate format.

| File | Shape | What to translate |
| --- | --- | --- |
| `.mcp.json`, `~/.claude.json` (Claude) | `mcpServers` object; `type` is `stdio`, `http` (also `streamable-http`), `sse` or `ws` | `${VAR}` and `${VAR:-default}` in command, args, env, url and headers. A `url` with no `type` is an error. `ws` has no ACP form. [Claude Code MCP](https://code.claude.com/docs/en/mcp.md) |
| `.vscode/mcp.json` (VS Code) | `servers` object with `inputs` | Editor-only fields such as `inputs` and `envFile` do not carry over. [VS Code MCP configuration](https://github.com/microsoft/vscode-docs/blob/main/docs/agents/reference/mcp-configuration.md) |
| `.cursor/mcp.json` (Cursor) | `mcpServers` object | `${env:NAME}`, `${userHome}` and `${workspaceFolder}`, not bare `${VAR}`. [Cursor MCP](https://cursor.com/docs/mcp.md) |
| `settings.json` (Gemini) | `mcpServers` object, no `type` | `url` is SSE and `httpUrl` is streamable HTTP. Variables are expanded in `env` only. |
| `config.toml` (Codex) | `[mcp_servers.<name>]` tables | `http_headers`, and `bearer_token_env_var` names a variable, not a value. |

In every case the object becomes an array, and each `env` and `headers` map becomes an array of `{name, value}`.

## Signing in to well-known servers

Read from each vendor's own page on 2026-11-21. Nothing was connected.

| Server | Takes a token | OAuth |
| --- | --- | --- |
| GitHub | Yes: a personal access token as a bearer header, or in `env` for the local server | No Dynamic Client Registration. Each client needs its own GitHub App or OAuth App. [Host integration](https://github.com/github/github-mcp-server/blob/main/docs/host-integration.md) |
| Linear | Yes: an API key as a bearer header | OAuth 2.1 with Dynamic Client Registration. [Linear MCP](https://linear.app/docs/mcp) |
| Notion | Only on Business and Enterprise plans, where a workspace owner makes an MCP token | OAuth by default; the page does not say how a client registers. [Notion MCP](https://developers.notion.com/docs/get-started-with-mcp) |
| Sentry | The local server accepts `SENTRY_AUTH_TOKEN` or the Sentry CLI login. [Sentry stdio server](https://github.com/getsentry/toolkit/blob/main/docs/releases/stdio.md) | "All connections use OAuth"; the page does not say how a client registers. [Sentry MCP](https://mcp.sentry.dev/) |
| Atlassian | Organization admins can enable API token authentication. [Atlassian authentication guidance](https://support.atlassian.com/rovo/kb/fix-oauth-consent-block-for-atlassian-rovo-mcp-server-in-atlassian-cloud/) | OAuth 2.1; the page does not say how a client registers. [Atlassian remote MCP server](https://support.atlassian.com/atlassian-rovo-mcp-server/docs/getting-started-with-the-atlassian-remote-mcp-server/) |

The MCP authorization spec of 2025-11-25 gives a client four ways to get a client id, tried in this order: one registered beforehand, a Client ID Metadata Document, Dynamic Client Registration, and asking the person to enter one. A Client ID Metadata Document is a public JSON file the client hosts at an HTTPS URL, holding its name and redirect addresses and no secret. A redirect address may be `localhost`, and PKCE is required. [MCP authorization](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization)

A pasted token needs no hosting or OAuth app. Whoever runs OAuth needs a client ID that the vendor accepts. An Agent that runs its own OAuth uses its own registration and keeps its own tokens.

## Approved Settings design

- **L2** shows the Argo MCP server, the person's configured servers, and a list of well-known servers. The person can add their own server. Rows use brand marks where available and the MCP mark otherwise. The Argo MCP server points to Agent access.
- **S2** keeps definitions and Secrets on the Server. Each Project chooses which configured servers its Sessions get.
- **OAuth client metadata** may be hosted as one static public JSON file on the project domain. The file contains the client identity and redirect URLs. Secrets stay in the OS secret store on the Server Device.

[Paper options L2 and S2](https://app.paper.design/file/01M5FNKVE7NQX0KXYWG8SKAVBW/p-10-0)

## Shipping well-known servers

A curated remote entry can ship with a name, mark and endpoint. For a vendor that accepts a Client ID Metadata Document, the proposed Connect flow opens the vendor's consent page from the Server Device and receives the callback on loopback. The Server can keep and refresh the tokens locally if Argo owns the OAuth flow. Claude Code publishes a metadata document for this approach. GitHub's hosted MCP server requires a registered client for OAuth or a pasted personal access token. [Claude Code MCP](https://code.claude.com/docs/en/mcp.md) · [GitHub host integration](https://github.com/github/github-mcp-server/blob/main/docs/host-integration.md)

On 2026-11-21, Linear, Notion, Sentry and Vercel advertised support for a Client ID Metadata Document and token exchange without a client secret. These are candidates for Connect. Argo still needs to verify consent, the loopback callback and token refresh with its own client ID. [Linear metadata](https://mcp.linear.app/.well-known/oauth-authorization-server) · [Notion metadata](https://mcp.notion.com/.well-known/oauth-authorization-server) · [Sentry metadata](https://mcp.sentry.dev/.well-known/oauth-authorization-server) · [Vercel metadata](https://vercel.com/.well-known/oauth-authorization-server)

A local stdio entry needs an executable for the Server Device. A self-contained binary can run directly. An npm package needs a compatible Node runtime, including when the package uses an MCP Bundle. Argo's Agent launcher already installs versioned packages and resolves executables. Reusing that machinery would still require a compatible runtime for clean installs and an approved command, arguments and environment variable names before launch. [MCP Bundles](https://github.com/modelcontextprotocol/mcpb)

## Implications for Argo

- **Send the Project's enabled servers.** Read the enabled subset of the Server's list and send it beside the Argo MCP server when opening a Session.
- **Choose what to send from what the Agent takes.** Send http only when `mcpCapabilities.http` is true and sse only when `mcpCapabilities.sse` is true. One sse entry fails the whole opening on Codex. Antigravity advertises sse but runs it as streamable HTTP, so a server that speaks only SSE should not be sent to it.
- **Keep stdio entries free of a `type` field.** Claude drops them silently otherwise.
- **Give each server a name no Agent's own config will hold.** Codex drops a name it already has, and pi prefers its own. A prefix, as in `argo-<Session id>`, avoids both. Names must stay unique after whitespace becomes underscores, and for pi they hold only letters, digits, `_` and `-`.
- **An Agent's own list still loads.** Claude's can be turned off whole with `strictMcpConfig`, and its claude.ai connectors alone with `ENABLE_CLAUDEAI_MCP_SERVERS=false`. Antigravity's file moves with `GEMINI_HOME`, which moves its other state too. Codex has no switch for one Session, and Gemini was not read for one. pi's `--no-mcp` turns off all of pi's MCP support, the servers an extension registers included, so only Claude can drop its own list and keep the one Argo sends. The person sees a server twice when it is in both lists under different names.
- **Capabilities do not tell the whole truth.** pi's adapter advertises no http and no sse, which ACP allows, but it also drops the stdio entries every Agent must take. So "this Agent gets no MCP servers" is a fact about the Agent, held where the Engine already holds pi's other gaps.
- **pi needs the launcher.** The `argo-pi` extension would register each server, and the list has to reach it, since the extension runs inside pi.
- **Pass-through sends a Secret to the Agent's process.** A server's configuration can include Secrets in its `env` or headers. [ADR-0051](../adr/0051-secrets-live-in-each-oss-secret-store-and-a-sign-in-becomes-an-account.md) now allows that for the person's own Secrets and nothing else. It also forbids a Secret in a process's argv. The Claude adapter passes `env` and headers to Claude over stdin, but is reported to put them in argv when `CLAUDE_CODE_EXECUTABLE` is set, which needs checking first.
- **Pass-through can carry a preconfigured token.** It works where the Agent connects the transport and the server accepts the token in `env` or a header. Claude and Codex have code that starts OAuth for a server Argo sends once Argo advertises URL elicitation; neither path was run, and each Agent would sign in for itself. In Gemini no OAuth handling for such a server was found, and Antigravity's conversion carries only a URL and headers. One OAuth sign-in for every Agent means Argo holds the tokens and stands between the Agent and the server.
- **Do not read a project `.mcp.json` unasked.** The spec asks for the person's approval of a stdio command taken from workspace files, and Claude already loads the file itself. An import the person starts and approves fits both.
- **A change reaches an Agent when a Session next opens or resumes,** because that is when Argo sends the array. The Claude adapter also has a way to change servers in a running session (`setMcpServers`), seen in the installed binary and not read.
- **The term and the Secret store are decided elsewhere.** `GLOSSARY.md` names the MCP server, and ADR-0051, amended on 2026-11-21, keeps the person's Secrets. This note changes neither.
- **Argo does not know whether a server works.** Claude and Codex report a server that failed to start; whether Argo's ACP client keeps or shows those reports was not checked. Gemini, pi and Antigravity were not found to report one. A check Argo runs itself needs Argo to be an MCP client.

## Open questions

- Whether OAuth servers wait for Argo to hold the tokens, or sign in once per Agent in the meantime.
- Which well-known MCP servers ship first and whether the list is refreshed from a public registry.
- How an MCP server and a Plugin for the same service, such as GitHub, are told apart, and whether an MCP server may use an Account a Plugin provides.
- Which of an Agent's own lists Argo turns off, if any. `strictMcpConfig` also turns off the project `.mcp.json` and claude.ai connectors.
- Whether adding an MCP server or setting its Secret is an Operation an Agent may call, or the person's alone ([ADR-0044](../adr/0044-argo-is-driven-through-one-operation-registry-and-the-argo-cli.md)).
- Whether a Session without Agent access gets the list, which today would need its own Agent process.

## Not verified

- Which entry wins on Claude when a server Argo sends has the same name as one in `.mcp.json` or `~/.claude.json`.
- Whether Claude loads plugin-provided servers under ACP.
- Whether a bare command such as `npx` resolves on the PATH an Agent starts a stdio server with. The spec asks for an absolute path.
- Whether Antigravity connects the servers again on resume. Claude, Codex and Gemini pass the array on resume and load in source.
- Whether Codex keeps OAuth tokens for a server that exists only in a Session.
- Anything about Antigravity beyond what its binary strings show, OAuth included.
- The Claude adapter was read in source at 0.108.x and at the upstream v0.109.0 tag. The installed 0.109.0 binary was matched by its strings for `settingSources`, `mcpCapabilities` and the stdio mapping, not for the OAuth code.
- Whether the Claude adapter puts a server's `env` and headers in argv when `CLAUDE_CODE_EXECUTABLE` is set.
- The "No" for a project `.mcp.json` on Codex and Antigravity comes from their docs and a search of the binaries for the file name, not from reading a loader.
- The Gemini findings come from two readers of the installed bundle. The reader set on Gemini alone returned nothing.
