# Paper Button sync

Edit a Button master in **Foundations → Components / Button**, then run:

```sh
pnpm paper:sync check
pnpm paper:sync apply
```

Keep Paper Desktop open with its MCP server enabled on port 29979. Run these commands from the repository root after installing its dependencies.

The master and copies live in Paper. The script does not use the app's React components. `button.registry.json` stores the links between Paper nodes and each copy's text override; it is not a second design source. Keep that file with the script.

## What syncs

- Styles, including token references, from each platform and named state.
- Added and removed children, wrappers, child order and reparenting.
- Simple SVG artwork, including the Button loading spinner.
- Master label changes for copies that still inherit the default label.

Copies keep their outer node ID, parent, placement, width and flex placement. Existing layer visibility remains local. A custom label keeps its text and node ID when moved into or out of wrappers. The next run detects label edits made directly in Paper and saves them as overrides.

During first enrollment, text that differs from the master becomes an override. Matching text inherits the master. To pin text that happens to equal the master, set `textOverrides.label` in that copy's registry entry. To resume inheritance, remove that entry while leaving `lastText` unchanged.

## Add new copies

Keep the master's exact layer name, including its platform and state, then run:

```sh
pnpm paper:sync scan
pnpm paper:sync enroll
pnpm paper:sync check
pnpm paper:sync apply
```

`scan` reads small subtrees across both files and checks Paper's truncation flag. It can take several minutes. Normal `check` and `apply` use the registry and read only the registered Button trees.

Enrollment reports unmatched states and ambiguous copies in `.paper-sync/inventory/excluded.json`. It refuses to enroll extra SVG icons without a corresponding master, rather than remove an intentional dropdown arrow. Existing links survive structural edits inside a master. If a master or registered copy is deleted, repair its registry entry before the next run.

## Reports and recovery

Each run writes a timestamped directory under `.paper-sync/`:

- `plan.json`: counts of planned changes per copy.
- `details.json`: exact source and destination snapshots, mappings and edits.
- `before.json`: the complete plan and registry before an apply starts.
- `progress.json`: registry after each successfully verified copy.

The script checks both files' referenced tokens and stops on missing or differing values. It checks for concurrent master and copy edits, applies one copy at a time, and reads the result back. Paper errors and ignored styles fail the run. Zero padding omitted by Paper is treated as equivalent to explicit zero padding.

Paper does not provide a transaction for these operations. A failed run can leave some copies updated. Inspect the saved report, fix the reported issue and rerun; verified copies need no further edits. The before snapshots support manual recovery but are not an automatic rollback command. Avoid simultaneous edits or multiple sync processes during a run.

## Scope of this pilot

This implementation supports Button trees made of Frames, one Text label, and simple SVGs, up to 500 non-vector nodes per Button. Multiple text slots, SVG definition references, creation of hidden layers, and other node types fail explicitly. Changes within an already registered tree are owned by its master; local structural changes are overwritten on sync.

This is an explicit sync command, not a live subscription or native Paper component system. The nine dropdown copies and differently named Button variants need matching masters before enrollment. The command does not invent those designs.

## Tests

```sh
pnpm --filter @repo/tools exec vitest run paper-sync/plan.test.mts
pnpm --filter @repo/tools exec tsc --noEmit
```
