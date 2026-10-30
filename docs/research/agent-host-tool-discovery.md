# How Agent hosts provide their own tools

Research date: 2026-10-29. This compares host-owned capabilities for embedded Agents, not generic user-installed MCP servers. Paseo's implementation notes below are pinned to repository main commit `9503537041002d63d9078dced49257c8d8a903d2`; they are not evidence of behavior in every released version.

## Paseo: one host catalog, provider-specific delivery

Paseo is the closest comparison to Argo. Its [MCP reference](https://github.com/getpaseo/paseo/blob/9503537041002d63d9078dced49257c8d8a903d2/public-docs/mcp.md) describes host tools for Agents, workspaces, terminals and schedules. The MCP server is enabled by default, but **injection into launched Agents defaults to false**. Once enabled, the host exposes the tools at Session launch; the user need not install a skill or register the server separately for each Agent. Its documentation says a changed setting requires starting a new Agent or reloading an existing one.

The [provider architecture](https://github.com/getpaseo/paseo/blob/9503537041002d63d9078dced49257c8d8a903d2/docs/providers.md) says the catalog lives in the daemon, independent of MCP. Providers with native runtime-tool registration receive the catalog directly; others receive an internal MCP endpoint. The manager removes the internal MCP server when native tools are available, so the Agent does not see duplicate tools. It applies an exact-provider policy before registering either interface. Paseo directly integrates Claude, Codex, OpenCode and Pi, alongside an ACP base for other providers, so its native paths cannot be assumed to exist through Argo's ACP-only interface.

Paseo's [public reference](https://github.com/getpaseo/paseo/blob/9503537041002d63d9078dced49257c8d8a903d2/public-docs/mcp.md) documents a global injection setting, per-provider opt-out and per-tool exclusions. A running Session retains its launch catalog. Its [data-model documentation](https://github.com/getpaseo/paseo/blob/9503537041002d63d9078dced49257c8d8a903d2/docs/data-model.md) explicitly says catalog filtering is not an authorization boundary against an Agent with shell access. Argo's existing token and Operation-tier enforcement remain necessary even if its tool catalog is hidden.

Paseo documents concrete adapter workarounds: its OpenCode integration loads a provider-specific plugin and local bridge; Pi integration probes whether the built-in MCP extension is present and handles a different third-party MCP adapter through a generated per-Agent config. This shows that a generic design does not establish compatibility with every provider. See the pinned [provider architecture](https://github.com/getpaseo/paseo/blob/9503537041002d63d9078dced49257c8d8a903d2/docs/providers.md).

Two Paseo issue reports illustrate failure modes, not current universal defects: one reports an injected MCP endpoint working while its tools were absent from Codex's model-facing tool surface in a specific release ([#3009](https://github.com/getpaseo/paseo/issues/3009)); another reports loss of injected tools on Codex Session resume after a daemon restart ([#3283](https://github.com/getpaseo/paseo/issues/3283)). Test actual tool visibility and resumed Sessions, not just endpoint health.

## Zed: distinguish its own Agent from external ACP Agents

[Zed Agent](https://zed.dev/docs/ai/zed-agent) is Zed's own runtime and has native editor/project tools, profiles and instructions. Its [tool documentation](https://zed.dev/docs/ai/tools) says available tools vary by profile, model and version. This is not evidence that those built-in editor tools are injected into a different Agent's runtime.

[Zed's external-Agent documentation](https://zed.dev/docs/ai/external-agents) says external Agents own their runtime and native tools and that Zed Skills do not apply as Zed Skills. Zed can forward Zed-configured MCP servers to external Agents over ACP; Agents may also use their native MCP config. [Zed's MCP documentation](https://zed.dev/docs/ai/mcp) describes that forwarding. Its [Agent Settings](https://zed.dev/docs/ai/agent-settings) provide a per-server enable/disable toggle. These pages describe user-configured servers; they do not establish that Zed automatically injects a Zed-owned host-control MCP server.

## Cursor and Codex: native host tools, distinct integration boundaries

[Cursor's Agent tools](https://docs.cursor.com/en/agent/tools) include built-in search, editing and terminal capabilities in its own Agent. [Cursor's MCP documentation](https://docs.cursor.com/context/model-context-protocol) documents MCP configuration, per-tool controls and approvals. That establishes a native-host-tool pattern and an MCP pattern; it does not establish automatic injection of Cursor host tools into third-party ACP Agents.

The [Codex app-server implementation documentation](https://github.com/openai/codex/blob/e7039f98449d0e39687aab14eda4b4383b3bce31/codex-rs/app-server/README.md) describes an experimental `thread/start.dynamicTools` interface. A host declares tools and handles `item/tool/call` requests. It is a Codex app-server interface, not a standard ACP `session/new` feature. Codex's [TUI source](https://github.com/openai/codex/blob/main/codex-rs/tui/src/app_server_session.rs) also starts a managed dynamic-tool MCP server for applicable task/worktree services. The platform itself can use a native dynamic tool mechanism or a managed server without asking the user to install a skill; this does not prove the Codex ACP adapter exposes either route to Argo.

## Implications for Argo

- Define Argo tools once against the existing Operation registry and Server authorization. Delivering them via MCP can avoid user setup and preserve ACP compatibility where the Agent actually accepts it. ACP's [Session setup](https://agentclientprotocol.com/protocol/v1/session-setup) provides `mcpServers` on create, load and resume.
- Expose a small, useful tool surface; the research does not establish an ideal count. Paseo's full catalog is one choice, while Argo's current ADR calls for list and run. Measure discovery and context cost across the actual Agents rather than claiming the competitors proved either choice.
- Keep the default-on switch for new Sessions if desired, but make the trust and active-Session behavior explicit. Discovery, catalog filtering, and authorization are separate controls.
- Test the Registry's actual adapter versions end to end: model-visible discovery, a read and an authorized write, denial, restart/resume, disabling access, sandboxed environments and transport failures. An MCP endpoint that responds successfully does not prove the Agent receives its tools.
- The supported fallback for adapters that ignore client-provided MCP is still unresolved. Native tools, system instructions or a generated per-Session adapter might help, but Paseo's provider-specific bridges are not directly portable proof. Do not silently claim full coverage.

This is research, not a change to [ADR-0044](../adr/0044-argo-is-driven-through-one-operation-registry-and-the-argo-cli.md).
