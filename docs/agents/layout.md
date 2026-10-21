# Layout

[ADR-0039](../adr/0039-the-workbench-summarises-sections-and-the-stage-shows-them-in-full.md) owns what the Workbench and the Stage are; this page is the shape they are drawn in. Every measurement below comes from a board on the Paper file "Argo · Feed, Workbench & Stage", page "Workbench & Stage · Exploration", and each rule names its board. Sizes are tokens wherever a token exists; never hard-code a number a token already holds.

The order the regions give up width, the phone model and the way a long section reads are the owner's decisions and are settled; the Paper boards that illustrate them are still waiting on his visual sign-off.

## The regions

- **Rail** — 56 (`--spacing-frame-rail`), inside the sidebar's glass panel, with the sidebar toggle at its foot. Sections live here and nothing else does: a Session's own content never gets a rail item. Present at medium and wide ("Screen / Approved layout").
- **Sidebar** — the section's list, 312 (`--spacing-frame-list`), beside the rail in the same glass panel. Rail plus list plus the 8 frame inset on each side make the 384 glass zone on "Screen / Approved layout"; the panel itself is `--radius-2xl` over `--color-glass`.
- **Content column** — the Session header, the Feed viewport and the Composer, one centred column under the 800 cap. See [The content column](#the-content-column).
- **Workbench** — the column beside the Feed holding the Session's summary cards, one per section, toggled from the Session header's `layout-sidebar-right` IconButton. One per Session. It is not a second sidebar and it is not a rail section.
- **Stage** — the surface that shows a Workbench card's section in full, as a tab. A card opens it, the Workbench stays, and it is never reached from the rail. A tab lists the section's items and a row opens that item's detail in the same tab.
- **Never in a header** — Changes, their checks, their counts and their file changes are the Workbench's on every platform. A Session header carries identity and state only: title, status, the running Turn, the Workbench toggle and "…" (ADR-0039).

## The widths

Size classes are `compact` (below `--breakpoint-medium`, 600, and every phone), `medium` (600 to 1099) and `wide` (`--breakpoint-wide`, 1100, and up), as `GLOSSARY.md` defines them.

**Wide, no Stage** — "Screen / Approved layout", 1440×900. Glass zone 384, main container 1056: Feed column 704 and the Workbench 352 (`--spacing-frame-stage`) flush to the window edge, its cards 336 inside padding of 4 leading, 12 trailing, 12 block, gap `--spacing-2`.

**Wide, Stage open** — "Screen / Wide · Stage as a glass panel", 1440×900. The Stage takes the region and the Workbench is not drawn; Feed column 688. The Stage region is `--spacing-frame-stage` + 16 = 368 and the panel inside it 352, inset `--spacing-frame-inset` from the window edges, `--radius-2xl` on all four corners, the sidebar's `--color-glass` fill, backdrop blur and inset highlight, and its shadow is not clipped. Its tab row sits on the Session title's line.

**Wide, both** — "Screen / Wide 1760 · Workbench and Stage together", 1760×900: Feed column 680, Workbench region `--spacing-frame-list` + 16 = 328 with the card stack 312 inside, Stage region 368 with the 352 panel. That board states the cost: about 1760 with the Sessions list showing, about 1450 with it collapsed. At 1440 the Feed is left under 400, so only one of the two fits beside it, which is what every other wide board draws.

**Medium** — 900×800 on all three medium boards. The Sessions list is gone; the glass panel holds the rail alone, 68 wide in an 84 zone, and the main container takes 816.

- *Workbench returned* — "Screen / Medium · Workbench in the returned region": the toggle returns the region **over** the content, `--spacing-frame-stage` wide, positioned at `--spacing-frame-bar` from the top and `--spacing-3` from the right, on `--color-content` with `--radius-2xl`, `--color-shadow-strong` and a hairline ring. The Feed stays visible behind it and is not dimmed.
- *Stage floating* — "Screen / Medium · Stage floating over the content": the same glass panel as wide, 352 wide and inset 8 from the window edges, floats over the Feed. The Session header and the Composer take a trailing padding of `--spacing-frame-stage` + 16, so no control is left underneath; only the Feed body passes under the glass.
- *Region hidden* — "Screen / Medium · Region hidden": too narrow to keep the region, so it hides itself as part of the resize and the Feed takes the whole container. Open Stage tabs collapse into the counter on the header's Workbench button; widening restores them with the tabs intact.

**Compact** — see [Phones](#phones).

## Giving up width

Three regions compete with the content column for width: the Sessions list, the Workbench, and the Stage while it is open. The main content comes first, so narrowing the window gives width up in a fixed order.

1. **The Sessions list collapses first**, folding into the rail. The rail itself never collapses.
2. **Then the Workbench undocks.** It auto-hides rather than letting the content column be squeezed, so the column keeps the width it had.
3. **The content column gives last**, and is capped at 800 however much room there is.

**The Sessions list folds into the rail below 1768 with the Stage open, and below 1400 without it.** Those are the widths everything docked needs: the rail's 56, the list's 312, the content column, the Workbench's 312 and, when it is open, the Stage's 352, with the 8 frame insets and the 16 gutters between the regions (board `1RKK-0`). Folding the list frees its 312 and nothing else, because it sits inside the glass panel and has no gutter of its own.

**The Workbench undocks below 1456 with the Stage open, and below 1088 without it.** The list has already folded by then, so those are the folded layout's widths. Undocking frees 328, the Workbench's 312 and the 16 gutter beside it, and what is left needs 1128 with the Stage and 760 without.

Both thresholds are crossed on the way down, in that order, and neither is a choice: the content comes first, then the Workbench, then the Sessions list. The Stage is worth 368 at every step, its 352 and the gutter beside it, which is the difference between each pair of widths above. The content column is held at its floor of 688 throughout the derivation — the Composer's 640 and a 24 gutter on each side — so the thresholds are built on that floor and not on the 800 cap; above them the room left over goes to the column until it reaches the cap.

The Workbench therefore has three states, and the one toggle in the Session header drives all of them.

- **Docked** — its own 312 column beside the content, and beside the Stage when the Stage is open.
- **Auto-hidden** — below the undock threshold, with the toggle unpressed: the Workbench is not drawn and the content column keeps its full width.
- **Floating** — below the threshold with the toggle pressed: the Workbench overlays the content as a glass panel. The content does not reflow.

## The Workbench

- **A stack of separate cards, one per section: an overview of what is happening in the Session.** Drawn at 312 with `--radius-2xl` cards and `--spacing-2` between them on "Spec / Workbench layout · collapsible cards".
- **A card is a summary and nothing else.** The Changes card shows a diff total, the Agents card a count and the role avatars, the Shells card a count. A card holds none of its section's items and discloses none: there is no expander on a card, because the list is the Stage tab the card opens.
- **Pressing a card opens its section's full view in the Stage, as a tab.**
- **Argo's cards are Changes, Agents and Shells.** Each appears, disappears and reorders on its own. The Agents card counts the Agents this Session started, not the installed Agents the Agents page lists.
- **A card is drawn only when the Session has one.** A section with nothing in it is not drawn at all, so an empty Workbench is an empty column, not three headers over nothing (same board). A Session with no Agents has no Agents card, as its header has no Agents button.
- **Cards are kit components, and the lists their Stage tabs draw are `List` and `ListItem`** ([ADR-0032](../adr/0032-one-list-and-one-list-item-drawn-by-argo-everywhere.md)).
- **Plugins contribute cards into the named Slot, add-only** ([ADR-0035](../adr/0035-plugins-add-to-named-slots-and-never-edit-core-screens.md)). The Plugin draws inside its own card; Argo decides where the card goes, in what order and how much fits. A Plugin never moves, hides, reorders or restyles Argo's cards or another Plugin's. A Plugin's `header` action may open its card.
- *Not settled:* the Workbench card surface. "Screen / Approved layout" draws the cards on `--color-card` with a hairline; "Spec / Workbench layout · collapsible cards" and the 1760 board draw them on `--color-glass` with the sidebar's blur.

## The Stage

- **A Workbench card opens it** — pressing the card, or a Plugin's `header` action for its own card. The Workbench stays; the Stage is a surface, not a section.
- **A tab is the section's full view, and it holds a list:** the Session's Changes, the Agents it started, its Shells, or whatever a Plugin draws for its own tab.
- **A row in that list opens the item's detail in the same tab:** a Change's diff, an Agent's Feed, a Shell's output. Back returns to the list, so a tab has at least two levels.
- **Wide:** its own region beside the Feed. At 1440 it takes the Workbench's place; from about 1760 (about 1450 with the Sessions list collapsed) both stand ("Screen / Wide 1760 · Workbench and Stage together").
- **Medium:** it floats over the content instead of sharing the row, and the header and Composer inset by its width so no control is left under the glass ("Screen / Medium · Stage floating over the content").
- **Narrowing past the region:** open Stage tabs collapse into the header's counter and come back with the tabs intact ("Screen / Medium · Region hidden").

## The content column

- `--container-column` is 800. The Session header, the Feed viewport and the Composer each take the same centred column: `max-width` 848 at a 24 gutter on each side, `align-self: center`, on every desktop board.
- The cap holds beside the Workbench and under the Stage; at the drawn widths the column is narrower than its cap anyway (704 at 1440 with the Workbench, 688 with the Stage, 680 at 1760), so the cap bites only on wider windows.
- The Workbench and the Stage sit outside the cap: they are regions of the window, not content in the column.

## Phones

Compact has no column, so the Workbench is a menu and a sheet. Every card and every Stage tab is still reachable, as ADR-0039 requires: nothing is dropped and no card is desktop-only.

**There is no Workbench page and no Workbench route.** Nothing navigates away from the Session.

**The Session header carries a Workbench IconButton beside its "…".** Pressing it opens a nav menu — the same component as the "…" menu that holds Archive and Rename — listing the Workbench's sections in the order the desktop cards take, each with its icon and its muted count: Changes, Agents, Shells, then the sections Plugins add through the Slot.

**Picking a section opens it as a bottom sheet over the Session,** built on Argo's `Sheet` primitive. That sheet is the phone's Stage tab: its root page lists the section's items. The root page carries a ✕ in its title row; a page pushed inside it carries Back.

**Pressing a row inside a sheet pushes that item's detail as a page in the same sheet:** an Agent's Feed, a Shell's output, a Change's detail. The list and the pushed page are the tab's two levels, as they are on a desktop Stage tab.

**A Change's detail page carries a SegmentedControl with two segments, Change and Files** — the Change's stage, its checks and its closing action, or its file changes.

**A Change row's trailing slot is a "…", not a chevron,** and it opens the Change's actions. Every other row keeps its chevron.

## Long sections

This one holds on desktop and on phones alike.

A section's length never reaches the Workbench. However many Changes, Agents or Shells a Session has, its card carries one summary: a diff total, or a count with the role avatars. The column therefore keeps its height whatever the Session is doing.

The length lives in the Stage tab the card opens, and the tab's list groups its items by state and counts each group, live first. The Agents tab reads `Active · 0` with `No active agents` under it when none are running, then `Done · 2` with a row for each finished Agent. Shells group the same way. The tab is a full view and scrolls, so no group is folded away.

## Agents, not Subagents

Subagent is not a word in Argo any more (owner, 2026-10-21). An Agent a Session started is an Agent, in the UI, on this page, in `GLOSSARY.md` and in ADR-0039, and the Workbench section is the **Agents** card. That collides with Argo's Agents page, which lists the installed ACP Agents with the Registry below them: two different things carry one word, and the collision is unresolved. Where a sentence would otherwise be ambiguous, the docs say which of the two is meant. No second name has been coined, because that is the owner's call.

## The name in code

The code still calls both surfaces the inspector: about 120 files carry the word, among them `InspectorPane`, `ChangesInspector` and `session-inspector.tsx`, and ADR-0035 called the Workbench's Slot an "inspector tab" until ADR-0039 gave the column its name. The token this page calls `--spacing-frame-stage` is one of them: `tooling/uniwind/theme.css` still declares it as `--spacing-frame-inspector`, and the Tailwind utility is still `w-frame-inspector`. The rename is outstanding work, not an open decision. In designs, docs, Issues and messages the words are Workbench and Stage.
