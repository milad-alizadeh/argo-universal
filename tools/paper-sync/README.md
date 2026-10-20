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
Copies can override text, swap icons, hide layers, or select another named state. Other differences are drift.

## Excluding WIP areas

`excludedAreas` in `config.mts` lists Paper areas that paper-sync leaves alone. Each entry names the file and a `reason`, and covers one of:

- a whole file: `{ file: 'Atlas', fileId, reason: 'WIP' }`
- a page: add `page: { name, id }`
- a board: add `board: { name, id }`; everything inside the board is excluded too

Atlas and Voice are excluded as WIP. Scan does not read excluded areas, so a master inside one is not a master and its copies are neither enrolled nor listed as unenrolled.
Check and apply drop registry entries in excluded files. In a file with an excluded page or board, they only touch entries found in the latest scan, so run `scan` and `enroll` after adding one.
`--file=` with an excluded file stops with an error. Every command prints one `Skipped:` line, such as `Skipped: Atlas (WIP), Voice (WIP)`, and the report repeats it.

## Icon slots

An icon slot is an SVG layer named `Icon`, `Icon / <glyph>` or `Icon (ios|android|phone) / <glyph>`.
Its slot name is `Icon` when it sits directly in the component, otherwise `<parent layer> > Icon`, such as `Language > Icon`.
Enrollment matches a copy's icon to the master's slot by slot name, so `Icon / trash` in a copy fills the master's `Icon / more` slot.
Two icon slots with the same slot name in one master block enrollment; rename one parent to tell them apart.

The glyph belongs to the copy: its SVG artwork and the name after `Icon / `. `check` does not count a different glyph as drift, and `apply` never redraws an icon slot.
The icon's own styles still sync: size, colour token such as `fill`, and placement are drift, and `apply` sets them on the copy's icon.
To change a copy's glyph, edit that copy. SVG layers with other names keep the old rule: their artwork comes from the master.

The registry lives in `.paper-sync/registry.json`. It stores links, slot overrides and each copy's location; Paper remains the design source.
Use `--registry=path` to select a separate registry for temporary clone tests.

## Sync behavior

Sync transfers structure, child order, styles, token references and static SVG artwork.
Copies retain their outer placement, width, height, flex placement and existing visibility. Named text slots retain their node IDs through wrapper changes.
Text that differs during enrollment becomes an override. Later local text edits become overrides on the next successful apply.
To resume inheritance, remove the slot from `textOverrides`, leaving `lastText` unchanged.

Nested families sync inside-out. Outer plans treat nested copies as separate owners and preserve their named state and overrides.
Cycles, ambiguous slots, unsupported node types and unsupported SVG references produce errors.
A duplicate nested master name blocks enrollment of its container. Check and apply use the latest saved scan to reject duplicate masters.
An unmatched hidden layer or nested copy stops structural deletion, so its overrides cannot be discarded.
New hidden layers, including SVGs inside new nested copies, are rejected before insertion.
Missing tokens, different token values and ignored styles stop apply. Tokens stay manual.
There is no 500-node component limit. Reads use small tree summaries, node batches and SVG-only exports; no full-file JSX export is used.

## Scans, reports and moves

```sh
pnpm paper:sync scan --file=01M4RJRP22R2R2JE20RWDNXR0Q
pnpm paper:sync enroll --rebind
```

Scan caches are separate for each page. Paper currently exposes no page revision or modification timestamp.
A scan therefore rereads every page in the selected file. It records elapsed time and MCP calls per page.
A scan without `--file` reads every canonical file that is not excluded.

`report` reads the saved inventory and registry without contacting Paper. It writes Markdown and JSON under `.paper-sync/<timestamp>/`.
The report lists each master's copies by file, page, board and flow, plus unenrolled matches of families that have masters, duplicate names and masters without copies.

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

Unit tests cover discovery, slot and icon preservation, nested ordering, rebinding, structural patches and transfer rejection paths.
Live rollout evidence belongs in the PR body. Apply tests use temporary clones, which are removed after the test.
