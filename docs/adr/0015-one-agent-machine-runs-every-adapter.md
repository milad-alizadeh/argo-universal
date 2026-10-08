# One Agent machine runs every adapter, and adapters are plain functions

Every Agent has the same lifecycle: start or resume the vendor session, wait for a prompt, run a Turn, cancel it, stop. The first design gave each adapter its own XState machine with these same states, so the Claude adapter and the mock Agent each carried a copy. One machine, `agentMachine` in `packages/agents/src`, now runs every adapter (owner, 2026-10-05).

An adapter is an `AgentAdapter` in the registry, `agentAdapters`. The registry finds it by the Session's `agent` id with `findAgentAdapter` and passes it to the Session, which passes it to the Agent machine it invokes, so the Agent machine is not built per registry. It has three parts that run a Session, and none of them imports XState:

- `connect(input, listener, signal)` starts or resumes the vendor session. It resolves to a `VendorSession`, which holds the ready data (`vendorSessionId`, `configOptions`, `capabilities`, `continuedOutside`) and a `run(command)` method that runs one Session command. The listener takes vendor messages, Agent events that need no mapping, and a failure. The Agent machine aborts the signal when stopping, so startup and pending commands can release their resources before they resolve.
- `toAgentEvents(message, mappingState)` is a pure function that turns one vendor message into Agent events. Its `mappingState` lives in the Agent machine's `vendorSession` actor, which maps each message as it arrives.
- `initialMappingState()`.

It also describes its Agent before any Session starts, for `agents.list` and the New Session composer (owner, 2026-10-05):

- `label` names the Agent in the UI, and `logo` is its SVG text, so no screen names a vendor.
- `probe(signal)` starts the vendor CLI briefly and resolves to the Agent's `availability`, its `installStep`, and the `configOptions` a New Session offers. It rejects when the CLI does not start, and the Server reports that as `unavailable`. The Server aborts the signal after a timeout. A probe applies the same sign-in rule as `connect`, so an Agent that `agents.list` shows as available can start a Session.

The Agent machine runs ordinary commands one at a time and in order, so a config change lands before the prompt that follows it. Cancel and stop interrupt pending commands. It finds the start and end of a Turn in the Agent events, so no adapter decides a lifecycle transition. A vendor session reports `capabilities` with its ready data, because what a Session can do depends on that session, not only on the vendor. Biome stops an adapter from importing `xstate`.

Inside an adapter and its response mocks, the vendor SDK's TypeScript types or generated protocol types describe vendor messages. ADR-0018 replaces CLI replay with pure translation unit tests and shared App fixtures. The Feed checks every change an adapter makes against the contract's `SessionUpdate` schema, in `feed-change.ts`, and rejects, logs and counts one that does not match. That is the one check at the boundary between an adapter and the Server. ADR-0016 records production decoding of raw protocol JSON before it becomes a provider-owned value.

This follows old Argo's ADR-0047, which replaced its per-vendor machines with async clients and one generic session machine. Paseo has the same split between generic and vendor code, without XState.

## Considered Options

- A machine per adapter, as first designed. Replaced: the copies drift, every adapter needs its own model-based tests for the same states, and the Claude machine mapped each message twice to decide whether a Turn ended.
- A stateful class per vendor, as Paseo's `ClaudeAgentSession` is. Rejected: the mapping stays a pure function that typed response fixtures drive, with its state in the machine's context.
- Zod schemas for every vendor message. Replaced: the SDK already types its messages, and the Feed checks the result against the contract.
