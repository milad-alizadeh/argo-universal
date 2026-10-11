# Paper

How designs in Paper stay in sync with each other and with the code while Paper has no component instances.

This doc is temporary. When Paper ships components ("Components with slots" on its roadmap), convert the masters to components first, then swap the copies over one artboard at a time, then delete this doc and its line in `AGENTS.md`.

## Design before implementation

Every new UI or visible state needs a Paper design, including new rows, cards, placeholders and error states inside an existing screen. Identify the Paper master and state before implementing the appearance, and link that design in the PR evidence. Reuse an existing matching master; when none exists, report the design gap before writing the UI. A functional requirement, passing tests or a simulator screenshot does not supply the missing design.

## Masters and copies

- A **master** lives on a family card named `Components / <CodeName>` on its section's Components board (see Page layout). Name it for the code component it becomes, and name its states for that component's props: `Toggle / Changed files (pressed)` is the `pressed` prop.
- A master's name is `<CodeName> / <State>`, with `(phone)` right after the code name for the phone version: `SessionRow / Done`, `SessionRow (phone) / Done`. CodeName is the PascalCase code component; a master with one state drops ` / <State>`. Desktop takes no suffix.
- A page is built only from **copies** of masters, made with `duplicate_nodes`. A copy keeps its master's layer name: the name is the link.
- A copy may change its text, hide items, and switch to a named state. Any other difference from its master is **drift**.
- To change a component, edit the master, then make the same change in each of its copies, found by layer name. Work inside out: a master nested in another master (Session row inside List column) is changed before the masters that hold it.
- Column masters carry content only. The surface (background, border, radius, shadow) comes from the shell's Card and Sidebar plate, so a master and its copies cannot drift on it.

## Platforms

Argo owns its primitives (ADR-0020), so Paper designs desktop, iOS and Android.

- **Cards** have **Desktop | iOS | Android** columns. A single Phone column stays only where both phones match. Overlay cards have **Content | Popover | Sheet (iOS) | Sheet (Android)**.
- **Master names** take an `(ios)` or `(android)` suffix after the code name: `Switch (ios)`, `Switch (android)`. `(phone)` means both. Desktop takes no suffix.
- **Mobile flows** get an iOS row. An Android row sits inside the same `Flow / <Name>` only where Android differs from iOS. Platform-only flows are allowed, in a shared order.
- **Light only:** Paper draws light mode only, with no dark frames, cards or flows. Dark mode is checked in the code, through the PR evidence.
- **Native frames** use the platform's type scale and system text colours as literals, the way mono uses literal "SF Mono": SF Pro text styles on iOS, literal Roboto on Android. Everything else keeps Argo's tokens.
- **Icons:** Android frames use Material Symbols; iOS frames use SF Symbols (ADR-0019). Each tile in "Components / Icons" has a Material cell beside the SF cell.
- **Promotion:** an exploration frame moves into card format on the Components, Desktop or Mobile board with `move_nodes`, which keeps its id. The master it replaces is then deleted.
- **Approval:** the owner is the only approver. Each ticket's Paper is approved in its issue or PR thread, against named flows, before it is built. After approval, edit the master first, then its copies.

## Page layout

Every section page (Session, Voice, Atlas, Setup, Issues, Settings) has the same artboards, top-aligned at y 0, left to right, 400px apart. Nothing is placed by hand: every board is auto layout, so adding something moves its neighbours instead of overlapping them.

- `<Section> Components`: a flex row of columns named `Column / <Group>`, each a flex column of family cards `Components / <CodeName>`. A card has its heading, a Desktop | Phone header (or Content | Popover | Sheet for overlays) and one row per state. A new component is a new card in a column, never a loose artboard.
- `<Section> Desktop` and `<Section> Mobile`: a flex column of flows named `Flow / <Name>`, each a heading and a row of `Screen / <State>` frames. A screen frame holds a label, then the screen, named `<Section> — <State>`: no device word (the board says it) and no "(light)". Desktop and Mobile use the same flow names in the same order.
- `<Section> Explorations`, only when needed: option boards, comparisons and A/B variants, wrapped like screens. Finished work never sits here.
- Global Components has only its Components board, plus the two Typography comparison boards, which stay as they are.
- Move existing layers into place with `move_nodes`, which keeps their ids; never re-create them to move them.

