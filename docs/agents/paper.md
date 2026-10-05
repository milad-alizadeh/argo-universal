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
- Colours come from the Tailwind palette only. Every semantic token (`--color-success`, `--color-sidebar`) aliases a palette token.
- Paper leads how things look. When a Paper token is missing from `theme.css` or holds a different value, report it as drift; code catches up in its own change.

## Drift audit

An audit is done when every item below is checked and each difference is listed with the artboard, the layer name, and what differs:

- Every copy matches its master's `get_jsx`, apart from the allowed changes.
- Every Paper token from `get_tokens` exists in `theme.css` with the same value.
- Every master names a code component, built or planned.
- Every master's distinct visual state appears once in its component's showcases; callback behavior belongs in test stories.

## Paper gotchas

- Text nodes do not inherit `font-family`. Set `font-family: var(--font-sans)` on every text node, and check with `find_nodes` for `*system-ui*`.
- A `var(--token)` inside a gradient renders transparent. Write the literal colour there.
- `z-index` and negative margins apply only through `update_styles`.
- A CSS `filter` on a parent breaks `backdrop-filter` in its children.
