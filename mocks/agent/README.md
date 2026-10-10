# Scripted Agent

`createScriptedAgent(scenario)` uses the official ACP SDK. Engine tests use it over in-memory streams. App E2E and process tests launch the same Agent over stdio.

`scenarios.ts` contains the shared reply, image, cancellation, Permission request, Elicitation, configuration and write-pressure scenarios. Reuse a named scenario before adding inline scenario data.

## Scenario data

`ScriptedScenario` describes Agent behavior with SDK types:

- `steps` supplies the updates and questions for each prompt.
- `responses` supplies typed response data, errors, observations and timing controls for specific ACP methods. Response sequences advance per Session and repeat the last entry.
- `notifications` records cancellation requests.
- `sessionIds` supplies explicit identities. The in-memory launcher otherwise uses sequential identities.

Response records inherit the prompt steps unless they supply their own steps. Held responses can use a promise or a `waitFor` gate. A `rawResult` bypasses response encoding for rejection tests.

Steps can send updates, request Permission or Elicitation, wait for cancellation, hold until closure, fail, or write raw frames. Gates control timing. Parallel steps send concurrent questions. A response array records answers without a custom request handler.

`permission-scenario.ts`, `response-scenarios.ts`, `update-scenarios.ts` and `feed-scenarios.ts` contain shared typed scenario facts.

## Test boundaries

`createScriptedAgentProcess` in the Engine mocks exposes the Agent through the ACP process port. Tests can observe launch requests, termination and process exit. The wire controller delivers raw frames through the same Agent for malformed-frame and coalesced-frame schedules.

`createAgentMetadata` supplies discovery facts for an Agent identity. Its discovery scenarios perform a handshake with the scripted Agent. Metadata cannot start a native Agent session.

App fixtures retain registered identities, metadata and availability. Their options select a scenario. The Engine, App, tRPC, Session, Feed, Writer, SQLite and Git remain real.

Structural machine tests use symbolic actor results to walk transitions. These graph tests do not replace public integration journeys.

These fixtures prove Argo behavior for supplied scenarios. They do not prove upstream Agent compatibility, authentication, descendant isolation or resource savings. See [ADR-0018](../../docs/adr/0018-app-e2e-uses-shared-agent-fixtures.md) and [Testing seams](../../docs/agents/testing-seams.md).
