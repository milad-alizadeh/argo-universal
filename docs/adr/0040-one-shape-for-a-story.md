# One shape for a story

Storybook had no contract for what a story is. Three authoring models grew side by side — a hand-built gallery behind one story, one story per state, and hybrids that drew states twice — and each new file was a fresh guess. Spec 0021 (#1193) gives a story one shape, derived from where the component lives and from what the component branches on, so an agent can write one without inventing a value and a reviewer can deep-link to any single state. It builds on [ADR-0021](0021-storybook-renders-views-from-props.md), which owns Storybook's data boundary and is unchanged.

The shape is shown in [`docs/agents/storybook-template.md`](../agents/storybook-template.md) and written by `pnpm new:story <component-path>`.

## Decision

1. **A title is derived from the path, never written freehand.** The folder gives the root and the category, the file gives the name. The title stays a literal in the file, checked against the path.
2. **One title per file.** No two files share a sidebar node, so a story id is never decided by which file Storybook loaded first.
3. **One depth per root.** Every kit primitive is `Design System/Primitives/<Category>/<Name>`, four segments, with no primitive skipping its category.
4. **A prop value earns a story when the component branches on it; otherwise it is an arg.** A story is one state the component can be in, not one value a prop can take. A component branches on a value when the value is a key in its `cva` or `tailwind-variants` map, a case in a conditional, or a platform fork. Everything else is an arg, and Controls covers it. The Docs page, which renders every story of a component above its props table, is the overview; there is no hand-built gallery.
   - **One story per branch, not per combination.** `disabled` is a story and `loading` is a story; `disabled` with `loading` is not, unless the component has a rule for the pair. Button has one such rule — a destructive button is transparent whatever its variant — and that pair earns its story. Nothing else does.
   - **If you would name it after the prop, it is an arg.** `WithIcon`, `SizeSm`, `VariantSecondary` and `FullWidthTrue` are not states. `Destructive`, `Loading`, `Compact` and `TooManyFiles` are.
   - **It barely shrinks a primitive.** Button has about thirteen branches and keeps about thirteen stories; what it gains is thirteen story ids and thirteen diffable snapshots in place of one untyped array. The shrinking happens at parents, which have few branches of their own.
5. **A child's states are exported fixtures, and a parent imports them.** A child exports each of its states as a named props fixture beside its story file. A parent story passes `args: { check: failingCheck }`, imported from the child, and never re-specifies inline what "failing" means. A parent earns a story for a child's state only when that state changes the parent's own composition — a row wraps, a column overflows, the empty state swaps, the layout reflows. If the parent is identical everywhere except inside the child's own box, the state belongs to the child.
6. **`argTypes`, or args typed by a literal union, wherever `component:` is set.** A kit component takes `kitArgTypes('<Part>')` from its Contracts schema; any other component lists the values its props can take. This is the enumerated prop domain an author picks values from.
7. **A story file varies only props its own component declares.** A parent that wants a child in another state passes the child's fixture through its own prop; it does not reach into the child. This is the whole of what the repo takes from atomic design.
8. **The sidebar has a fixed order,** set once in Storybook's preview, so the tree does not reshuffle when a file lands.

## Considered options

- **Storybook autotitle,** deriving the title at build time and deleting it from the file. Rejected: autotitle moves a story's id on every file move, and `@repo/client/mocks` and the Vitest runner resolve stories by id. A literal title checked against the path keeps ids stable and still cannot drift.
- **"One story per meaningful state."** Rejected: "meaningful" is a judgement word, and judgement is how the three models grew. Branching on a value is decidable from the component's own source; `pnpm new:story` reads it.
- **Keep one hoisted gallery story as a narrow exception.** Rejected: that exception is what grew the hybrid files, which draw a state once in the grid and again on its own. Autodocs gives the same whole-component reading with an id, a snapshot and an args table per state.
- **Let a parent enumerate a child's states when it is convenient.** Rejected: a screen with `ChecksRunning`, `ChecksFailing` and `ChecksPassed` re-draws one child's enum three times, and its definition of each state drifts from the child's. An imported fixture has one definition.
- **Atom, molecule and organism folders.** Rejected: Brad Frost calls the split a mental model and its labels optional, and Primer, Carbon and Chakra stay flat under a few fixed roots. The dependency rule (7) is the part worth keeping.
- **Order the sidebar by glob.** Rejected: glob order changes whenever a file lands, so a reader's place in the tree moves under them.

## Consequences

- `pnpm new:story` writes a story file from the component's folder: the derived title, `component:`, `argTypes`, required args as placeholders, and one story per value in its variants maps, named for the value. Props with no branch stay meta args. It does not invent combinations: a pair story is the author's call, and so is a branch it cannot see, such as a conditional or a lookup table keyed by a prop.
- Galleries are replaced by per-state stories, and checks in `pnpm verify` enforce the titles, the shape and the parent rule, in the order the spec's tickets give.
