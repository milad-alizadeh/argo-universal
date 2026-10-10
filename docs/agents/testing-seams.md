# Testing seams

This maps Argo's test boundaries to [Prickles TS4, TS6 and TS7](prickles/prickles-testing.md). [ADR-0016](../adr/0016-the-prickles-canon-is-the-coding-standard.md) records their application; [ADR-0018](../adr/0018-app-e2e-uses-shared-agent-fixtures.md) records the external Agent and Registry fixture exception.

**Fixtures describe scenarios; minimal shared boundary code delivers them; production code performs the behaviour under test.** Test setup may start and clean up the real system, but must not recreate its business logic.

## Test kinds

Argo has four kinds of test. Owned code is never faked: only the Agent process and the Registry are replaced. The scripted Agent, `createScriptedAgent(scenario)` on the official ACP SDK, is the one fake Agent at every level; a scenario is a typed list of steps, and shared named scenarios cover reply, image, cancel-wait, Permission request, Elicitation, configuration and write pressure.

| Kind | Runs for real | Replaced |
|---|---|---|
| Unit | Nothing outside the code under test: a pure function, an ACP translator, or a view with its required context | No database, network, clock, filesystem or environment; inputs are typed fixtures and props |
| Module integration | One module with its own real infrastructure: storage on a real database file, saved Feed rows, the real Agent process, catalog sync, Supervisor fork and restart | Only the Agent, as the scripted Agent, and the Registry, as fixture data, where the module reaches them |
| Engine journey | The composed Engine through tRPC, with every module, the Writer, SQLite and Git | The Agent, as the scripted Agent over in-memory streams, and the Registry, as fixture data |
| E2E | The App from its UI (Playwright and Gherkin against the Expo web export), tRPC, the Engine and storage | The Agent, as the scripted Agent in a real process launched per ADR-0018, and the Registry, as fixture data |

A file named `*.integration.test.ts` runs something real; the name tells you its cost. View test stories run in Vitest browser mode and are unit tests of a view: they render it from props with no Server, tRPC or data hook.

## Choose the public surface

Choose the smallest surface used by real callers that proves the required behaviour. Add a broader test when composition, transport or lifecycle is itself the behaviour. The table lists test entry points, not a required suite per layer. A file or package does not earn a separate suite merely by existing.

| Surface | Runs for real | Controlled inputs and observations |
|---|---|---|
| Pure mapping, projection or validation | The public function | Typed input fixtures and independent expected outputs or rejections |
| Client component | The actual component, required context and user interaction | Props fixtures; observed callbacks and rendered results |
| Client view in Storybook | The actual view, required context and user interaction | Props fixtures for its normal, loading, empty, error and disconnected states, and callback spies; visible outcomes |
| Client screen wiring | Proven only by App E2E: the actual screen, its data hooks, the Connection and the Engine | Real journeys with the scripted Agent and Registry fixture; user-visible outcomes |
| Engine commands and tRPC procedures | The Engine composition, machines, Writer, migrations, SQLite and Git used by that flow | The scripted Agent in memory and the Registry fixture; public responses, subscriptions, durable rows and outgoing boundary requests |
| Database behaviour | The Writer and migrations against isolated real SQLite | Initial rows and submitted operations; committed results, rollback, ordering and restart behaviour |
| Git and filesystem behaviour | Real Git and filesystem operations in temporary directories | Initial files and repositories; resulting files, Checkouts and cleanup |
| Server startup and transport | The real Server process, HTTP/subscriptions and Engine | Isolated configuration and storage; external services controlled at their ports |
| App end-to-end (E2E) | The actual App, tRPC, Engine, Session, Feed, Writer and SQLite | Shared scripted Agent scenarios and the Registry fixture; user-visible outcomes |
| ACP boundary | The real SDK and Argo readers or mapping under test | Official typed request/response fixtures, malformed wire fixtures for rejection tests, and the scripted Agent where transport is exercised |
| Process ownership | The real process launcher and OS lifecycle | The scripted Agent as a real process; startup, stdio, exit and cleanup observations |
| Native App behaviour | The actual shared UI and native modules on a simulator or device | The same external fixtures; native interaction and rendering observations |

