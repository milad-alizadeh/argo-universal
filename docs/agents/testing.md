# Testing

Read this before you write or change a test. Test stories also follow `docs/agents/storybook.md`.

## A test proves the spec

- The spec says what; the test proves it. Take each expectation from the spec or from the data under test, never from what the code does today.
- Test through the highest seam that already reaches the behaviour:
  - a user flow: Playwright on the web build (ADR-0011)
  - Server behaviour a browser cannot reach: the composition test
  - a machine: its xstate/graph model test
  - a pure function: a table test beside it
  - a component: play functions in `*.test.stories.tsx`; plain Vitest tests non-UI code only
- Assert both ways: what must be there, and what must not.
- Keep every assertion unconditional: an `if (found)` around `expect` switches the test off when it matters. Machine model tests and capability-parity loops are the exception.
- Run on both Agents, or name the skip in the title with `it.skipIf`.
- A fix PR quotes its new test failing on `main` and passing after the change, in the PR body.

## Names

- A title states behaviour in `GLOSSARY.md` terms: what the user or caller gets, not the control clicked or the function called. "Stopping a Turn shows one Notice", not "calls onStop".
- Name each step of a Playwright journey with `test.step`.
- "and" in a title is a prompt to split, not a ban. An "and" that joins two outcomes means two tests; an "and" that lists facets of one outcome stays.

## Locators

Use the first that fits:
1. `getByRole`, with the accessible name
2. `getByLabel` in Playwright, `getByLabelText` in play functions
3. `getByText`
4. `getByTestId`, only where a React Native view has no fitting role or label
5. `querySelector`, only for the design checks `docs/agents/storybook.md` asks for: an indicator inside the viewport, movement in an animation, overlapping text, SVG geometry

## Real or fake

- Managed dependencies are real: SQLite in a temporary file, temporary folders, real git.
- Unmanaged dependencies are faked at their port: the Agent CLI through the mock CLIs in `mocks/cli/<agent>/`, the network at its port, an actor through `machine.provide`, anything else through a parameter.
- Beyond those ports, inject only the clock and the id generator.
- A unit that needs five fakes does five things: test it one seam higher, or split it.
- `apps/server` has no test-only branches.

## Machines

- Walk every transition with xstate/graph.
- The state-key exception: a test checks a machine's state names only in its model test; every other test asserts what the user or caller observes. The model test's `stateKey` and `eventKey` name states and events because xstate/graph walks its paths over them. Keep each file's keys as they are: they encode what that machine counts as the same state.

## Tables and repetition

- `it.each` is for rows that differ only in data. When the body would branch on a row, write separate tests.
- Tests are descriptive: repeat the setup a reader needs in each test instead of hoisting it at the second copy. Hoisting shared code is for production code only.
