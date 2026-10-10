# Agents run on subscription logins through ACP

Argo runs Sessions on the subscription the user already pays for. No Anthropic API key and no `OPENAI_API_KEY`. Spec 0009 replaces Argo's native protocol adapters with registry-discovered upstream ACP adapters behind the public ACP SDK (owner, 2026-10-09). Native adapter consumers remain during the ticket sequence and leave at the composition gate; they are not a second supported strategy.

Engine owns each effective Agent launch and its SDK connection. Compatible Sessions within one Project share startup; distinct Projects or executable/version/arguments/environment/authentication context remain isolated. Process cwd is the Project root, and each new/load/resume request carries its own Checkout cwd. Launch inputs are captured before startup, and private reuse keys contain only these effective fields. Session receives one owned SDK role/identity lease. Ordinary methods remain SDK-direct. Shared code branches on protocol capabilities, never on a vendor name. Claude and Codex Sessions draw the same UI.

Subscription authentication, setup and upstream adapter compatibility remain required gates. The empty Session lifecycle slice proves generic ownership, not authenticated upstream isolation, descendant cleanup, or process-count savings. Agents without independent ACP session closure fail the shared lifecycle capability check.

## Considered Options

- Argo-owned native adapters. Superseded by Spec 0009: public upstream adapters and the SDK own protocol behavior.
- Off-the-shelf ACP adapters were rejected earlier because paged history, Subagents and usage were incomplete. Spec 0009 accepts upstream protocol support and defines honest product outcomes for unavailable capabilities rather than maintaining another native strategy.