App end-to-end (E2E) tests drive the App and observe user-visible outcomes across the real Server flow above. Running them through a direct Engine bootstrap does not prove Supervisor startup. Procedure calls in-process do not prove HTTP serialization, subscription transport or connection disconnect handling. Cover those through the corresponding real surface when they are the claim.

Every XState machine retains `xstate/graph` coverage of all transitions. Symbolic actor completions can drive graph traversal, but traversal proves structure only. Persistence, ordering, resource ownership and cleanup require public integration behaviour with their real dependencies.

## Fixtures and boundary code

A fixture is data: input, response, update, file content, initial row or expected result. A mock supplies external behaviour, such as delivering those responses, holding a reply or closing a connection. A bootstrap starts and cleans up real code. These roles do not require separate folders or a new framework. Test assets remain outside `src/` in the existing `mocks/`, `e2e/<flow>/` and `tools/` locations; keep the repository's mock naming convention.

Prefer a fixture and a direct public call. Reuse an existing boundary implementation before adding another. Keep helpers local until actual reuse earns extraction under F3/A2. Wrappers must earn their existence through required context, realistic layout or shared setup; a feature-specific component that only prepares fixtures and forwards props should become explicit setup beside the actual component's story.

Boundary code may coordinate external timing and failures. It must not implement Session transitions, Feed projection, catalog sync, Writer acknowledgements or another copy of product rules. Integration tests keep those owned collaborators real. In unit tests, use TS7's isolated boundary instead of mocking private collaborators. Multiple required mocks are a reason to reconsider the unit's interface.

For Feed presentation, follow [ADR-0021](../adr/0021-storybook-renders-views-from-props.md): build Feed props from recordings through the real converter and render the actual Feed. A presentation test proves rendering; a projection test calls the public projection with independent expectations; an Engine test proves an ACP update becomes durable content. Broader App coverage proves the composition when that composition is the requirement.

## Review each test's claim

The test name, setup and assertions must make these four facts clear: the public surface, which dependencies run for real, which boundary is replaced, and the observable outcome. Record any remaining limitation in the PR evidence.

For changes to tests, fixtures, mocks or wrappers, review coverage against existing suites, including relevant tests outside the diff:

- Compare every added or changed scenario with coverage of the same public behaviour. Identify its independent observable claim or failure path. Group suites by behaviour within the repository's caps, rather than by implementation file. Consolidate equivalent claims into an existing behaviour suite or parameterise repeated scenarios; helper extraction alone does not remove duplicate coverage.
- Repeated coverage at another layer earns its place when it proves a distinct composition, transport or lifecycle claim. Name that distinction; equivalent assertions through another entry point alone do not justify it. Preserve mandatory graph traversal alongside the integration claims described above.
- For removed or consolidated cases, trace every unique assertion and failure path to retained coverage, including parameterised rows. Test counts and passing results alone do not prove coverage was preserved.
- Apply the fixture and boundary rules above to every new or changed mock and wrapper. Identify the controlled boundary and scenario for a mock, or the required context, realistic layout or shared setup for a wrapper. Check existing boundary code for reuse first and verify that integration seams keep owned collaborators real.

Report compact PR evidence with test or source references: suites compared, distinct claims, boundary decisions and original-to-retained coverage for removals. Include this evidence when there are no findings. Ordinary test names and references suffice; no per-test metadata wrapper, comment template or new framework is required.

Apply TS3 and TS8: parameterise repeated scenarios and keep one behaviour per test. Expected results come from the contract and fixture facts, independently of the production calculation being checked. Calling that calculation to generate both actual and expected results proves nothing. Await observable completion; reset storage and clean up processes, actors, timers and subscriptions between runs.

UI assertions prove behaviour, content and accessibility. Review appearance in the shared Storybook and native previews. Tests must not freeze font sizes, colours, backgrounds, borders, shadows, padding, design tokens, CSS classes or computed style values. Geometry or style observations are justified only when they prove a functional outcome, such as a control remaining visible, reachable and unobscured, content reflowing without loss, or scrolling reaching its destination. Assert that outcome rather than exact styling or equality with a production style value.

The scripted Agent and typed fixtures prove Argo's handling of the supplied scenarios. They do not prove compatibility with an actual upstream Agent, authentication, descendant isolation or resource savings. State those limits as specified in ADR-0018.
