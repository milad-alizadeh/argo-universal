# Prickles canon · Testing pillar · v2.0

The 8 Testing tenets of the Prickles canon. Apply them whenever you write or review code in this repository. Each tenet's full entry, with its evidence, is on https://prickles.org.

## Prickles TS1: Living Documentation

If a behaviour matters, write a test that proves it. The test is the spec. Prose docs are a paraphrase.

When the code changes, the test fails or it doesn't. Prose can drift in silence. A test in CI cannot. The first signal is a red build, not a stale paragraph.

Name the test after the behaviour rather than the method. `it('rejects an order whose total is negative')` reads as a sentence; `it('throws on negative total')` reads as a regex.

Where stakeholders read the spec, write Gherkin. Where developers read the spec, write Vitest. Both are living documentation. Neither is the comment that rotted.

## Prickles TS2: Specification by Example

Write the scenario in the language a stakeholder uses. `When I submit the form` is the spec; `When I click the third button` is the implementation leaking through.

Declarative steps describe behaviour. Imperative steps describe interaction. The first survives a redesign. The second breaks on every CSS edit.

The Given/When/Then is the conversation, then the documentation, then the test. If it can't be read aloud at a Three Amigos meeting, rewrite it.

One scenario, one behaviour. If the scenario uses `and` more than twice, split it.

## Prickles TS3: Parameterised Scenarios

One step definition with `{string}` placeholders replaces five near-duplicate scenarios. The step definition is the noun. The parameter is the cell in the row.

Use Scenario Outlines with Examples tables for the in-Gherkin form. The header is the schema. Each row is a scenario. The table is the documentation.

Reach for property-based testing when the table would be infinite. QuickCheck, Hypothesis, fast-check generate the rows you'd never have written by hand.

Two is the trigger. The second near-duplicate is the moment to parameterise. Don't wait for a third.

## Prickles TS4: Real-Dependency E2E

E2E tests touch the dependencies themselves the production system touches. Real database, real message queue, real API surface: sealed inside a hermetic boundary, never replaced.

Mocks belong below the E2E line. Unit tests mock everything outside the unit; E2E tests mock nothing inside the system under test. The two layers do different jobs.

Determinism comes from rebuilding state, not from replacing the dependency. Seed the database fresh per run. Bring up the queue from a known commit. Pin the upstream version.

If a dependency cannot be run hermetically (third-party SaaS, payment processor sandbox, real card-present terminal), wrap it in a contract test plus a recorded interaction. Reach for in-process replacements only when the third party itself sells one.

## Prickles TS5: Structural Assertions

Locate by structure, not content. Reach for `getByRole` first, fall back to `getByLabelText`, and only then `getByText`. `getByTestId` is the last-resort escape hatch, not the default.

Discover dynamic pages from the sitemap. Tests for tenet pages, versus pages, and any other data-driven URL fetch the live `/sitemap.xml` and iterate every entry. The fixture file containing slugs is a smell.

Hardcode static-page paths. Compliance, marketing, contact, and feature-deep-link URLs are part of the product contract. Their slugs appear in external collateral. The test should fail if the route disappears.

Decide once: a slug is hardcoded only if marketing, legal, or external links reference it directly. Otherwise discover it.

## Prickles TS6: Behaviour Testing

Test through the public surface only. The signature, the rendered output, the response payload: anything a caller or user can see. Internal helpers and private collaborators stay invisible.

Render and query like a user. Locate by role, label, or text: the same tree a screen reader walks. Implementation-detail selectors (CSS, data-testid as default, DOM traversal) are anti-patterns.

If the test breaks because an internal name changed, the test was wrong. If it breaks because the user-visible behaviour changed, the test was right.

Don't reach into private state to verify. Drive the public action. Assert the public outcome.

## Prickles TS7: Test Isolation

The unit is what you wrote. Everything outside the unit is replaced or trusted: no DB, no network, no clock, no filesystem, no env.

Mock at the edges, never inside. Stubs and fakes belong at ports: adapters that cross the process boundary. Helpers inside the same module never get mocked. Refactor instead.

Trust the framework. React's renderer, the ORM's query builder, the HTTP client's parser: these have their own tests. Don't write yours.

If a unit needs five mocks to test, the unit is doing five things. Extract until the mocks become unnecessary.

## Prickles TS8: One Concept Per Test

One concept per test. The test name is the spec for the test. If the name needs an `and`, split the test.

One Act per test. The Arrange-Act-Assert shape has exactly one Act. Multiple Acts hide multiple causes behind a single failure.

One assertion focus per test. Multiple expects are fine when they describe one outcome from different angles. Not when they describe two outcomes that should be two tests.

If a failure message can't tell you which behaviour broke, the test was wrong even when it was green.
