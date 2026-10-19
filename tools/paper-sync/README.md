# Paper component sync

Edit a master in Paper, then run `check` and `apply`. Do not repair copies by hand.

```sh
pnpm paper:sync scan
pnpm paper:sync enroll
pnpm paper:sync report
pnpm paper:sync check
pnpm paper:sync apply
pnpm paper:sync verify
```

Keep Paper Desktop open with its MCP server enabled on port 29979. Run commands from the repository root.

## Discovery and enrollment

`config.mts` contains the nine canonical files. The legacy Argo file is excluded.
Masters live inside `Components / <CodeName>` cards. Names follow `CodeName[ (ios|android|phone)] / State`; single-state masters can omit the state.
Card qualifiers identify documentation sections, but do not change the component name.
Nested copies belong to their own master family. Duplicate master names remain unresolved, including duplicates inside one file.

Copies must use an exact master name. Enrollment matches text slots by layer name, such as `Title` and `Detail`.
Repeated slot names within one component prevent enrollment. Text inside a nested copy belongs to that nested copy.
Copies can override text, hide layers, or select another named state. Other differences are drift.

The registry lives in `.paper-sync/registry.json`. It stores links, slot overrides and each copy's location; Paper remains the design source.
Use `--registry=path` to select a separate registry for temporary clone tests.

## Sync behavior

Sync transfers structure, child order, styles, token references and static SVG artwork.
Copies retain their outer placement, width, flex placement and existing visibility. Named text slots retain their node IDs through wrapper changes.
Text that differs during enrollment becomes an override. Later local text edits become overrides on the next successful apply.
To resume inheritance, remove the slot from `textOverrides`, leaving `lastText` unchanged.

Nested families sync inside-out. Outer plans treat nested copies as separate owners and preserve their named state and overrides.
Cycles, ambiguous slots, unsupported node types and unsupported SVG references produce errors.
Missing tokens, different token values and ignored styles stop apply. Tokens stay manual.
There is no 500-node component limit. Reads use small tree summaries, node batches and SVG-only exports; no full-file JSX export is used.

## Scans, reports and moves

```sh
pnpm paper:sync scan --file=01M4RJRP22R2R2JE20RWDNXR0Q
pnpm paper:sync enroll --rebind
```

Scan caches are separate for each page. Paper currently exposes no page revision or modification timestamp.
A scan therefore rereads every page in the selected file. It records elapsed time and MCP calls per page.
A scan without `--file` reads all nine files.

`report` reads the saved inventory and registry without contacting Paper. It writes Markdown and JSON under `.paper-sync/<timestamp>/`.
The report lists each master's copies by file, page, board and flow, plus unenrolled matches, duplicate names and masters without copies.

A move within a file keeps node IDs. A cross-file copy changes them.
If a registered ID disappears, enrollment offers same-name, same-structure candidates in the same page, board and flow.
`enroll --rebind` accepts only a unique candidate and retains its overrides. It never guesses between candidates.
Rescan the affected files before enrollment or reporting.

## Checks and recovery

`check` and `verify` only read Paper. They produce per-copy drift counts in `plan.json`, snapshots in `details.json`, and errors in `errors.json`.
Apply requires a clean preflight. It checks for concurrent edits, updates one copy at a time, and checks the result again.
Each apply saves `before.json` and updates the registry and `progress.json` after each verified copy.

Paper has no transaction for these operations. An error can leave an incomplete apply.
Inspect the report before retrying. Recovery is manual; the tool never performs automatic rollback.
Avoid concurrent edits or simultaneous sync processes.

## Verification

```sh
pnpm --filter @repo/tools exec vitest run paper-sync
pnpm --filter @repo/tools exec tsc --noEmit
```

Unit tests cover discovery, slot preservation, nested ordering, rebinding, structural patches and transfer rejection paths.
Live rollout evidence belongs in the PR body. Apply tests use temporary clones, which are removed after the test.
