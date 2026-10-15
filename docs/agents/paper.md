# Paper

How designs in Paper stay in sync with each other and with the code while Paper has no component instances.

This doc is temporary. When Paper ships components ("Components with slots" on its roadmap), convert the masters to components first, then swap the copies over one artboard at a time, then delete this doc and its line in `AGENTS.md`.

## Design files

The canonical files for new designs and implementation evidence:

| File | Owns |
|---|---|
| [Foundations](https://app.paper.design/file/01M4RJ2FP7N272AE463G6PT2QD/p-1-0) | Global primitives, icons, typography and windows |
| [Sessions](https://app.paper.design/file/01M4RJRP22R2R2JE20RWDNXR0Q/p-1-0) | Sessions list, filters and shell explorations |
| [Feed & Inspector](https://app.paper.design/file/01M4RJWCAC00EA21V8BKY91FEV/p-1-0) | Session header, Feed, Inspector and PR views |
| [Composer](https://app.paper.design/file/01M4RJXN4XTK41J7TDNBBD87G1/p-1-0) | Composer, menus, sheets, attachments and Session entry |
| [Settings](https://app.paper.design/file/01M4RJMTRRZ4K9B62YQ0P53CR5/p-1-0) | Settings, Agents and accounts |
| [Voice](https://app.paper.design/file/01M4RJ7EBVF0CGT31XYHHYVHYV/p-1-0) | Voice components and flows |
| [Atlas](https://app.paper.design/file/01M4RJB4J2JMHAQCZYTSD808R7/p-1-0) | Atlas components and flows |
| [Setup](https://app.paper.design/file/01M4RJFEE925T7Z1Q0E3J8CF7M/p-1-0) | Setup components and flows |
| [Issues](https://app.paper.design/file/01M4RJGJ2N1YKV0K3RHF80FKZP/p-1-0) | Issues components and flows |
| [Landing](https://app.paper.design/file/01M4RJQ4TMAKN1KWAXYNDHK589/p-1-0) | Landing designs and explorations |

Sessions, Feed & Inspector, and Composer keep masters on `Session Components` (`p-1-0`) and flows on `Session` (`p-2-0`). The other files use `p-1-0`.

The original [Argo file](https://app.paper.design/file/01M44G6AG3HPXGPPPMKS9S3H8J) is a historical archive; leave it and its existing issue approvals and links unchanged.

## Design before implementation

The `AGENTS.md` design rule covers new rows, cards, placeholders and error states inside an existing screen too. Identify the Paper master and state before implementing the appearance, and link that design in the PR evidence. Reuse a matching master; when none exists, report the design gap before writing the UI. A functional requirement, passing tests or a simulator screenshot does not supply the missing design.

The owner is the only approver. Each ticket's Paper is approved in its issue or PR thread, against named flows, before it is built.

## Masters and copies

- Foundations owns the global masters. Each other file owns its section masters. Domain screens embed only the global copies they use.
- A **master** lives on a family card named `Components / <CodeName>` on its section's Components board (see Page layout). Its name is `<CodeName> / <State>`: CodeName is the PascalCase code component it becomes, and states are named for that component's props (`Toggle / Changed files (pressed)` is the `pressed` prop). A master with one state drops ` / <State>`.
- A platform suffix follows the code name: `(phone)` for both phones, `(ios)` or `(android)` for one, none for desktop: `SessionRow / Done`, `SessionRow (phone) / Done`, `Switch (ios)`.
- A page is built only from **copies** of masters: `duplicate_nodes` inside one file, Paper's native clipboard between files. A copy keeps its master's layer name: the name is the link.
- A copy between files gets new IDs; compare its tree, tokens and screenshot with the source.
- A copy may change its text, hide items, and switch to a named state. Any other difference from its master is **drift**.
- To change a component, edit its master first, then every copy, found by layer name, across the relevant files. Work inside out: a master nested in another master (Session row inside List column) is changed before the masters that hold it.
- Column masters carry content only. The surface (background, border, radius, shadow) comes from the shell's Card and Sidebar plate, so copies cannot drift on it.
- **The state matrix lives in the child only** (owner, 2026-10-14). A state belongs to the lowest component that owns it: that card holds every state × platform. A parent card shows one example, with one copy of the child in it, to show where the child sits; it never repeats the child's states. Only a difference in the parent's own layout gets its own small card with its own matrix. Example: `Components / AgentStatusSection` holds every Agent status; `Components / Agent page` holds one state.
- Pages and cards are built from copies of the Foundations masters (Button, GroupedListItem, GroupedListSection, Tag); nothing is hand-drawn where a master exists. A missing master is a design gap: report it.
- When a decision supersedes a state, delete that state in every card and screen in the same pass; stale states are not kept for reference.

## Platforms

Argo owns its primitives (ADR-0020), so Paper designs desktop, iOS and Android.

- **Cards** have **Desktop | iOS | Android** columns. A single Phone column stays only where both phones match. Overlay cards have **Content | Popover | Sheet (iOS) | Sheet (Android)**.
- **Mobile flows** get an iOS row. An Android row sits inside the same `Flow / <Name>` only where Android differs from iOS. Platform-only flows are allowed, in a shared order.
- **Light only:** no dark frames, cards or flows. Dark mode is checked in the code, through the PR evidence.
- **Native frames** use the platform's type scale as literals (SF Pro text styles on iOS, Roboto on Android) but never literal colours: system text, tint, fill and outline colours map to Argo tokens (`foreground`, `muted-foreground`, `muted`, `border`, `danger`), so Android draws Material shapes in Argo colours and iOS uses Argo's neutral greys.
- The only literal colours in Paper are copied OS chrome (macOS traffic lights, the iOS keyboard), board backdrops, shadows (Paper tokens cannot hold them; copy the `--shadow-*` values from `theme.css`) and data colours such as GitHub label tints. An alpha the token set lacks is written `color-mix(var(--token) N%, transparent)`.

## Page layout

Each section uses these artboards on the pages listed in Design files, top-aligned at y 0, left to right, 400px apart. Every board is auto layout, so adding something moves its neighbours instead of overlapping them; nothing is placed by hand.

- `<Section> Components`: a flex row of columns named `Column / <Group>`, each a flex column of family cards `Components / <CodeName>`. A card has its heading, a header of platform columns (see Platforms) and one row per state. A new component is a new card in a column, never a loose artboard.
- `<Section> Desktop` and `<Section> Mobile`: a flex column of flows named `Flow / <Name>`, each a heading and a row of `Screen / <State>` frames. A screen frame holds a label, then the screen, named `<Section> — <State>`: no device word (the board says it) and no "(light)". Desktop and Mobile use the same flow names in the same order.
- `<Section> Explorations`, only when needed: option boards, comparisons and A/B variants, wrapped like screens. Finished work never sits here. To promote an exploration frame, move it onto Components, Desktop or Mobile in card format and delete the master it replaces.
- Foundations keeps the Global Components board, including its Typography references.
- Within one file, use `move_nodes` to move existing layers into place; it keeps their IDs.

## Tokens

- Paper tokens use the Tailwind names in `tooling/uniwind/theme.css`. Fractional steps take an underscore: `--spacing-0_5`, `--leading-4_5`.
- Icon dimensions come from the role table in `packages/client/src/lib/generic/symbols/icon-role.ts`: desktop frames use a role's wide size, phone frames its phone size. Paper records the resolved dimensions as literals. An icon slot uses the same size as its glyph.
- Web and desktop radii follow one rule (owner, 2026-10-14). Controls (Button, IconButton, SplitButton, TextInput, Textarea, the Picker trigger and SearchField) use `--radius-control` (the lg radius, 10px). Rows inside menus and popovers use `--radius-xl` (14px). Containers (cards, popovers, menus and the Composer) use `--radius-2xl` (18px). Pills (Pill, FilterPill, StatusDot) are fully rounded. Sheets use `--radius-sheet` (28px) and round their top corners. Phones keep their stock shapes.
- Web card and popover surfaces share the `--shadow-card` shadow (owner, 2026-10-10). Native surfaces keep their platform drawings.
- Web search fields have a `--color-muted` fill and no border or shadow (owner, 2026-10-12).
- Web dialogs have no border in light mode. Dark web cards, popovers, menus, dialogs and sheets use a 1px `--color-border` edge and a black shadow, without a white glow (owner, 2026-10-10).
- Feed code blocks, inline diffs and tables use `--radius-sheet` on web and have no shadow. Menu hover and focus use `--color-muted`; pressed uses `--color-border` without a border (owner, 2026-10-10).
- Destructive hover and pressed states use a light red background, 10% of `--color-danger`, with danger text (owner, 2026-10-10).
- Text takes one of four roles from the "Components / Typography" master on the Global Components page: Title, Heading, Body, Secondary. Each role is a set of tokens, `--text-<role>`, `--leading-<role>` and `--font-weight-<role>`; desktop text uses the `-wide` size and leading (`--text-body-wide`), phone text the plain ones. Text nodes reference role tokens, never a scale step such as `--text-sm`. In code they are the `type-title`, `type-heading`, `type-body` and `type-secondary` classes in `theme.css`. Buttons, inputs, chips, the native phone header and mono code keep their own styles.
- Token values live only in `tooling/uniwind/theme.css`, with no second copy in the repository; each Paper file holds a copy. After a token change in `theme.css`, sync that token by hand in every canonical Paper file. Paper leads how things look; `theme.css` leads token values. A Paper token missing from `theme.css` or holding a different value is drift: report it and fix Paper.
- Paper stores oklch with one decimal. When that rounding changes the colour, store the exact hex instead.
- Colours come from the Tailwind palette only. Every semantic token (`--color-success`, `--color-content`) aliases a palette token.

## Icons

- Icons are SF Symbols, drawn as SVG paths so the design matches iOS and macOS; Android frames use Material Symbols (ADR-0019). The SVGs are Paper mockups only; the app draws the real symbol through expo-symbols.
- Where SF Symbols has no symbol, Argo draws its own (`custom.<name>` in `packages/client/src/lib/generic/symbols/custom-symbol-paths.json`, ADR-0019). Its Paper SVG uses the JSON's viewBox and path, so design and app share one outline.
- An icon layer is named `Icon / <name>`, where `<name>` is a key of `iconSymbols` in `packages/client/src/lib/generic/symbols/icon-names.ts`. That map is the only list of icons. An icon a design needs that the app lacks is added there first, with its SF and Material names.
- The library is "Components / Icons" on the Global Components page: one tile per app icon, a Material cell beside the SF cell. Copy icons from it.
- `tools/sf-symbols/sf-symbol-svg.swift` prints an SF Symbol's path at 16 points, in the symbol's own box. Use that viewBox, a `--color-*` fill, and the dimensions from the icon's role.

## Building from Paper

- Before writing JSX, map the whole artboard: the shell, its regions, and every repeated group with its master. A group that repeats without a master is drift; report it.
- Build from the artboard the user names as canonical. When other artboards of the same screen differ, list the differences and ask.
- Name a new component for its structural role (`LabeledList`), not its content (`FailureList`).
- Rebuild a chart from its data model (values, ranges, segments) read with `get_computed_styles`, and label every figure you could not recover as a placeholder.
- The build is done when a screenshot of it sits beside the artboard's screenshot at the same width, and each difference is fixed or listed.

## Paper gotchas

- Text nodes do not inherit `font-family`. Set `font-family: var(--font-sans)` on every text node, and check with `find_nodes` for `*system-ui*`.
- A `var(--token)` font family does not resolve: Paper draws it in SF Pro. Write mono text as `font-family: "SF Mono"`, which stands for `--font-mono`. Mono text is paths, file names, branch names, commands, code, diffs and inline code in markdown.
- A `var(--token)` inside a gradient renders transparent. Write the literal colour there.
- `z-index` and negative margins apply only through `update_styles`.
- A CSS `filter` on a parent breaks `backdrop-filter` in its children.
