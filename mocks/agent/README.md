# Mock Agent

`@repo/mocks/agent` exports `createMockAgentMachine`. It accepts a script with three hooks:

- `connect(input)` resolves the `agent.ready` event, or rejects to model a connection failure. Keep its promise pending to test startup and stopping during startup.
- `stream(stream)` gets `send(event)`, `fail(error)`, and `receive(handler)`. Send typed Agent events whenever the test needs them, and register a handler to observe Session commands or respond to them. Return a cleanup function to release anything the script starts.
- `stop(input)` resolves when shutdown finishes, or rejects to model a shutdown failure. Keep it pending to test the Session's shutdown limit.

The machine takes the shared `AgentInput`, including the typed parent ref, and sends Agent events to that parent. It can be supplied as the Session machine's `agent` actor. Tests can also replace its named `connect`, `vendorStream`, and `stop` actors with `machine.provide`.

Register it as `AgentAdapter<typeof machine>`, so TypeScript checks the concrete machine's commands, input, and output. Subagent discovery includes the parent's prompt for the first `session_message`. A Shell ends with status `exited`, and its exit code is null when the Agent gives none.

It starts in `starting`, sends the scripted ready data, then stays in `ready.idle`. A prompt or a scripted `agent.turnStarted` enters `ready.turn`. Cancel forwards the command and waits for the script to send `agent.turnEnded`. The stream stays open between Turns, so Subagents and Shells can continue sending events while idle.

The two capability fields describe the differences that shared code needs: `planApproval` selects whether answering a Plan proposal continues a running Turn or starts a new one, and `stopShell` says whether an individual Shell can be stopped. A Plan answer that starts a Turn carries the service's `turnId`. A `keep_planning` answer requires feedback. The script owns the ready data and config changes; the mock invents no vendor values.

Stop closes the stream, invokes `stop`, and finishes in `stopped`. Connection, stream, or shutdown errors finish in `failed`, with `{failure}` in the output. Late stream events and a late connection result are ignored after stopping.

This mock is for machine composition tests. End-to-end tests continue to mock only the Agent CLI under `mocks/cli/<agent>/`.
