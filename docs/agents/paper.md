# Paper

How designs in Paper stay in sync with each other and with the code while Paper has no component instances.

This doc is temporary. When Paper ships components ("Components with slots" on its roadmap), convert the masters to components first, then swap the copies over one artboard at a time, then delete this doc and its line in `AGENTS.md`.

## Masters and copies

- A **master** lives on a family card named `Components / <CodeName>` on its section's Components board (see Page layout). Name it for the code component it becomes, and name its states for that component's props: `Toggle / Changed files (pressed)` is the `pressed` prop.
- A master's name is `<CodeName> / <State>`, with `(phone)` right after the code name for the phone version: `SessionRow / Done`, `SessionRow (phone) / Done`. CodeName is the PascalCase code component; a master with one state drops ` / <State>`. Desktop takes no suffix.
- A page is built only from **copies** of masters, made with `duplicate_nodes`. A copy keeps its master's layer name: the name is the link.
- A copy may change its text, hide items, and switch to a named state. Any other difference from its master is **drift**.
- To change a component, edit the master, then run `pnpm -F @repo/tools paper:sync "<Name>"` and, once its dry run reads right, again with `--apply`. Work inside out: a master nested in another master (Session row inside List column) is synced before the masters that hold it.
- Column masters carry content only. The surface (background, border, radius, shadow) comes from the shell's Card and Sidebar plate, so a master and its copies cannot drift on it.

## Page layout

Every section page (Session, Voice, Atlas, Setup, Issues, Settings) has the same artboards, top-aligned at y 0, left to right, 400px apart. Nothing is placed by hand: every board is auto layout, so adding something moves its neighbours instead of overlapping them.

- `<Section> Components`: a flex row of columns named `Column / <Group>`, each a flex column of family cards `Components / <CodeName>`. A card has its heading, a Desktop | Phone header (or Content | Popover | Sheet for overlays) and one row per state. A new component is a new card in a column, never a loose artboard.
- `<Section> Desktop` and `<Section> Mobile`: a flex column of flows named `Flow / <Name>`, each a heading and a row of `Screen / <State>` frames. A screen frame holds a label, then the screen, named `<Section> — <State>`: no device word (the board says it) and no "(light)". Desktop and Mobile use the same flow names in the same order.
- `<Section> Explorations`, only when needed: option boards, comparisons and A/B variants, wrapped like screens. Finished work never sits here.
- Global Components has only its Components board, plus the two Typography comparison boards, which stay as they are.
- Move existing layers into place with `move_nodes`, which keeps their ids; never re-create them to move them.

## Tokens

- Paper tokens use the Tailwind names in `tooling/uniwind/theme.css`. Fractional steps take an underscore: `--spacing-0_5`, `--leading-4_5`.
- Icon width and height take a size token, never px: `--spacing-icon-sm` (12) for chevrons and carets, `--spacing-icon-mark` (14) for full-box shapes such as the Agent logo, Context ring, Linear and Checks ring, `--spacing-icon-md` (16) for every other icon, and `--spacing-icon-lg` (20) for phone shell controls and the desktop rail. A box that holds an icon takes the same token.
- Text takes one of four roles from the "Components / Typography" master on the Global Components page: Title, Heading, Body, Secondary. Each role is a set of tokens, `--text-<role>`, `--leading-<role>` and `--font-weight-<role>`; desktop text uses the `-wide` size and leading (`--text-body-wide`), phone text the plain ones. Text nodes reference these role tokens, never a scale step such as `--text-sm`. In code they are the `type-title`, `type-heading`, `type-body` and `type-secondary` classes in `theme.css`. Buttons, inputs, chips, the native phone header and mono code keep their own styles.
- Token values live in `theme.css` only. Paper's tokens are a copy of them: change a value in `theme.css`, then write the same value into Paper. Never keep a second copy of the tokens in the repository.
- Paper stores oklch with one decimal. When that rounding changes the colour, store the exact hex instead.
- Colours come from the Tailwind palette only. Every semantic token (`--color-success`, `--color-sidebar`) aliases a palette token.
- Paper leads how things look; `theme.css` leads token values. When a Paper token is missing from `theme.css` or holds a different value, report it as drift and fix Paper.

## Registry

`tools/paper-drift/masters.json` names every master and its layer id. It is the only list of masters; a frame on a component card that is not in it is not checked.

- `ignoredArtboards` lists artboards whose copies the audit and sync leave alone, such as deliberate comparisons. `notComponents` lists demo and sample frames on component cards, so the audit does not report them as unregistered.
- `name` is the layer name, which is also the name every copy carries.
- `shell: true` marks a container whose content changes with each use, such as a sheet. Only its root is compared.
- A **variation** is one master per state, grouped into a family: `variantOf` names the base, and `props` lists what the variation sets differently, keyed by layer path (`""` is the root, `"0/2"` the base's first child's third child). A `null` value unsets the property. Anything else that differs from the base is drift.
- `pnpm -F @repo/tools paper:registry` proposes a registry from the component cards: the first frame in each `Cell`, `Desktop`, `Phone`, `Content`, `Popover`, `Sheet` or `Demo` slot. It writes `masters.json` when there is none, otherwise `.paper-drift/masters.proposed.json` to compare with it. Review every entry before committing it.

