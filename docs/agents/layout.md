# Layout

[ADR-0039](../adr/0039-the-workbench-holds-section-cards-and-the-stage-shows-one-in-full.md) owns what the Workbench and the Stage are; this page is the shape they are drawn in. Every measurement below comes from a board on the Paper file "Argo · Feed, Workbench & Stage", page "Workbench & Stage · Exploration", and each rule names its board. Sizes are tokens wherever a token exists; never hard-code a number a token already holds.

The order the regions give up width, the phone model and the overflow rule below are the owner's decisions and are settled; the Paper boards that illustrate them are still waiting on his visual sign-off.

## The regions

- **Rail** — 56 (`--spacing-frame-rail`), inside the sidebar's glass panel, with the sidebar toggle at its foot. Sections live here and nothing else does: a Session's own content never gets a rail item. Present at medium and wide ("Screen / Approved layout").
- **Sidebar** — the section's list, 312 (`--spacing-frame-list`), beside the rail in the same glass panel. Rail plus list plus the 8 frame inset on each side make the 384 glass zone on "Screen / Approved layout"; the panel itself is `--radius-2xl` over `--color-glass`.
- **Content column** — the Session header, the Feed viewport and the Composer, one centred column under the 800 cap. See [The content column](#the-content-column).
- **Workbench** — the column beside the Feed holding the Session's section cards, toggled from the Session header's `layout-sidebar-right` IconButton. One per Session. It is not a second sidebar and it is not a rail section.
- **Stage** — the surface that shows one Workbench row in full. A row opens it, the Workbench stays, it holds no list of its own and it is never reached from the rail.
- **Never in a header** — pull requests, checks, Changes counts and file changes are the Workbench's on every platform. A Session header carries identity and state only: title, status, the running Turn, the Workbench toggle and "…" (ADR-0039).

## The widths

Size classes are `compact` (below `--breakpoint-medium`, 600, and every phone), `medium` (600 to 1099) and `wide` (`--breakpoint-wide`, 1100, and up), as `GLOSSARY.md` defines them.

**Wide, no Stage** — "Screen / Approved layout", 1440×900. Glass zone 384, main container 1056: Feed column 704 and the Workbench 352 (`--spacing-frame-inspector`) flush to the window edge, its cards 336 inside padding of 4 leading, 12 trailing, 12 block, gap `--spacing-2`.

**Wide, Stage open** — "Screen / Wide · Stage as a glass panel", 1440×900. The Stage takes the region and the Workbench is not drawn; Feed column 688. The Stage region is `--spacing-frame-inspector` + 16 = 368 and the panel inside it 352, inset `--spacing-frame-inset` from the window edges, `--radius-2xl` on all four corners, the sidebar's `--color-glass` fill, backdrop blur and inset highlight, and its shadow is not clipped. Its tab row sits on the Session title's line.

**Wide, both** — "Screen / Wide 1760 · Workbench and Stage together", 1760×900: Feed column 680, Workbench region `--spacing-frame-list` + 16 = 328 with the card stack 312 inside, Stage region 368 with the 352 panel. That board states the cost: about 1760 with the Sessions list showing, about 1450 with it collapsed. At 1440 the Feed is left under 400, so only one of the two fits beside it, which is what every other wide board draws.

**Medium** — 900×800 on all three medium boards. The Sessions list is gone; the glass panel holds the rail alone, 68 wide in an 84 zone, and the main container takes 816.

- *Workbench returned* — "Screen / Medium · Workbench in the returned region": the toggle returns the region **over** the content, `--spacing-frame-inspector` wide, positioned at `--spacing-frame-bar` from the top and `--spacing-3` from the right, on `--color-content` with `--radius-2xl`, `--color-shadow-strong` and a hairline ring. The Feed stays visible behind it and is not dimmed.
- *Stage floating* — "Screen / Medium · Stage floating over the content": the same glass panel as wide, 352 wide and inset 8 from the window edges, floats over the Feed. The Session header and the Composer take a trailing padding of `--spacing-frame-inspector` + 16, so no control is left underneath; only the Feed body passes under the glass.
- *Region hidden* — "Screen / Medium · Region hidden": too narrow to keep the region, so it hides itself as part of the resize and the Feed takes the whole container. Open Stage tabs collapse into the counter on the header's Workbench button; widening restores them with the tabs intact.

**Compact** — see [Phones](#phones).

## Giving up width

Three regions compete with the content column for width: the Sessions list, the Workbench, and the Stage while it is open. The main content comes first, so narrowing the window gives width up in a fixed order.

1. **The Sessions list collapses first**, folding into the rail. The rail itself never collapses.
2. **Then the Workbench undocks.** It auto-hides rather than letting the content column be squeezed, so the column keeps the width it had.
3. **The content column gives last**, and is capped at 800 however much room there is.

TODO: the width at which the Sessions list collapses into the rail. A Paper agent is deriving it from the real column widths.

TODO: the width at which the Workbench undocks. Same derivation, same source.

The Workbench therefore has three states, and the one toggle in the Session header drives all of them.

- **Docked** — its own 312 column beside the content, and beside the Stage when the Stage is open.
- **Auto-hidden** — below the undock threshold, with the toggle unpressed: the Workbench is not drawn and the content column keeps its full width.
- **Floating** — below the threshold with the toggle pressed: the Workbench overlays the content as a glass panel. The content does not reflow.

## The Workbench

- **A stack of separate cards, one per section, each collapsible from its own header.** The chevron sits in the leading slot; a collapsed card keeps its header and shows a count, or the collapse is lossy. Collapsed state is remembered per Session. Drawn at 312 with `--radius-2xl` cards and `--spacing-2` between them on "Spec / Workbench layout · collapsible cards".
- **Argo's cards are Changes, Subagents and Shells.** Each appears, disappears and reorders on its own.
- **A card is drawn only when the Session has one.** A section with nothing in it is not drawn at all, so an empty Workbench is an empty column, not three headers over nothing (same board). A Session with no Subagents has no Subagents card, as its header has no Subagents button.
- **Cards are kit components and list their rows with `List` and `ListItem`** ([ADR-0032](../adr/0032-one-list-and-one-list-item-drawn-by-argo-everywhere.md)).
- **Plugins contribute cards into the named Slot, add-only** ([ADR-0035](../adr/0035-plugins-add-to-named-slots-and-never-edit-core-screens.md)). The Plugin draws inside its own card; Argo decides where the card goes, in what order and how much fits. A Plugin never moves, hides, reorders or restyles Argo's cards or another Plugin's. A Plugin's `header` action may open its card.
- *Not settled:* the Workbench card surface. "Screen / Approved layout" draws the cards on `--color-card` with a hairline; "Spec / Workbench layout · collapsible cards" and the 1760 board draw them on `--color-glass` with the sidebar's blur.

## The Stage

- **A Workbench row opens it** — pressing the row, or a Plugin's `header` action for its own card. The Workbench stays; the Stage is a surface, not a section.
- **It shows one row in full:** a Change's diff, a Subagent's Feed, a Shell's output, or whatever a Plugin draws for its own row.
- **Wide:** its own region beside the Feed. At 1440 it takes the Workbench's place; from about 1760 (about 1450 with the Sessions list collapsed) both stand ("Screen / Wide 1760 · Workbench and Stage together").
- **Medium:** it floats over the content instead of sharing the row, and the header and Composer inset by its width so no control is left under the glass ("Screen / Medium · Stage floating over the content").
- **Narrowing past the region:** open Stage tabs collapse into the header's counter and come back with the tabs intact ("Screen / Medium · Region hidden").

## The content column

- `--container-column` is 800. The Session header, the Feed viewport and the Composer each take the same centred column: `max-width` 848 at a 24 gutter on each side, `align-self: center`, on every desktop board.
- The cap holds beside the Workbench and under the Stage; at the drawn widths the column is narrower than its cap anyway (704 at 1440 with the Workbench, 688 with the Stage, 680 at 1760), so the cap bites only on wider windows.
- The Workbench and the Stage sit outside the cap: they are regions of the window, not content in the column.

## Phones

Compact has no column, so the Workbench is a menu and a sheet. Every card and every Stage is still reachable, as ADR-0039 requires: nothing is dropped and no card is desktop-only.

**There is no Workbench page and no Workbench route.** Nothing navigates away from the Session.

**The Session header carries a Workbench IconButton beside its "…".** Pressing it opens a nav menu — the same component as the "…" menu that holds Archive and Rename — listing the Workbench's sections in the order the desktop cards take, each with its icon and its muted count: Changes, Agents, Shells, then the sections Plugins add through the Slot.

**Picking a section opens it as a bottom sheet over the Session,** built on Argo's `Sheet` primitive. The sheet's root page carries a ✕ in its title row; a page pushed inside it carries Back.

**Pressing a row inside a sheet pushes that item's detail as a page in the same sheet:** an Agent's Feed, a Shell's output, a Change's detail. That pushed page is the phone's Stage.

**A Change's detail page carries a SegmentedControl with two segments, PR and Files** — the pull request's stage, its checks and its closing action, or the file diff.

**A Change row's trailing slot is a "…", not a chevron,** and it opens the Change's actions. Every other row keeps its chevron.

## The overflow rule

This one holds on desktop and on phones alike.

Live rows in the Agents and Shells sections are always visible. When a section would show more than four rows, its finished and cancelled rows fold into one muted line reading like `3 finished`, where the number is how many are hidden. Pressing that line expands them in place; it never navigates. The full list is the Workbench section itself, because the Stage shows one item and never a list.

## Agents, not Subagents

The Workbench section this page and ADR-0039 call Subagents is labelled **Agents** in the UI. That collides with Argo's Agents page, which lists the installed ACP Agents with the registry below them, and the collision is unresolved: two different things carry one word. `GLOSSARY.md` and ADR-0039 still say Subagent and are left as they are until the owner picks a way out.

## The name in code

The code still calls both surfaces the inspector: about 120 files carry the word, among them `InspectorPane`, `ChangesInspector` and `session-inspector.tsx`, and ADR-0035 had to name the Workbench's Slot an "inspector tab" because nothing else had a name yet. The rename is outstanding work, not an open decision. In designs, docs, Issues and messages the words are Workbench and Stage.
