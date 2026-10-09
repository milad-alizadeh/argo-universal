# Paper

How designs in Paper stay in sync with each other and with the code while Paper has no component instances.

This doc is temporary. When Paper ships components ("Components with slots" on its roadmap), convert the masters to components first, then swap the copies over one artboard at a time, then delete this doc and its line in `AGENTS.md`.

## Masters and copies

- A **master** lives on an artboard named `Components / <Name>`. Name it for the code component it becomes, and name its states for that component's props: `Toggle / Changed files (pressed)` is the `pressed` prop.
- A page is built only from **copies** of masters, made with `duplicate_nodes`. A copy keeps its master's layer name: the name is the link.
- A copy may change its text, hide items, and switch to a named state. Any other difference from its master is **drift**.
- To change a component, edit the master, copy it again into every page that uses it, and reapply each copy's text, hidden items and state. Work inside out: a master nested in another master (Session row inside List column) is updated before the masters and pages that hold it.
- Column masters carry content only. The surface (background, border, radius, shadow) comes from the shell's Card and Sidebar plate, so a master and its copies cannot drift on it.

## Tokens

- Paper tokens use the Tailwind names in `tooling/uniwind/theme.css`. Fractional steps take an underscore: `--spacing-0_5`, `--leading-4_5`.
- Icon width and height take a size token, never px: `--spacing-icon-sm` (12) for chevrons and carets, `--spacing-icon-mark` (14) for full-box shapes such as the Agent logo, Context ring, Linear and Checks ring, `--spacing-icon-md` (16) for every other icon, and `--spacing-icon-lg` (20) for phone shell controls and the desktop rail. A box that holds an icon takes the same token.
- Text takes one of four roles from the "Components / Typography" master on the Global Components page: Title, Heading, Body, Secondary. Each role is a set of tokens, `--text-<role>`, `--leading-<role>` and `--font-weight-<role>`; desktop text uses the `-wide` size and leading (`--text-body-wide`), phone text the plain ones. Text nodes reference these role tokens, never a scale step such as `--text-sm`. In code they are the `type-title`, `type-heading`, `type-body` and `type-secondary` classes in `theme.css`. Buttons, inputs, chips, the native phone header and mono code keep their own styles.
- Token values live in `theme.css` only. Paper's tokens are a copy of them: change a value in `theme.css`, then write the same value into Paper. Never keep a second copy of the tokens in the repository.
- Paper stores oklch with one decimal. When that rounding changes the colour, store the exact hex instead.
- Colours come from the Tailwind palette only. Every semantic token (`--color-success`, `--color-sidebar`) aliases a palette token.
- Paper leads how things look; `theme.css` leads token values. When a Paper token is missing from `theme.css` or holds a different value, report it as drift and fix Paper.

## Drift audit

An audit is done when every item below is checked and each difference is listed with the artboard, the layer name, and what differs:

- Every copy matches its master's `get_jsx`, apart from the allowed changes.
- Every Paper token from `get_tokens` exists in `theme.css` with the same value, and every role token in `theme.css` exists in Paper.
- Every text node references role tokens, apart from the exceptions listed under Tokens.
- Every master names a code component, built or planned.
- Every master's Storybook coverage follows the [Storybook rules](storybook.md).

## Paper gotchas

- Text nodes do not inherit `font-family`. Set `font-family: var(--font-sans)` on every text node, and check with `find_nodes` for `*system-ui*`.
- A `var(--token)` inside a gradient renders transparent. Write the literal colour there.
- `z-index` and negative margins apply only through `update_styles`.
- A CSS `filter` on a parent breaks `backdrop-filter` in its children.
