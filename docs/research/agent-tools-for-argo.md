# Agent tools for Argo: MCP, meta-tools, CLI, Skills, or code mode

Researched 2026-10-26. Question: how should Agents (and outside callers such as Claude Code in a terminal) reach Argo's own operations without MCP tool schemas eating the model's context, with a catalogue that starts near 15 operations and may reach 50–200 with Plugins.

## Sources

- **Primary only**: vendor docs, engineering posts, specs and source code, linked inline. Where only a secondary site (blog mirror, aggregator) supported a claim, it says so.
- **Source code read** (main branch, 2026-10-26): [openai/codex](https://github.com/openai/codex), [zed-industries/claude-agent-acp](https://github.com/zed-industries/claude-agent-acp) `src/acp-agent.ts`, [svkozak/pi-acp](https://github.com/svkozak/pi-acp), [badlogic/pi-mono](https://github.com/badlogic/pi-mono) `packages/coding-agent/docs/`, [github/github-mcp-server](https://github.com/github/github-mcp-server).
- **Registry**: [registry.json](https://cdn.agentclientprotocol.com/registry/v1/latest/registry.json) lists 43 Agents today, including `claude-acp@0.96.0`, `codex-acp@2.2.2`, `gemini@0.65.0`, `antigravity-acp`, `opencode@1.19.4`, `pi-acp@0.0.34`.
- **Not checked**: the other ~37 Registry Agents, Berkeley Function Calling Leaderboard numbers, Gemini CLI and OpenCode source (docs only).
- Token figures in "Argo estimate" lines are my arithmetic from the cited numbers, not measurements.

## 1. Baseline facts that frame every option

- **Static MCP tools are expensive.** Anthropic measured five servers (GitHub 35 tools, about 26K tokens; Slack 11, about 21K; Sentry, Grafana, Splunk) at 58 tools and about 55K tokens, and has seen 134K before optimisation ([Advanced tool use](https://www.anthropic.com/engineering/advanced-tool-use)). That is roughly 740 to 950 tokens per tool.
- **Accuracy falls with count.** Anthropic: selection "degrades once you exceed 30–50 available tools" ([tool search docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool)). OpenAI: aim for fewer than 20 functions at the start of a turn, "a soft suggestion" ([function calling](https://developers.openai.com/api/docs/guides/function-calling)).
- **MCP has no standard lazy loading.** The 2026-07-28 revision adds `tools/list` caching (`ttlMs`) and deterministic ordering, not search ([changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog)). Tool-search proposals SEP-1576, SEP-1821 and RFC 2376 are all closed (checked with `gh`; SEP-1821 had no sponsor, SEP-1576 is labelled dormant). Deferral is client-side, per Agent.
- **ACP side.** `mcpServers` in `session/new`: stdio mandatory, http and sse gated by `mcpCapabilities` ([ACP session setup](https://agentclientprotocol.com/protocol/session-setup)). Claude Agent ACP forwards `_meta.claudeCode.options` (including `mcpServers`, `skills`, `allowedTools`) to the Claude SDK (`src/acp-agent.ts`, `NewSessionMeta`). No ACP field exists for Skills.

## 2. Option A: MCP, one tool per operation

1. **Tokens.** About 740 to 950 per tool (above). Argo estimate: 15 ops about 5–14K; 150 ops about 50–140K, paid every turn unless the client defers. Anthropic's own tool-search result is 500 tokens upfront for the search tool plus about 3K for 3–5 discovered tools ([post](https://www.anthropic.com/engineering/advanced-tool-use)).
2. **Accuracy.** Degrades past 30–50 tools (Anthropic); the closest third-party number is RAG-MCP: tool-selection accuracy 13.62% baseline vs 43.13% with retrieval ([arXiv 2505.03275](https://arxiv.org/abs/2505.03275), academic, not an Agent vendor).
3. **Deferral per Agent.**
   - Claude Code: on by default. Only tool names and server instructions load at start; `ENABLE_TOOL_SEARCH` takes `true`, `false`, `auto`, `auto:N` (default `auto` threshold 10% of context) ([MCP docs](https://code.claude.com/docs/en/mcp)).
   - Codex: source says "MCP tools are always deferred when tool_search is available" and `tool_search` is "always enabled" (`codex-rs/features/src/lib.rs`, flags marked Removed). OpenAI documents tool search only for `gpt-5.4` and later ([tool search](https://developers.openai.com/api/docs/guides/tools-tool-search)); whether Codex gates on the same models is unconfirmed.
   - Gemini CLI: its MCP page describes discovery at startup with no deferral ([docs](https://geminicli.com/docs/tools/mcp-server/)). Its docs banner says Antigravity CLI replaced Gemini CLI for unpaid and Google One users on 2026-06-18, so scope is unclear.
   - OpenCode: [docs](https://opencode.ai/docs/mcp-servers/) say "it adds to the context", no lazy loading.
   - Pi: its own MCP extension has `exposure` modes `codemode` (default), `deferred`, `direct`, `hidden`, plus a built-in `tool_search` ([mcp.md](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/mcp.md)). But `pi-acp` "accepted in ACP params… but not wired through to pi" ([README](https://github.com/svkozak/pi-acp)). Pi reads `~/.pi/agent/mcp.json` and project `.pi/mcp.json` (trust required). Vercel's 2026-09-15 page still says Pi needs `pi-mcp-adapter`, so which Pi release has the built-in is unconfirmed.
   - Zed's own agent: docs silent on deferral ([MCP](https://zed.dev/docs/ai/mcp)).
4. **Structure and repair.** Best of all options: JSON Schema input, structured results, `isError`. Claude Code warns above 10,000 tokens of MCP output and caps at 25,000 by default (same MCP page).
5. **Permissions.** See section 8.
6. **Reach.** http: Claude Agent ACP, Codex ACP, Gemini CLI, OpenCode (given). Stdio works everywhere by ACP rule, except Pi via `pi-acp`.
7. **Vendors.** GitHub ships toolsets and merged 13 tools into 4 ([changelog](https://github.blog/changelog/2025-10-29-github-mcp-server-now-comes-with-server-instructions-better-tools-and-more/)). Linear, Vercel and Stripe ship remote OAuth servers.

## 3. Option B: MCP with meta-tools (search, describe, invoke)

1. **Tokens.** Constant in catalogue size. Cloudflare: two tools, about 1,000 tokens, vs 1.17M tokens for the same API as one tool per endpoint ([Cloudflare](https://blog.cloudflare.com/code-mode-mcp/)). Speakeasy: usage "stays roughly constant from 40 to 400 tools", 96% fewer input tokens on average, but about 2x tool calls and about 50% longer runs ([Speakeasy](https://www.speakeasy.com/blog/how-we-reduced-token-usage-by-100x-dynamic-toolsets-v2)). Argo estimate: 3 meta-tools about 0.5–1.5K at any N; each `describe` adds about 700 per operation.
2. **Accuracy.** Speakeasy self-reports 100% success on 40–400 tools (Sonnet 4.5, vendor benchmark). No independent figure found.
3. **Deferral.** Not needed; works on every Agent that accepts the server. Cost is extra round trips.
4. **Structure and repair.** Weaker: `invoke` takes a loosely typed `arguments` object, so validation lives in Argo. Zod errors can come back as text the model repairs.
5. **Permissions.** One `invoke` tool hides read vs write from per-tool allowlists. Stripe splits `stripe_api_read` and `stripe_api_write` and adds human confirmation on refunds ([Stripe MCP](https://docs.stripe.com/mcp)).
6. **Reach.** Same as A.
7. **Who ships it.** Stripe (`stripe_api_search`, `stripe_api_details`, `stripe_api_read`, `stripe_api_write`), Cloudflare (`search`, `execute`), Speakeasy. GitHub's `--dynamic-toolsets` (3 discovery tools) was experimental and removed in v1.1.0 ([release note](https://github.com/github/github-mcp-server/releases), PR #2512; [feedback issue](https://github.com/github/github-mcp-server/issues/275)). Anthropic and OpenAI instead built it into the model API (`defer_loading`, up to 10,000 tools, 5 results per search by default).

## 4. Option C: a CLI the Agent runs through its shell

1. **Tokens.** Nothing upfront; the shell tool is already loaded. Pi's author measured Playwright MCP at 13.7K tokens (21 tools) against a 225-token README for equivalent CLI scripts ([post](https://mariozechner.at/posts/2025-11-02-what-if-you-dont-need-mcp/)). Argo estimate: `argo --help` for 150 commands about 1–3K, each subcommand help about 300–800, paid only when used.
2. **Accuracy.** No catalogue-size benchmark found. Vercel replaced 17 tools with one bash tool: 4/5 to 5/5 success, 37% fewer tokens, 3.5x faster on 5 queries ([Vercel](https://vercel.com/blog/we-removed-80-percent-of-our-agents-tools)); small sample, file-browsing task.
3. **Deferral.** N/A; `--help` is the discovery step.
4. **Structure and repair.** Weakest schema story: args are strings, results are text unless the CLI offers `--json`. Exit codes and stderr give repair signal. Reading `--help` costs turns.
5. **Permissions.** See section 8.
6. **Reach.** Any Agent with a shell tool, if Argo puts the binary on `PATH` (Argo controls each Agent's env). Sandboxes are the risk.
7. **Vendors.** Anthropic: "CLI tools are the most context-efficient way to interact with external services", and Claude can learn one via `--help` ([best practices](https://code.claude.com/docs/en/best-practices)). `gh` is the example.

## 5. Option D: Agent Skills teaching the CLI or API

1. **Tokens.** Metadata about 100 tokens per skill, body under 5,000 tokens recommended, resources on demand ([spec](https://agentskills.io/specification)). Claude Code truncates description at 1,536 characters ([skills](https://code.claude.com/docs/en/skills)); Codex caps the initial list at 2% of context, max 10,000 tokens ([Codex skills](https://learn.chatgpt.com/docs/build-skills)). Argo estimate: one `argo` skill about 100 tokens resident, 1–5K when loaded, per-operation detail in `references/`.
2. **Accuracy.** Skills may not fire. Vercel's eval: skill alone 53% (same as no docs), 56% of cases never invoked; explicit instruction 79%; a docs index in AGENTS.md 100% ([Vercel](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals)). One-vendor eval on framework docs, not CLI use.
3. **Which Agents load Skills** (all confirmed from docs):

   | Agent | Project path | User path |
   |---|---|---|
   | Claude Code | `.claude/skills` | `~/.claude/skills` |
   | Codex | `.agents/skills` | `~/.agents/skills`, `/etc/codex/skills` |
   | Gemini CLI | `.gemini/skills`, `.agents/skills` | `~/.gemini/skills`, `~/.agents/skills` (activation needs user consent) |
   | OpenCode | `.opencode/`, `.claude/`, `.agents/` skills | `~/.config/opencode/`, `~/.claude/`, `~/.agents/` |
   | Pi | `.agents/skills`, own dirs | `~/.agents/skills` |

   Zed's own agent: unconfirmed (docs only mention skills as `@`-context). Other Registry Agents: not checked.
4. **Can Argo inject one per Session?** No ACP method. The Claude Agent SDK has no programmatic registration, only filesystem plus a `plugins` option for a path ([SDK skills](https://code.claude.com/docs/en/agent-sdk/skills)). Options: write `.agents/skills/argo` (and `.claude/skills/argo`) into the Session checkout, or a per-Agent `HOME`. Writing into a checkout dirties git (ADR-0008 makes the checkout the Session's). Pi can also add `/skill:name` via pi-acp slash commands.
5. **Permissions.** Claude Code `allowed-tools: Bash(${CLAUDE_SKILL_DIR}/scripts/x *)` pre-approves for one turn. Spec marks `allowed-tools` experimental.
6. **Vendors.** Anthropic created the format; Codex, Gemini CLI, OpenCode and Pi adopted it. Stripe and Supabase ship skills next to their MCP servers.

## 6. Option E: code mode

1. **Tokens.** Cloudflare: 2,500+ endpoints behind two tools, about 1,000 tokens, fixed ([post](https://blog.cloudflare.com/code-mode-mcp/)). Anthropic's illustration: 150,000 to 2,000 tokens (98.7%) ([post](https://www.anthropic.com/engineering/code-execution-with-mcp)); programmatic tool calling averaged 43,588 to 27,297 tokens (37%) ([post](https://www.anthropic.com/engineering/advanced-tool-use)).
2. **Accuracy.** CodeAct: up to 20% higher success than JSON actions across 17 LLMs ([arXiv 2402.01030](https://arxiv.org/abs/2402.01030), ICML 2024). Anthropic PTC: internal retrieval 25.6% to 28.5%.
3. **Per Agent.** Codex has a `code_mode` feature (search inside it is `UnderDevelopment`, default off) per `features/src/lib.rs`. Pi has built-in `codemode`. Claude Code, Gemini CLI, OpenCode, Zed: none found. The generic route is the Agent writing a script against a typed Argo client through its shell, which is option C plus a TypeScript SDK.
4. **Structure and repair.** Strong: type errors and exceptions in the sandbox, loops and filtering in code. Needs a runtime and a sandbox.
5. **Permissions.** One coarse "run code" approval; fine-grained control moves to the API token's scope.
6. **Vendors.** Cloudflare, Anthropic, Hugging Face smolagents.

## 7. Option F: MCP-over-ACP

Draft RFD, "targets MCP 2026-07-28 only", gated on unfinished stabilisation steps; mechanism is `"type": "acp"` servers and `mcp/message`; no Agent named as implementing it ([RFD](https://agentclientprotocol.com/rfds/mcp-over-acp)). Codex ACP rejects it (given). Not usable today.

## 8. Permissions and sandboxes per Agent

- **Claude Code.** MCP: `mcp__argo` or `mcp__argo__*`; allow globs only after the literal `mcp__<server>__` prefix; an `mcp__` rule with parentheses (parameter matching) is skipped. Bash: `Bash(argo session list *)`; `&&`, `|` and `;` split into separately matched subcommands ([permissions](https://code.claude.com/docs/en/permissions)). Through Claude Agent ACP, tool calls arrive "with permission requests" ([README](https://github.com/zed-industries/claude-agent-acp)), so Argo as ACP client sees them and can apply its own policy (inference that this covers MCP and Bash alike).
- **Codex.** MCP: `default_tools_approval_mode` (`auto`, `prompt`, `writes`, `approve`) and per-tool `approval_mode`; `writes` prompts for tools not marked read-only ([MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)). Shell: `workspace-write` sandbox "keeps network access turned off unless you enable it" via `sandbox_workspace_write.network_access = true`; with `features.network_proxy`, `allow_local_binding = false` blocks "loopback, link-local, and private destinations" ([approvals](https://learn.chatgpt.com/docs/agent-approvals-security)). So a CLI calling a localhost Server is blocked by default. Whether macOS Seatbelt permits loopback or a Unix socket with network off: unconfirmed (source has `unix_sockets` allowlisting under the proxy, macOS-only). MCP calls are made by Codex itself, so (inference) they do not hit the shell sandbox.
- **Gemini CLI.** Per-server `trust` (default false), `includeTools` allowlist; "allow once / always tool / always server".
- **OpenCode.** `tools` globs enable or disable `servername_*`; the MCP page documents no separate permission setting.
- **Zed agent.** `agent.tool_permissions` with keys like `mcp:<server>:<tool>`.

## 9. Comparison

| | A. Tool per op | B. Meta-tools | C. CLI | D. Skill | E. Code mode | F. MCP-over-ACP |
|---|---|---|---|---|---|---|
| Upfront tokens, 15 ops (est.) | 5–14K, or ~0 if deferred | ~1K | 0 | ~100 | ~1K | n/a |
| Upfront tokens, 150 ops (est.) | 50–140K, or ~0 if deferred | ~1K | 0 | ~100 | ~1K | n/a |
| Selection accuracy at scale | Falls past 30–50 | Self-reported high, more calls | No data | Skill may not fire | Reported gains | n/a |
| Deferral built in | Claude Code, Codex, Pi | Not needed | N/A | Yes (spec) | N/A | n/a |
| Input schema and repair | Best | Loose | Weakest | Weak (text) | Strong (types) | n/a |
| Fine-grained approval | Per tool | Coarse (one invoke) | Per command prefix | Inherits | Coarse | n/a |
| Local sandbox risk | Low | Low | High (Codex) | Same as C | High | n/a |
| Reach in Registry | http: 4 confirmed; stdio all but Pi | Same | Any shell Agent | 5 confirmed | Few | None |
| Shipped by | GitHub, Linear, Vercel | Stripe, Cloudflare, Speakeasy | gh, Anthropic advice | Anthropic, Stripe, Supabase | Cloudflare, Pi | Nobody |

## 10. Inferences for Argo (inference, not fact)

- **Nobody ships one option alone.** Stripe's MCP server uses search, details, read and write meta-tools, adds skills and a plugin, and installs via a CLI (`stripe agent setup`). Supabase ships MCP feature groups, skills and a plugin. Pi's default is code mode, with deferred and direct as overrides. The CLI there is an installer, not the runtime path, so a published "MCP core + CLI + Skill" runtime hybrid was not found.
- **Cheapest defensible shape.** Generate from the Zod registry: (1) a small direct MCP set of about 5–8 high-frequency, clearly read-or-write tools, (2) `argo_search`, `argo_describe`, `argo_invoke_read` and `argo_invoke_write` for the long tail and Plugin commands, (3) an `argo` CLI with the same commands and `--json`, (4) one Skill that points at the CLI. Keep read and write invoke tools separate so approvals stay meaningful.
- **Why MCP first.** The http MCP route is the only one confirmed on four Registry Agents, survives Codex's default sandbox (inference), gives schema validation and annotations, and Claude Code and Codex already defer it, so option A's cost mostly applies to Gemini CLI, OpenCode and Zed's agent.
- **Why the CLI second.** It reaches Pi (which ignores client MCP in `pi-acp`) and outside callers, but is blocked on Codex unless Argo enables network or a socket allowance. Test that before promising it.
- **Skills are a nudge, not a guarantee.** Vercel's 56% never-invoked result argues for a one-line mention in the Session's system prompt or Argo's injected context, not relying on description matching.
- **Code mode** is worth deferring: only Codex and Pi have it natively, and it needs a sandbox Argo would own.

## 11. Gaps

- No first-party token measurement of a real Argo-like catalogue; all Argo numbers are estimates.
- Gemini CLI, OpenCode and Zed lazy-loading behaviour confirmed only from docs, not source; Gemini CLI's future is unclear after the Antigravity banner.
- Codex tool-search model gating, and loopback or Unix-socket behaviour under Seatbelt with network off, unconfirmed.
- Which Pi release ships built-in MCP unconfirmed.
- Skill support on Zed's agent and the other ~37 Registry Agents not checked.
- No Berkeley Function Calling Leaderboard or OpenAI per-count accuracy figure retrieved.
