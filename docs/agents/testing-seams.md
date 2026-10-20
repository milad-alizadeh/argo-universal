# Testing seams

This maps Argo's test boundaries to [Prickles TS4, TS6 and TS7](prickles/prickles-testing.md). [ADR-0016](../adr/0016-the-prickles-canon-is-the-coding-standard.md) records their application; [ADR-0018](../adr/0018-app-e2e-uses-shared-agent-fixtures.md) records the external Agent and Registry fixture exception.

**Fixtures describe scenarios; minimal shared boundary code delivers them; production code performs the behaviour under test.** Test setup may start and clean up the real system, never recreate its business logic.

## Test kinds

Argo has four kinds of test. Owned code is never faked. External boundaries use the fixtures described below. The scripted Agent, `createScriptedAgent(scenario)` on the official ACP SDK, is the one fake Agent at every level; a scenario is a typed list of steps, and shared named scenarios cover reply, image, cancel-wait, Permission request, Elicitation, configuration and write pressure.

| Kind | Runs for real | Replaced |
|---|---|---|
| Unit | Nothing outside the code under test: a pure function, an ACP translator, or a view with its required context | No database, network, clock, filesystem or environment; inputs are typed fixtures and props |
| Module integration | One module with its own real infrastructure: storage on a real database file, saved Feed rows, the real Agent process, catalog sync, Supervisor fork and restart | Only the Agent, as the scripted Agent, and the Registry, as fixture data, where the module reaches them |
| Engine journey | The composed Engine through tRPC, with every module, the Writer, SQLite and Git | The Agent, as the scripted Agent over in-memory streams, and the Registry, as fixture data |
| E2E | The App from its UI (Playwright and Gherkin against the Expo web export), tRPC, the Engine and storage | The Agent, as the scripted Agent in a real process launched per ADR-0018, and the Registry, as fixture data |

A `*.integration.test.ts` file runs something real; the name tells its cost. `tools/check-test-suffix.mts`, part of `pnpm quality`, fails a `*.test` file that opens SQLite, git, the filesystem, the network or a child process, directly or through its mock modules. View test stories run in Vitest browser mode and are unit tests of a view: they render it from props with no Server, tRPC or data hook (owner, 2026-10-10).

## Choose the public surface

Choose the smallest surface used by real callers that proves the required behaviour; add a broader test when composition, transport or lifecycle is itself the behaviour. The table lists test entry points, not a required suite per layer: a file or package does not earn a suite merely by existing.

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
| Plugin behaviour | The real plugin host and a worker on the Plugin's own folder, through the Plugin kit's test harness ([ADR-0025](../adr/0025-plugins-run-on-the-server-and-draw-argo-components.md)) | Fixture executables on `PATH`, such as `gh`; the Plugin's tree and the results of its events. Engine journeys and App E2E use fixture Plugins, never shipped or example ones |
| App end-to-end (E2E) | The actual App, tRPC, Engine, Session, Feed, Writer and SQLite | Shared scripted Agent scenarios and the Registry fixture; user-visible outcomes |
| ACP boundary | The real SDK and Argo readers or mapping under test | Official typed request/response fixtures, malformed wire fixtures for rejection tests, and the scripted Agent where transport is exercised |
| Process ownership | The real process launcher and OS lifecycle | The scripted Agent as a real process; startup, stdio, exit and cleanup observations |
| Native App behaviour | The actual shared UI and native modules on a simulator or device | The same external fixtures; native interaction and rendering observations |

A direct Engine bootstrap does not prove Supervisor startup, and in-process procedure calls do not prove HTTP serialization, subscription transport or Connection disconnect handling. Cover those through the real surface when they are the claim.

Every XState machine has model-based tests from `xstate/graph` that walk all of its transitions. Symbolic actor completions can drive traversal, but traversal proves structure only; persistence, ordering, resource ownership and cleanup need public integration behaviour with their real dependencies.

## Fixtures and boundary code

Feature modules use `utils/` for pure functions, `stores/` for client contexts and preferences, `api/` for Server calls, and `types/` for shared types.
Tests and colocated mocks stay beside their modules when these modules move. Test seams and behaviour stay the same.

A fixture is data: input, response, update, file content, initial row or expected result. A mock supplies external behaviour, such as delivering those responses, holding a reply or closing a connection. A bootstrap starts and cleans up real code. These roles need no separate folders or new framework. Test assets live outside `src/`, in `mocks/`, `e2e/<flow>/` and `tools/`; call them mocks.

Prefer a fixture and a direct public call. Reuse an existing boundary implementation before adding another. Keep helpers local until actual reuse earns extraction under F3/A2. A wrapper earns its place through required context, realistic layout or shared setup; a feature-specific component that only prepares fixtures and forwards props becomes explicit setup beside the actual component's story.

Boundary code may coordinate external timing and failures, never implement Session transitions, Feed projection, catalog sync, Writer acknowledgements or another copy of product rules; integration tests keep those owned collaborators real. In unit tests, use TS7's isolated boundary instead of mocking private collaborators. Needing several mocks is a reason to reconsider the unit's interface.

