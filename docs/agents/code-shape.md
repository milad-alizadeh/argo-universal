# Code shape

Read this before you add a function, file or module, and when the complexity alarm fires.

## The split rule

A module earns its place when it is *deep*: its interface is much simpler than what it hides. Split along a reason to change, whatever the line count.

Before you add a function, file or module, check that it has all three:
- its own name, ideally a `GLOSSARY.md` term
- its own reason to change
- an interface much simpler than its body

Then run the deletion test: inline it into its callers in your head. If they read no worse, it is *shallow*; keep it inlined.

A helper with one caller lives in that caller's file, unexported, below the caller. A pure projection that needs table tests is the exception: it gets its own file beside its siblings, as `deriveSessionStatus` and `toSessionSnapshot` do in `apps/server/src/services/sessions/`.

## When the complexity alarm fires

Biome fails a function over cognitive complexity 25, a function with more than four parameters, and a function over 120 lines (blank lines skipped). Work these in order and stop at the first yes:

1. A missing guard clause? Return early on the edge case, so the main path loses a level of nesting.
2. A lookup table? A `switch` or `if` chain that maps one value to another becomes a `Record` checked with `satisfies Record<Union, …>`, so a missing key fails `tsc`.
3. Two levels of abstraction mixed, such as reading a payload beside deciding what it means? Move the lower level into an unexported function below, if that function passes the split rule.
4. More than four parameters? Take one object with named fields.

If none applies, the function is deep and stays long. Put its file on the debt list (the two debt overrides in the root `biome.jsonc`) with a one-line reason, and answer the alarm in the PR body. The debt list shrinks: remove an entry when its function drops under the cap. Answer the alarm in code or on the debt list; `tools/check-comments.mts` fails a suppression of it.

These are deep and stay long: the Session machine, the Agent machine, the Claude event converter, the Codex dispatcher switch, `applyFeedChange`, `writeJobs` and machine-log.

## Review questions

Ask these of your diff before you finish:
- Interface: which members does each caller use? A caller that uses one export of many points at a split.
- Failure: who owns the failure of each `invoke`, `spawn`, subscription, fan-out and locator? Name the owner in the code.
- Waits: does every wait end on a named `after` delay or an abort signal?
- Unions: does each `switch` over a discriminated union end with `const unhandled: never = value`?
- One home: is each limit, name and mapping written once and imported everywhere else?
- Change together: does code that changes together live together, with dependencies pointing one way?
- Injection: are the clock and the id generator the only injected values?
- Casts: is each `as` inside XState `setup`, on a vendor type after an envelope check, or on a correlated protocol response, with a one-line comment that says why?
- Ids: is a branded type kept to ids that can be swapped by mistake?
- Scope: does every option, parameter and abstraction have a caller today? Delete code nothing reaches, and put tidy-ups in their own PR.
