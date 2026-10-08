# Mock Agent

`@repo/mocks/agent` exports `createMockAdapter`, an Agent adapter with the Agent id `mock` whose vendor messages are the Agent events a test scripts. The one Agent machine (ADR 0015) runs it like any other adapter. The script has three hooks:

- `connect(input)` resolves the ready data, `mockReady` by default, or rejects to model a failed start. Keep its promise pending to test startup and stopping during startup.
- `stream(stream)` gets `send(event)`, `fail(error)`, and `receive(handler)`. Send typed Agent events whenever the test needs them, and register a handler to observe Session commands. Return a cleanup function to release anything the script starts.
- `stop(input)` resolves when shutdown finishes, or rejects to model a shutdown failure. Keep it pending to test the Session's shutdown limit.

Pass it to a Session in the `adapter` input. The model-based test in `agent-machine.test.ts` walks every transition of the Agent machine with it.

Agent payloads project the exported types from `@repo/contracts` for Feed changes, config values, Plan proposals, Session identity, permissions, and Turn fields. Capabilities, vendor identifiers, actor refs, and Shell lifecycle states remain adapter-owned. Optional end times omit the database's null value until work ends.

The three capability fields describe the differences that shared code needs: `permissionFeedback` says whether the Agent can deliver feedback on a rejected Permission request (the Server refuses feedback unless it is `true`), `planApproval` selects whether answering a Plan proposal continues a running Turn or starts a new one, and `stopShell` says whether an individual Shell can be stopped. A Plan answer that starts a Turn carries the service's `turnId`. A `keep_planning` answer requires feedback. The script owns the ready data and config changes; the mock invents no vendor values.

App E2E uses this same adapter with `app-fixtures.ts`: one shared completed Turn and image reply, plus availability setup states. Registered Agent identities and metadata come from the production registry; probes and Sessions use only the fixture methods. The E2E-only Engine bootstrap supplies those adapters without changing production startup. See ADR-0018.

Change the shared Argo fixture when the product contract changes. Provider SDK updates belong to separate real-adapter contract tests; app fixtures do not regenerate expected values from those adapters.
