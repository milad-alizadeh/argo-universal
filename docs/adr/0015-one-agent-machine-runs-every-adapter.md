# One Agent machine runs every adapter, and adapters are plain functions

Every Agent has the same lifecycle: start or resume the vendor session, wait for a prompt, run a Turn, cancel it, stop. Spec 0002 first gave each adapter its own XState machine with these same states, so the Claude adapter and the mock Agent each carried a copy. One machine, `createAgentMachine` in `packages/agents/src`, now runs every adapter (owner, 2026-10-05).

An adapter is an `AgentAdapter` in the registry, `agentAdapters`. The Agent machine finds it by the Session's `agent` id. It has three parts, and none of them imports XState:

- `connect(input, listener)` starts or resumes the vendor session. It resolves to an `AgentConnection`, which holds the ready data (`vendorSessionId`, `configOptions`, `capabilities`, `continuedOutside`) and one async method per Session command. The listener takes vendor messages, Agent events that need no mapping, and a failure.
- `toAgentEvents(message, mappingState)` is a pure function that turns one vendor message into Agent events. Its `mappingState` lives in the Agent machine's context.
- `initialMappingState()`.

The Agent machine runs commands one at a time and in order, so a config change lands before the prompt that follows it. It finds the start and end of a Turn in the Agent events, so no adapter decides a lifecycle transition. A connection reports `capabilities` with its ready data, because what a Session can do depends on that session, not only on the vendor. Biome stops an adapter from importing `xstate`.

Inside an adapter, the vendor SDK's TypeScript types describe vendor messages. The adapter does not parse them with Zod. The Feed checks every change an adapter makes against the contract's `SessionUpdate` schema, in `feed-change.ts`, and rejects, logs and counts one that does not match. That is the one check at the boundary between an adapter and the Server.

This follows old Argo's ADR-0047, which replaced its per-vendor machines with async clients and one generic session machine. Paseo has the same split between generic and vendor code, without XState.

## Considered Options

- A machine per adapter, as spec 0002 first said. Replaced: the copies drift, every adapter needs its own model-based tests for the same states, and the Claude machine mapped each message twice to decide whether a Turn ended.
- A stateful class per vendor, as Paseo's `ClaudeAgentSession` is. Rejected: the mapping stays a pure function that recordings drive, with its state in the machine's context.
- Zod schemas for every vendor message. Replaced: the SDK already types its messages, and the Feed checks the result against the contract.
