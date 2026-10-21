# Paper

Storybook owns how built UI looks. Paper is where a design is explored and agreed **before** it is built.

Once a design ships, its Storybook story is the record: the story shows the states, the platforms and the appearance, and the PR evidence shows it running. The Paper board that led to it is then deleted. Nothing in Paper describes UI that already exists.

## Design files

| File | Owns |
|---|---|
| [Foundations](https://app.paper.design/file/01M4RJ2FP7N272AE463G6PT2QD/p-2-0) | Device chrome, the icon library and unbuilt primitives |
| [Sessions](https://app.paper.design/file/01M4RJRP22R2R2JE20RWDNXR0Q/p-1-0) | Sessions explorations |
| [Feed & Inspector](https://app.paper.design/file/01M4RJWCAC00EA21V8BKY91FEV/p-1-0) | Workbench, Stage and Change explorations |
| [Composer](https://app.paper.design/file/01M4RJXN4XTK41J7TDNBBD87G1/p-1-0) | Composer explorations |
| [Settings](https://app.paper.design/file/01M4RJMTRRZ4K9B62YQ0P53CR5/p-1-0) | Settings, Agents and the Accounts broker |
| [Voice](https://app.paper.design/file/01M4RJ7EBVF0CGT31XYHHYVHYV/p-1-0) | Voice |
| [Atlas](https://app.paper.design/file/01M4RJB4J2JMHAQCZYTSD808R7/p-1-0) | Atlas |
| [Setup](https://app.paper.design/file/01M4RJFEE925T7Z1Q0E3J8CF7M/p-1-0) | Pairing |
| [Issues](https://app.paper.design/file/01M4RJGJ2N1YKV0K3RHF80FKZP/p-1-0) | Issues |
| [Landing](https://app.paper.design/file/01M4RJQ4TMAKN1KWAXYNDHK589/p-1-0) | Landing |

The original [Argo file](https://app.paper.design/file/01M44G6AG3HPXGPPPMKS9S3H8J) is a historical archive. Never open it.

## Designing before implementation

New UI, and a new row, card, placeholder or error state inside an existing screen, is drawn in Paper first and agreed in the ticket. The owner is the only approver.

An exploration board always shows **labelled options to choose from**, never one answer. When a design reuses something already built, say which Storybook story it reuses instead of redrawing it.

Once the owner picks an option and it is built, delete the board in the same pass. A stale board is worse than no board: it competes with the story that is now true.

## Platforms

Argo owns its primitives (ADR-0020), so an exploration covers desktop, iOS and Android where they differ. Draw the platform rows a decision actually needs, not a full matrix.

**Light only.** Dark mode is checked in the code, through the PR evidence.

Native frames use the platform's type scale as literals (SF Pro on iOS, Roboto on Android) but map system colours to Argo tokens (`foreground`, `muted-foreground`, `muted`, `border`, `danger`). The only literal colours are copied OS chrome, board backdrops, shadows and data colours such as GitHub label tints.

## Tokens

`tooling/uniwind/theme.css` is the only source of token values. Each Paper file holds its own copy so it can draw; that copy is a convenience, not a second source. Do not hand-sync it, and do not report it as drift. When a Paper drawing looks wrong because a token moved, update that file's token and move on.

Text uses the four roles — Title, Heading, Body, Secondary — as `--text-<role>`, `--leading-<role>` and `--font-weight-<role>`, never a scale step such as `--text-sm`. Icon dimensions come from the role table in `packages/client/src/lib/generic/symbols/icon-role.ts`.

## Icons

Icons are SF Symbols drawn as SVG paths; Android frames use Material Symbols; git and file-type glyphs are Tabler on every platform (ADR-0019). `iconSymbols` in `packages/client/src/lib/generic/symbols/icon-names.ts` is the only list of icons — an icon a design needs that the app lacks is added there first. Copy icons from the library on the Foundations Icons page.

`tools/sf-symbols/sf-symbol-svg.swift` prints an SF Symbol's path at 16 points, in the symbol's own box.

## Building from Paper

- Map the whole artboard before writing JSX: the shell, its regions, and every repeated group.
- Build from the board the owner named as the chosen option. When other boards of the same screen differ, they are leftovers — ask before following one.
- Name a new component for its structural role (`LabeledList`), not its content (`FailureList`).
- The build is done when its Storybook story sits beside the board at the same width and each difference is fixed or listed. Then delete the board.

## Paper gotchas

- Text nodes do not inherit `font-family`. Set `font-family: var(--font-sans)` on every text node, and check with `find_nodes` for `*system-ui*`.
- A `var(--token)` font family does not resolve: Paper draws it in SF Pro. Write mono text as `font-family: "SF Mono"`.
- A `var(--token)` inside a gradient renders transparent. Write the literal colour there.
- `z-index` and negative margins apply only through `update_styles`.
- A CSS `filter` on a parent breaks `backdrop-filter` in its children.
- Paper serves one MCP connection, so parallel agents' calls take turns and one large read stalls them all. Read the board you are editing with `get_children` or `find_nodes`, and screenshot only the node you changed.
