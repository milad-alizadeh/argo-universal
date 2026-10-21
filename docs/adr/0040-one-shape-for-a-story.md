# One shape for a story

A story is one state a component can be in, and a prop value earns a story only when the component branches on it (Spec 0021, owner, 2026-10-21). Storybook is the source of truth for built UI, and it was the only authored surface in this repo with no contract for what a story is. Measured on `main` at 2026-10-21, across 144 presentation files: three incompatible authoring models coexisted — a hand-built `Variations` gallery (49 files export `Variations`, 45 export `Overview`), args-per-state, and hybrids that drew the same state twice; 15 titles were shared by two or more files; title depth ran from 2 to 4 segments; and 12 files had `argTypes`.

The diagnosis is not carelessness. Four structures were missing: no enumerated prop domain, a `render:` that accepts any JSX, no file to copy, and no check that fails. This decision supplies the first three; [#1204](https://github.com/milad-alizadeh/argo-universal/issues/1204) supplies the fourth. The file to copy is `docs/agents/storybook-template.md`, and `pnpm new:story <component-path>` writes it from the component's own source.

This builds on [ADR-0021](0021-storybook-renders-views-from-props.md), which owns Storybook's data boundary: a story passes plain typed props fixtures and callback spies, and App E2E, not Storybook, proves a screen is wired.

## Rules

1. **A title derives from the path, never written freehand.** `tools/story-title.mts` holds the derivation, which `pnpm new:story` writes titles from; [#1198](https://github.com/milad-alizadeh/argo-universal/issues/1198) makes `node tools/check-story-titles.mts` compare the whole title against it instead of its group prefix.
2. **One title per file.** Storybook merges same-titled files into one sidebar node, and a story id is unique only by export name inside that node, so two files exporting `Conflict` collide silently.
3. **One depth per root.** A kit primitive is always four segments: `Design System/Primitives/<Category>/<Name>`.
4. **A prop value earns a story when the component branches on it; otherwise it is an arg.** Autodocs gives the overview the gallery used to give.
5. **A child's states are exported fixtures, and a parent imports one rather than re-specifying it inline.**
6. **`argTypes`, or args typed by a literal union, wherever `component:` is set.** A kit component takes `argTypes: kitArgTypes('<Part>')`, generated from its Contracts schema.
7. **A story file varies only props its own component declares.** This is the whole of what Argo takes from atomic design.
8. **The sidebar has a fixed order**, set by the inline `storySort` literal in `apps/storybook/.storybook/preview.tsx`.

## What earns a story

> A story is one state the component can be in, not one value a prop can take. **A prop value earns a story when the component branches on it** — when it appears as a key in the component's variants map, in a conditional, or in a platform fork. Everything else is an arg, and Controls covers it.

This is a mechanical test, not a judgement, because the branch set is already written down in the component's own source. `button-content-styles.ts` declares `variants: { variant, size, fullWidth, disabled }`; that object **is** the branch set, extended by the conditionals beside it (`props.tone === 'danger'`, `props.loading`). `label` appears in no variants map and in no conditional, so `label="Save"` and `label="Delete"` are one story with different args, never two. Where a component keys a lookup table by a prop instead — Pill's `fills` and `textTones`, both `satisfies Record<Tone, …>` — that table's keys are the branch set for `tone` in exactly the same way.

Two corollaries:

- **One story per branch, not per combination.** `disabled` is a story and `loading` is a story; `disabled + loading` is not, unless the component has a rule for the pair. Button has exactly one such rule — *"a destructive button is transparent whatever its variant"* (`button-content-styles.ts:110`) — and that pair earns its story. Nothing else does. A generator cannot see a pair rule, so a pair story is always the author's call.
- **If you want to name it after the prop, it is an arg.** `WithIcon`, `SizeSm`, `VariantSecondary` and `FullWidthTrue` are never state names; `Destructive`, `Loading`, `Compact` and `TooManyFiles` are. The one case where a prop name *is* the state name is a boolean branch, whose only branch is the prop being true: `Disabled`, `Loading`.

**What this buys, and what it does not.** It barely shrinks a primitive. Button has about 13 real branches and keeps about 13 stories; what it gains there is 13 story ids, 13 deep links and 13 diffable snapshots in place of one untyped array that nothing type-checks. The shrinking happens at parents, which have few branches of their own — a Session's Workbench column branches on whether a section is empty, not on each Check's result.

## Containment

> A parent earns a story for a child's state only when that state changes the **parent's own composition** — a row wraps, a column overflows, the empty state swaps, the layout reflows. If the parent is identical everywhere except inside the child's own box, the state belongs to the child.

and the structural rule that stops the duplicate being written in the first place:

> A child's states are **exported fixtures**. A parent story passes `args: { checks: failingChecks }`, imported from the child. A parent never re-specifies inline what "failing" means.

`session-detail-view.stories.tsx` showed what the prose version cost: `ChecksRunning`, `ChecksFailing` and `ChecksPassed` are a screen enumerating one child's enum, three screenshots that differ inside one ring. The fixtures land in [#1205](https://github.com/milad-alizadeh/argo-universal/issues/1205) and both halves are checked in [#1204](https://github.com/milad-alizadeh/argo-universal/issues/1204).

## Consequences

- The hand-built `Variations` gallery is deleted everywhere. Autodocs takes its job: a Docs page renders every story of a component in sequence above a props table generated from the component's own types, which is the same whole-component reading the gallery gave, plus a deep link, a snapshot and an args table per state.
- A primitive's story count does not fall, and in places it rises. Per-state snapshots are the point: a gallery snapshot says the grid changed, not which variant did.
- A component whose branch set is not written down anywhere — neither a variants map, nor a keyed table, nor a conditional on a declared prop — has no derivable stories, and that is a finding about the component, not about the rule. Its branches are hiding in a child it renders, and they belong to that child.
- `pnpm new:story` can read a branch but never a pair rule. The generated file is a correct floor, not a finished story file.

## Considered Options

- **Storybook autotitle instead of a literal title.** Rejected: autotitle moves story ids on every file move, and `@repo/client/mocks` and the Vitest runner both resolve stories by id.
- **"One story per meaningful state."** Rejected: "meaningful" is a judgement word, and judgement words are how the current three models grew. Three agents reading that bullet wrote a gallery, a story per arg, and both at once, and each could defend its reading.
- **A narrow exception for one hoisted gallery story per component.** Rejected: that exception is what grew the hybrids. `session-row.stories.tsx` had an `Overview` gallery *and* siblings `Compact`, `Hovered`, `CompactHovered` and `PlanSteps` — the same states drawn twice, once in the grid and once on their own.
- **Atom, molecule and organism folders.** Rejected: Brad Frost calls the sidebar labels optional, and Primer, Carbon and Chakra all stay flat under a few fixed roots. The part of atomic design worth keeping is the dependency rule — a component's stories may vary only props its own component declares — which turns "the parent repeats the child's states" from a judgement call into a mechanical failure.
- **Documenting the parent/child rule instead of exporting fixtures.** Rejected: `docs/agents/storybook.md` already said a parent gets no story for a covered child state, and the screens enumerated the child's enum anyway. Prose that nothing imports has nothing to stop the next PR; an imported fixture does.
- **Generating pair stories from the branch set.** Rejected: the product of Button's branches is 160 combinations and 159 of them are the same button. A pair earns a story only from a rule in the component, which is prose in a comment, so the author adds it.