For Feed presentation, follow [ADR-0021](../adr/0021-storybook-renders-views-from-props.md): build Feed props from recordings through the real converter and render the actual Feed. A presentation test proves rendering; a projection test calls the public projection with independent expectations; an Engine test proves an ACP update becomes durable content; broader App coverage proves the composition when that is the requirement.

## Review each test's claim

A test's name, setup and assertions make four facts clear: the public surface, which dependencies run for real, which boundary is replaced, and the observable outcome. Record any remaining limitation in the PR evidence.

For changes to tests, fixtures, mocks or wrappers, review coverage against existing suites, including tests outside the diff:

- Compare every added or changed scenario with coverage of the same public behaviour, and identify its independent observable claim or failure path. Group suites by behaviour within the repository's caps, not by implementation file. Consolidate equivalent claims into an existing behaviour suite or parameterise repeated scenarios; helper extraction alone does not remove duplicate coverage.
- Repeated coverage at another layer earns its place only by a distinct composition, transport or lifecycle claim; name it. Keep the mandatory graph traversal alongside integration claims.
- For removed or consolidated cases, trace every unique assertion and failure path to retained coverage, including parameterised rows; test counts and passing results do not prove it.
- For every new or changed mock, name its controlled boundary and scenario; for a wrapper, its required context, realistic layout or shared setup. Check existing boundary code for reuse first, and that integration seams keep owned collaborators real.

Report compact PR evidence with test or source references, even with no findings: suites compared, distinct claims, boundary decisions and original-to-retained coverage for removals. Ordinary test names and references suffice; add no per-test metadata wrapper, comment template or framework.

Apply TS3 and TS8: parameterise repeated scenarios and keep one behaviour per test. Expected results come from the contract and fixture facts, independently of the production calculation under test; calling it for both actual and expected proves nothing. Await observable completion; reset storage and clean up processes, actors, timers and subscriptions between runs.

UI assertions prove behaviour, content and accessibility. Appearance belongs to Paper and is reviewed in the shared Storybook and native previews: tests never assert font sizes, line heights, weights, colours, backgrounds, borders, shadows, spacing, radii, fixed widths and heights, design tokens, CSS classes or computed style values. When a design change breaks such an assertion, delete it. A geometry or style observation is justified only by a functional outcome a user would see, such as a control remaining visible, reachable and unobscured, content reflowing without overflow, clipping or loss, or scrolling reaching its destination. Assert that outcome, not exact styling or equality with a production style value.

Copy belongs to Paper and the source file, as appearance does. A test that repeats a production sentence is a change-detector: it proves only that the constant equals itself, and every copy edit then touches the test too. Assert text only where a rule produces it, such as an inserted value, a choice between variants, pluralisation, formatting or Markdown rendering, and match only the part the rule controls: the inserted value, the word that tells variants apart, or a role and short accessible name. Find controls by role and name; never pin a whole description, empty-state line, error message or toast. Contract values, such as error codes, enum and wire values, ids, paths and protocol strings, are not copy. Tests and stories for kit primitives use placeholder text, such as `Title` or `Description`, never feature copy. When a copy change breaks a test, loosen or delete that assertion; a one-line copy change touches only the file that owns the copy.

The scripted Agent and typed fixtures prove Argo's handling of the supplied scenarios, not compatibility with an actual upstream Agent, authentication, descendant isolation or resource savings. State those limits as ADR-0018 specifies.

For Registry Agent launch under Spec 0014 #721, the external download and npm ports supply only files, timing and failures. App journeys keep tRPC, Engine, SQLite, file materialization and launch real. The Registry fixture serves the scripted Agent as a compressed binary. Holding the download makes the first-launch `Loading…` state observable.

Bootstraps seed `agent_servers` Registry rows. Get started fixtures can begin without Projects; production startup registers their fixture Project on restart. Test steps observe the App and public procedures. The fixtures do not implement selection, admission, persistence or installation status.

## Plugin boundaries

Plugin behaviour belongs in the Plugin's own folder. `@argo/plugin-kit/testing` exports `startPluginTest`. It starts the production loader, Plugin host, worker and Plugin SQLite. Tests observe live trees, find text and dispatch checked events. Slot views receive the production Slot context.

The harness reuses the Engine's in-memory fixture for the external OS Keychain. Tests cannot read or change the user's secrets.

The harness accepts Project identities as fixture inputs to `argo.projects.list`. Its `path` option prepends executable fixture folders for that runtime's external commands. It does not change the test process environment. The Issue tracker uses a fixture `gh` on PATH. Its journeys run with the other package tests in CI.

Engine journeys use fixture Plugins in `packages/engine/mocks/`. Each fixture exercises a core contract: keyed patches, dispatch, Connections, late subscribers, Slots or Capabilities. Shared wire fixtures describe those scenarios.

App E2E loads `e2e/mocks/plugins/`. These scenarios prove navigation, page events, Slot composition and failure handling. Neither layer loads the shipped `plugins/` folder. `plugins/examples/hello` remains a demo. Changes to the demo or the Issue tracker do not change Engine or App expectations.

The harness proves Plugin behaviour through the real runtime and supplied external fixtures. It does not prove App rendering, HTTP transport, GitHub authentication or upstream GitHub compatibility.