## Tokens

- Paper tokens use the Tailwind names in `tooling/uniwind/theme.css`. Fractional steps take an underscore: `--spacing-0_5`, `--leading-4_5`.
- Icon dimensions come from the named sizes encapsulated in `packages/client/src/lib/generic/symbols/icon.tsx`. Paper records their resolved dimensions as literals. An icon slot uses the same size as its glyph.
- Web card and popover surfaces use `--radius-surface` (28px) and the shared `--shadow-card` shadow, including menus, dialogs and sheets (owner, 2026-10-10). Web sheets round their top corners. Native surfaces keep their platform drawings.
- Web inputs match the Android TextInput master at `--radius-lg` (10px); web search fields match the Android SearchField master at `--radius-search` (8px) (owner, 2026-10-10). The existing native ListSearch animation retains 6px through the platform token value.
- Web dialogs have no border in light mode and use the shared `--shadow-card` shadow. Dark web cards, popovers, menus, dialogs and sheets use a 1px `--color-border` edge and a black shadow, without a white glow (owner, 2026-10-10).
- Feed code blocks, inline diffs and tables use `--radius-surface` on web and have no shadow. Menu hover and focus use `--color-muted`; pressed uses `--color-border` without a border (owner, 2026-10-10).
- Destructive hover and pressed states use a light red background, 10% of `--color-destructive`, with destructive text (owner, 2026-10-10).
- Text takes one of four roles from the "Components / Typography" master on the Global Components page: Title, Heading, Body, Secondary. Each role is a set of tokens, `--text-<role>`, `--leading-<role>` and `--font-weight-<role>`; desktop text uses the `-wide` size and leading (`--text-body-wide`), phone text the plain ones. Text nodes reference these role tokens, never a scale step such as `--text-sm`. In code they are the `type-title`, `type-heading`, `type-body` and `type-secondary` classes in `theme.css`. Buttons, inputs, chips, the native phone header and mono code keep their own styles.
- Token values live in `theme.css` only. Paper's tokens are a copy of them: change a value in `theme.css`, then write the same value into Paper. Never keep a second copy of the tokens in the repository.
- Paper stores oklch with one decimal. When that rounding changes the colour, store the exact hex instead.
- Colours come from the Tailwind palette only. Every semantic token (`--color-success`, `--color-sidebar`) aliases a palette token.
- Paper leads how things look; `theme.css` leads token values. When a Paper token is missing from `theme.css` or holds a different value, report it as drift and fix Paper.

## Icons

- Icons are SF Symbols, drawn as SVG paths so the design matches iOS and macOS (ADR-0019). The SVGs are mockups in Paper only; the app draws the real symbol through expo-symbols.
- Where SF Symbols has no symbol, Argo draws its own (`custom.<name>` in `packages/client/src/lib/generic/symbols/custom-symbol-paths.json`, ADR-0019). Its Paper SVG uses the JSON's viewBox and path, so design and app share one outline.
- An icon layer is named `Icon / <name>`, where `<name>` is a key of `iconSymbols` in `packages/client/src/lib/generic/symbols/icon-names.ts`. That map is the only list of icons. An icon a design needs that the app lacks is added there first, with its SF and Material names.
- The library is "Components / Icons" on the Global Components page, one tile per app icon. Copy icons from it.
- `tools/sf-symbols/sf-symbol-svg.swift` prints an SF Symbol's path at 16 points, in the symbol's own box. Use it with that viewBox, the fill on a `--color-*` token, and the dimensions from the named Icon size.

## Building from Paper

- Map the whole artboard before you write JSX: the shell, its regions, and every repeated group with the master it is a copy of. A group that repeats without a master is drift; report it.
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
