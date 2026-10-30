# How assistant products provide tools to their Agents

Research date: 2026-10-29. This note distinguishes user-visible behavior from documented implementation. Perplexity Computer runs its own Agent harness; Argo hosts external ACP Agents. They have different integration boundaries.

## Perplexity Computer

[Computer's product page](https://www.perplexity.ai/en-GB/products/computer) says it runs workflows using subagents, browsing, research, creation and connected tools. These are presented as Computer capabilities, without asking a user to install a skill for the built-in functions. Connecting third-party services is a separate step; [Perplexity's connector guide](https://www.perplexity.ai/enterprise/videos/how-to-use-connectors) says users connect their apps, after which Computer can use authorized sources and supported actions across tasks.

[Perplexity's engineering article](https://www.perplexity.ai/en-GB/hub/blog/how-we-engineer-safer-agents) states that Computer and Comet use tool-level guidance in system prompts. It also describes Portable Computer as its own deterministic harness: model-proposed actions are executed by harness code subject to policy and sandboxing. It does not establish the complete implementation for cloud Computer, or say whether all product tools are registered through MCP, system prompts, or another mechanism. Instructions about a tool and the interface that actually invokes it are separate concerns.

Perplexity's [Computer update](https://www.perplexity.ai/changelog/deep-research-command-panel-forking-inline-actions-and-enterprise-controls) describes a user-facing `/` panel for built-in modes and available skills, and inline confirmation and connector sign-in. This is a discovery UI for users; it is not evidence of how tools are represented to the model.

## ChatGPT and Claude

[ChatGPT's connected-app guide](https://help.openai.com/en/articles/11487775-connected-apps-in-chatgpt) describes separately connecting apps, account authorization, natural-language use or explicit mentions, permissions and disconnect controls. This does not show how every built-in ChatGPT tool is registered internally.

[Claude's connector guide](https://support.anthropic.com/en/articles/11817150-connect-your-tools-to-unlock-a-smarter-more-capable-ai-companion) describes first-party and MCP integrations surfaced in a directory; users connect services and authenticate when required. The [Anthropic API MCP connector](https://www.anthropic.com/news/agent-capabilities-api) documents server connection and tool discovery at the API layer, but is a developer product, not proof of Claude's internal native-tool design. Anthropic's [tool search documentation](https://www.anthropic.com/engineering/advanced-tool-use) describes on-demand model-facing tool discovery as a separate technique for reducing context usage.

## Implications for Argo

A Perplexity-like experience is that the host provides its own relevant capabilities automatically and separately asks users to connect external services. Because Argo launches third-party Agents via ACP rather than owning their harness, it cannot assume it can register built-in tools or system instructions as Perplexity's own harness can. ACP session MCP configuration is an available delivery mechanism to investigate for those Agents; support must be verified by Agent and version. Argo's Server should independently enforce Session scope and permission decisions. Prompt instructions can explain a capability, but do not themselves create or authorize the callable tool.

The sources do not establish whether Perplexity Computer internally uses MCP for its own built-in tools, nor how it passes Argo-like host controls to independent third-party ACP Agents. Its product UX supports the automatic-availability goal, not a specific implementation choice.
