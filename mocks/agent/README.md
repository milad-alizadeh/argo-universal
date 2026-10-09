# Mock Agent

`@repo/mocks/agent` exports `createMockAdapter`, an Agent adapter with the Agent id `mock` whose vendor messages are the Agent events a test scripts. The Session owns it like any other adapter (ADR-0015). The script has three hooks:

- `connect(input)` resolves the ready data, `mockReady` by default, or rejects to model a failed start. Keep its promise pending to test startup and stopping during startup.
- `stream(stream)` gets `send(event)`, `fail(error)`, and `receive(handler)`. Send typed Agent events whenever the test needs them, and register a handler to observe Session commands. Return a cleanup function to release anything the script starts.
- `stop(input)` resolves when shutdown finishes, or rejects to model a shutdown failure. Keep it pending to test the Session's shutdown limit.

Pass it to a Session in the `adapter` input. Session and Registry model-based tests in `packages/engine/src/services/sessions/` walk their transitions with it. Native lifetime integration tests exercise readiness, command ordering, recovery and shutdown at the same adapter port.

Agent payloads project the exported types from `@repo/contracts` for Feed changes, config values, Plan proposals, Session identity, permissions, and Turn fields. Capabilities, vendor identifiers, actor refs, and Shell lifecycle states remain adapter-owned. Optional end times omit the database's null value until work ends.

The three capability fields describe the differences that shared code needs: `permissionFeedback` says whether the Agent can deliver feedback on a rejected Permission request (the Server refuses feedback unless it is `true`), `planApproval` selects whether answering a Plan proposal continues a running Turn or starts a new one, and `stopShell` says whether an individual Shell can be stopped. A Plan answer that starts a Turn carries the service's `turnId`. A `keep_planning` answer requires feedback. The script owns the ready data and config changes; the mock invents no vendor values.

App E2E uses `app-fixtures.ts` for registered Agent identities, metadata and availability. Shared replies come from the official ACP Agent SDK peer in `acp-fixtures.ts`, delivered over NDJSON at the generic process port. The E2E-only bootstrap starts the real Engine with these external fixtures; the App, tRPC, Session, Feed, Writer and SQLite run for real. It does not exercise production Supervisor startup. See [ADR-0018](../../docs/adr/0018-app-e2e-uses-shared-agent-fixtures.md) and [Testing seams](../../docs/agents/testing-seams.md).

Change shared fixtures when the product contract changes. Provider translation unit tests pass official typed response fixtures through the real pure mapping and compare independent expected results. Neither those fixtures nor the synthetic SDK peer prove compatibility with an actual upstream Agent; that claim requires separate evidence from the real Agent. App fixtures do not regenerate expected values from production mappings.
