# Mock Agent

`@repo/mocks/agent` exports `createMockAdapter`, an Agent adapter whose vendor messages are the Agent events a test scripts, and `createMockAgentMachine`, the one Agent machine (ADR 0015) running that adapter under the Agent id `mock`. The script has three hooks:

- `connect(input)` resolves the `agent.ready` event, or rejects to model a connection failure. Keep its promise pending to test startup and stopping during startup.
- `stream(stream)` gets `send(event)`, `fail(error)`, and `receive(handler)`. Send typed Agent events whenever the test needs them, and register a handler to observe Session commands. Return a cleanup function to release anything the script starts.
- `stop(input)` resolves when shutdown finishes, or rejects to model a shutdown failure. Keep it pending to test the Session's shutdown limit.

The machine can be supplied as the Session machine's `agent` actor. Its model-based test in `machine.test.ts` walks every transition of the Agent machine.

Agent payloads project the exported types from `@repo/contracts` for Feed changes, config values, Plan proposals, Session identity, permissions, and Turn fields. Capabilities, vendor identifiers, actor refs, and Shell lifecycle states remain adapter-owned. Optional end times omit the database's null value until work ends.

The two capability fields describe the differences that shared code needs: `planApproval` selects whether answering a Plan proposal continues a running Turn or starts a new one, and `stopShell` says whether an individual Shell can be stopped. A Plan answer that starts a Turn carries the service's `turnId`. A `keep_planning` answer requires feedback. The script owns the ready data and config changes; the mock invents no vendor values.

This mock is for machine composition tests. End-to-end tests continue to mock only the Agent CLI under `mocks/cli/<agent>/`.