## Drift audit

The tools in `tools/paper-drift/` read the whole file through the Paper MCP. Only `paper:sync --apply`, `paper:rename --apply` and `paper:tokens --apply` write to Paper.

- `pnpm -F @repo/tools paper:snapshot` reads every layer, its styles and the tokens into `.paper-drift/snapshot.json`; run it again whenever the file has changed. It reads styles in small, paced batches, because whole-file reads have made Paper Desktop quit, so a full read takes about 15 minutes. To keep runs short it reuses styles: each subtree of up to 500 layers (a card, a screen frame, or part of a bigger one) is fingerprinted from its `get_jsx` output and its layer ids, names, hidden flags and texts, and keeps the last snapshot's styles while its fingerprint is unchanged. Artboards, containers too big for one unit and every unit's root are read on each run. After a small edit a run takes a minute or two. `--full` reads every layer's styles, and so does a run with no earlier snapshot, an earlier snapshot without fingerprints, or changed tokens. `paper:sync` reuses styles the same way.
- `pnpm -F @repo/tools paper:audit` checks the last snapshot and writes `.paper-drift/audit.md` and `audit.json`:
  - every copy against its master, apart from the allowed changes;
  - every variation against its base with its props applied;
  - registry entries whose layer is gone or renamed, and presented frames that are not registered;
  - frame names that differ only in case, spacing or punctuation;
  - every Paper token against `theme.css` on top of Tailwind's defaults, after resolving `var()`;
  - literal values in a style that has a token scale, with the matching token or "off the scale".

  A change that keeps the value and only swaps the token (`--text-sm` for `--text-body-wide`) is marked "same value".
- `pnpm -F @repo/tools paper:levels` writes `.paper-drift/levels.json`: the masters grouped by nesting depth, innermost first. `paper:sync` takes several names at once from one snapshot, so pass names from one level only, and take a new snapshot between levels. `--offline` plans from the last snapshot without touching Paper.
- `pnpm -F @repo/tools paper:rename <map.json>` renames masters, every copy and the registry together, from a map of `renames` (`id`, `from`, `to`) and `aliases` (other spellings found on copies). It is a dry run against a fresh read of the layer names, without styles (`--offline` uses the last snapshot), until you add `--apply`, which refuses while the plan lists problems.
- `pnpm -F @repo/tools paper:tokens` plans to write the tokens in `theme.css`, with the Tailwind defaults their aliases name, into Paper: what it would add, change and leave alone. An alias stays an alias; any other value is written resolved, in px. A Paper token whose resolved value already matches is left as it is. Tokens only in Paper are listed, never deleted. Tokens Paper has no type for (shadows, blur) or whose value it cannot hold (`hairlineWidth()`) are listed and counted as unmapped. It reads Paper's tokens (`--offline` uses the last snapshot) and writes only with `--apply`.
- `pnpm -F @repo/tools paper:sync "<Name>"` takes a fresh snapshot and plans, for each drifted copy of that master, to clone the master beside it, put back the copy's text, hidden items, placement and nested masters, and delete the old copy. Copies whose layers differ from the master's are listed for a person instead. Add `--apply` to carry it out; before and after screenshots go to `.paper-drift/sync/`. Never apply while someone else is editing the same artboards.

After any Paper write tool, a PostToolUse hook (`tools/agent-hooks.mts after-paper-edit`, which loads `tools/paper-drift/edit-hook.mts`) warns when the edit touched a master, whose copies now drift, or a copy outside its allowed changes. It reads the last snapshot and the registry, so it never calls Paper and never blocks. Layers made after the last snapshot are not checked, and input it does not recognise is reported as a skipped check.

An audit is done when the report has been read and each difference is either fixed or listed with the artboard, the layer name and what differs. These checks stay manual: every role token in `theme.css` exists in Paper; every text node references role tokens, apart from the exceptions listed under Tokens; every master names a code component, built or planned; and every master's Storybook coverage follows the [Storybook rules](storybook.md).

## Building from Paper

- Map the whole artboard before you write JSX: the shell, its regions, and every repeated group with the master it is a copy of. A group that repeats without a master is drift; report it.
- Build from the artboard the user names as canonical. When other artboards of the same screen differ, list the differences and ask.
- Name a new component for its structural role (`LabeledList`), not its content (`FailureList`).
- Rebuild a chart from its data model (values, ranges, segments) read with `get_computed_styles`, and label every figure you could not recover as a placeholder.
- The build is done when a screenshot of it sits beside the artboard's screenshot at the same width, and each difference is fixed or listed.

## Paper gotchas

- Text nodes do not inherit `font-family`. Set `font-family: var(--font-sans)` on every text node, and check with `find_nodes` for `*system-ui*`.
- A `var(--token)` inside a gradient renders transparent. Write the literal colour there.
- `z-index` and negative margins apply only through `update_styles`.
- A CSS `filter` on a parent breaks `backdrop-filter` in its children.
