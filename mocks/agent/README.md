# Scripted Agent

`createScriptedAgent(scenario)` uses the official ACP SDK. Engine tests use it over in-memory streams. App E2E and process tests launch the same Agent over stdio.

`scenarios.ts` contains the shared reply, image, cancellation, refused Session, Permission request, Elicitation, configuration, Agent title and write-pressure scenarios. Reuse a named scenario before adding inline scenario data.

## Scenario data

`ScriptedScenario` describes Agent behavior with SDK types:

- `steps` supplies the updates and questions for each prompt.
- `responses` supplies typed response data, errors, observations and timing controls for specific ACP methods. Response sequences advance per Session and repeat the last entry.
- `notifications` records cancellation requests.
- `sessionIds` supplies explicit identities. The in-memory launcher otherwise uses sequential identities.
- `sessionProcess` supplies a separate scenario for App fixtures launched with a Session token; discovery keeps the default scenario.
- `relaunched` supplies the next process's scenario after a failed opening or exit. App fixtures retain that failure across private processes.

Response records inherit the prompt steps unless they supply their own steps. Held responses can use a promise or a `waitFor` gate. A `rawResult` bypasses response encoding for rejection tests.

Steps can send updates, request Permission or Elicitation, wait for cancellation, hold until closure or release, fail, or write raw frames. Gates control timing. Parallel steps send concurrent questions. A response array records answers without a custom request handler.

`permission-scenario.ts`, `response-scenarios.ts`, `update-scenarios.ts` and `feed-scenarios.ts` contain shared typed scenario facts.

## Test boundaries

`createScriptedAgentProcess` in the Engine mocks exposes the Agent through the ACP process port. Tests can observe launch requests, termination and process exit. The wire controller delivers raw frames through the same Agent for malformed-frame and coalesced-frame schedules.

`createAgentMetadata` supplies identity fixture data. Test bootstraps seed `agent_servers` Registry rows; production code performs admission, resolution and launch. There is no native fixture adapter.

App E2E launches append every ACP request and notification the Agent receives, and each answer it sends, to the request log in the test's Server directory. Writing the release marker beside that log (`request-log.ts`) releases every `wait-for-release` step, so a test decides when a held prompt answers.

App fixtures use the Registry ids `claude-acp` and `codex-acp`. Their options choose a scenario and whether the Agent starts installed. The Registry serves the scripted Agent as a compressed binary. The download port supplies files, timing and failures. The Engine, App, tRPC, Session, Feed, Writer, SQLite and Git remain real.

App sign-in scenarios share a credential store per Engine generation, Agent and Project. Restarting the fixture Engine expires that store. In-memory journeys share their supplied credential object.

Structural machine tests use symbolic actor results to walk transitions. These graph tests do not replace public integration journeys.

These fixtures prove Argo behavior for supplied scenarios. They do not prove upstream Agent compatibility, authentication, descendant isolation or resource savings. See [ADR-0018](../../docs/adr/0018-app-e2e-uses-shared-agent-fixtures.md).
