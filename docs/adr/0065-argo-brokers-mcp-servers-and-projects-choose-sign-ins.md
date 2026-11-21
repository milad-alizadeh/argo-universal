# Argo brokers MCP servers and Projects choose sign-ins

Each Agent reads its own MCP configuration. Passing one list to all Agents can share setup, but it cannot enforce immediate revocation once an Agent holds the credential. Argo keeps one list on the Server and brokers every managed tool call so the person can sign in once and each Project can use the intended identity.

This builds on [ADR-0036](0036-plugins-own-sign-in-and-argo-brokers-their-accounts.md), [ADR-0044](0044-argo-is-driven-through-one-operation-registry-and-the-argo-cli.md) and [ADR-0051](0051-secrets-live-in-each-oss-secret-store-and-a-sign-in-becomes-an-account.md). The [research note](../research/mcp-servers-for-every-agent.md) records the approved Settings design, adapter findings and release checks.

## Decisions

- **The Server owns definitions and sign-ins.** A configured MCP server can have several named MCP sign-ins. A Project explicitly enables a server and selects one sign-in if it requires credentials. Projects can select the same sign-in independently. Argo never falls back to another sign-in. Connecting a server in Settings grants access to no Project. An unauthenticated server can be enabled without a sign-in.
- **The person grants access in the App.** The person adds and edits servers, sets Secrets and enables servers for Projects. For a local command, approval shows the exact command, arguments and environment variable names. Enablement grants the Project's Sessions every tool available through the selected sign-in, including write tools where the vendor allows them. Vendor permissions and Agent prompts still apply.
- **The Server checks each call against the Session's Project and sign-in.** The Agent sees each configured server by name. Remote Secrets stay on the Server, and Argo stops authenticated requests that redirect to a different origin. Using that destination requires fresh approval and sign-in. Argo starts local MCP processes on demand with each Session's working directory and configured environment, and stops them when the Session's access ends.
- **Agent access governs Argo Operations.** A Session can use the Project's enabled MCP servers with Agent access off. The Argo MCP server remains distinct. Argo gives managed entries distinct names and leaves each Agent’s native configuration alone. A service can appear in both lists.
- **Revocation applies to new calls immediately.** Disabling or removing a server, disconnecting or removing a sign-in, or switching a Project to a different sign-in blocks new calls under the old grant. Requests already sent may have taken effect. A Session picks up newly enabled tools or a replacement sign-in when it next opens or resumes. A changed URL or local command requires fresh approval and inherits neither Project grants nor Secrets.
- **Argo owns OAuth for managed servers.** The browser and loopback callback run on the Server Device. A paired Device directs the person there and shows the sign-in afterward. Argo keeps and refreshes tokens using the OS secret store. A public Client ID Metadata Document may be hosted on the project domain. MCP sign-ins and Plugin Accounts have separate grants and sign-out.
- **A sign-in keeps its identity.** Reconnecting restores the same sign-in when Argo can verify the identity. If the vendor provides no stable identity, fresh authorization creates a new sign-in. Routine refresh preserves the existing sign-in. Disconnect deletes Argo's saved tokens and keeps the Project selections visible. Argo reports upstream revocation only when the vendor confirms it. Removing a sign-in names the affected Projects and requires each to select a replacement explicitly.
- **A failed server leaves the Session usable.** Argo reports the affected server and the reason it can confirm, including when an Installed Agent cannot use it. Other available tools continue to work while the person retries or reconnects.

## First release

Settings shows the Argo MCP server, configured servers and a short list of well-known servers. The first release includes at least one well-known server with Connect. It also supports manual setup of custom HTTPS servers, including pasted tokens, and local commands already installed on the Server Device. Later work can add package installation, explicit config import and registry refresh.

Sentry is the first Connect candidate. Before release, verify distinct Personal and Work sign-ins across two Projects through Claude and Codex, including with Agent access off. Test consent, the loopback callback, refresh, immediate revocation and failure isolation. Also verify a custom HTTPS server with a pasted token and an installed local command. Add Gemini, Antigravity and pi as each is verified.

## Considered options

- **Pass the servers and their credentials directly to each Agent.** This would reuse ACP configuration with less Server code. Argo would give up control of credential refresh and could not reliably stop a running Session from making a new call after access is revoked.
- **Enable a sign-in across all Projects.** The same service can have work and personal identities. Automatic selection could send Project data to the wrong one.
