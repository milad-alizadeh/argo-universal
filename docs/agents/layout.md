# Layout

[ADR-0039](../adr/0039-the-workbench-summarises-sections-and-the-inspector-shows-them-in-full.md) defines the Workbench and the Inspector. This page describes their layout. Paper supplies pane measurements from "Argo · Feed, Workbench & Inspector", page "Workbench & Inspector · Exploration". Existing tokens supply sizes.

[Spec 0020](https://github.com/milad-alizadeh/argo-universal/issues/1178) moves desktop controls into the window band. Its tickets define the derived thresholds below.

Two decisions remain pending: the desktop frame at 900px, and the status dot beside the band title. The current implementation retains ADR-0026 below 1100px and shows only the title in the band.

## The regions

- **Rail** — 56 (`--spacing-frame-rail`), inside the sidebar's glass panel, with its toggle in the window band. Sections live here. A Session's own content never gets a rail item. The desktop frame appears at wide widths ("Screen / Approved layout").
- **Sidebar** — the section's list, 312 (`--spacing-frame-list`), beside the rail in the same glass panel. Rail plus list plus the 8 frame inset on each side make the 384 glass zone on "Screen / Approved layout"; the panel itself is `--radius-2xl` over `--color-glass`.
- **Content column** — the Feed viewport and the Composer share a centered column under the 800 cap. The band carries the title. The local Session header contributes no height. See [The content column](#the-content-column).
- **Workbench** — the column beside the Feed holding the Session's summary cards, one per section, toggled from the band's `clipboard-list` IconButton. One per Session. It is not a second sidebar and it is not a rail section.
- **Inspector** — the surface that shows a Workbench card's section in full, as a tab. A card opens it, the Workbench stays where the width budget permits, and it is never reached from the rail. A tab lists the section's items and a row opens that item's detail in the same tab.
- **Never in a header** — Changes, their checks, their counts and their file changes are the Workbench's on every platform. A Session header carries identity and state only (ADR-0039). The desktop band owns its title and actions. The proposed status dot needs owner approval.

## The widths

Size classes are `compact` (below `--breakpoint-medium`, 600, and every phone), `medium` (600 to 1099) and `wide` (`--breakpoint-wide`, 1100, and up), as `GLOSSARY.md` defines them.

The desktop frame reserves a 44px band (`--spacing-frame-control`). The band has no fill, border, or hairline. Panes start directly below it.

The leading group holds the platform controls and sidebar toggle. The trailing group always holds More, Workbench, Inspector expand, and Inspector toggle, in that order. Each trailing control keeps its position as panes change. A Plugin's first Session header action sits just before More; phones keep every Plugin action inside More.

The title uses the content column's leading edge and stops before the trailing controls. Its spacer is `max(0, platformConstant - (frameInset + navigationWidth))`. The platform constant is 124 on macOS and 44 elsewhere.

The following examples use the default pane widths and an available Workbench. The content region includes its two 24px gutters.

| Window | Inspector | Sessions list | Workbench | Content region |
| --- | --- | --- | --- | --- |
| 1440 | Closed | Shown | Docked | 728 |
| 1440 | Open | Folded | Auto-hidden | 1000, with centered content capped at 848 |
| 1456 | Open | Folded | Docked | 688 |
| 1920 | Open | Shown | Docked | 840 |

The Inspector panel is 352px wide by default. Its region includes a 16px gap. The panel uses the sidebar's glass material, rounded corners, and an unclipped shadow. Its tabs sit below the window band.

**Medium remains a pending desktop exception.** The 900px Paper boards show a rail and floating panels. ADR-0026 requires the phone shell below 1100px on every platform. Production retains that rule until the owner decides whether Spec 0020 supersedes it.

**Compact** — see [Phones](#phones).

## Giving up width

These thresholds use default pane widths with an available Workbench.

Three regions compete with the content column for width: the Sessions list, the Workbench, and the Inspector while it is open. The main content comes first, so narrowing the window gives width up in a fixed order.

1. **The Sessions list collapses first**, folding into the rail. The rail itself never collapses.
2. **Then the Workbench gives up its separate region.** It auto-hides rather than squeezing the content. An explicit Show uses the dedicated Workbench view described below.
3. **The content column gives last**, and is capped at 800 however much room there is.

**The Sessions list folds into the rail below 1768 with the Inspector open, and below 1400 without it.** Those are the widths everything docked needs: the rail's 56, the list's 312, the content column, the Workbench's 312 and, when it is open, the Inspector's 352, with the 8 frame insets and the 16 gutters between the regions (board `1RKK-0`). Folding the list frees its 312 and nothing else, because it sits inside the glass panel and has no gutter of its own.

**The Workbench undocks below 1456 with the Inspector open, and below 1088 without it.** The list has already folded by then, so those are the folded layout's widths. Undocking frees 328, the Workbench's 312 and the 16 gutter beside it, and what is left needs 1128 with the Inspector and 760 without.

Both thresholds are crossed on the way down, in that order, and neither is a choice: the content comes first, then the Workbench, then the Sessions list. The Inspector is worth 368 at every step, its 352 and the gutter beside it, which is the difference between each pair of widths above. The content column is held at its floor of 688 throughout the derivation — the Composer's 640 and a 24 gutter on each side — so the thresholds are built on that floor and not on the 800 cap; above them the room left over goes to the column until it reaches the cap.

The Workbench has five effective states. One toggle drives the person’s Show or Hide intent without rewriting it during a resize.

- **Docked** — its own 312 column beside the content, and beside the Inspector when the Inspector is open.
- **Auto-hidden** — below the undock threshold, with the toggle unpressed: the Workbench is not drawn and the content column keeps its full width.
- **Independent** — when both gutters beside the centered, capped content fit a card and its gaps, the cards use the right gutter. Showing or hiding them does not move the Feed or Composer.
- **Dedicated view** — below the docking budget with explicit Show intent, the Workbench replaces the primary view. The Feed and draft stay mounted but become hidden and inaccessible. The same band toggle restores them. No persistent card overlaps readable Feed content or Composer controls.
- **Hidden** — explicit Hide persists across resize. An expanded Inspector temporarily hides the Workbench without changing that intent.

The independent placement uses the measured host after effective navigation and the Inspector. Its two gutters each need `workbenchWidth + paneGap + inset`, so the default host threshold is `800 + 2 × (312 + 16 + 8) = 1472`. This threshold describes the host, not the window. Navigation and Inspector widths are added by their actual placement. Below it, the existing docked budget protects the content floor of `640 + 2 × 24 = 688`.

## The Workbench

- **A stack of separate cards, one per section: an overview of what is happening in the Session.** Drawn at 312 with `--radius-2xl` cards and `--spacing-2` between them on "Spec / Workbench layout · collapsible cards".
- **Cards summarize their sections.** Changes shows a diff total and up to three Open Changes, with individual checks and menus. A grouped remainder counts further Changes by stage. Shells shows a count. The Agents card also previews active Agents, with role avatars, status marks and details. Completed Agents share one count and up to three overlapping role avatars. Its full header toggles the preview; pressing the body opens the full Inspector list.
- **Pressing a card's body or item opens its full view in the Inspector, as a tab.** The full header of a collapsible card toggles its preview.
- **Argo's cards are Changes, Agents and Shells.** Each appears and disappears on its own. On desktop and web the column reorders them: a handle on the card's title line drags a card to a new place, and the arrow keys move a focused handle. The order lives in the column while it is drawn and is not stored. A lone card has no handle, and phones draw no column. The Agents card counts the Agents this Session started, not the installed Agents the Agents page lists.
- **A card is drawn only when the Session has one.** A section with nothing in it is not drawn at all, so an empty Workbench is an empty column, not three headers over nothing (same board). A Session with no Agents has no Agents card, as its header has no Agents button.
- **A card is the kit's collapsible `Card`, and its title line holds the title, the disclosure chevron after it and, where it can be moved, the drag handle.** No icon and no summary sits on that line; a summary belongs in the body. The column only places, stacks and reorders the cards it is given.
- **Cards are kit components, and the lists their Inspector tabs draw are `List` and `ListItem`** ([ADR-0032](../adr/0032-one-list-and-one-list-item-drawn-by-argo-everywhere.md)).
- **Plugins contribute cards into the named Slot, add-only** ([ADR-0035](../adr/0035-plugins-add-to-named-slots-and-never-edit-core-screens.md)). The Plugin draws inside its own card; Argo decides where the card goes, in what order and how much fits. A Plugin never moves, hides, reorders or restyles Argo's cards or another Plugin's. A Plugin's `header` action may open its card.
- **Each card uses glass and its own shadow.** The owner selected [WorkbenchGlass / Agents](https://app.paper.design/file/01M4RJWCAC00EA21V8BKY91FEV/p-4-0/21BX-0) on 2026-10-21. Use `--color-glass`, `--shadow-glass` and the sidebar's blur. The scroll viewport leaves room for each card's shadow without shrinking its content width.

## The Inspector

- **A Workbench card opens it** — pressing the card, or a Plugin's `header` action for its own card. The Workbench stays; the Inspector is a surface, not a section.
- **A tab shows a section's full list:** the branch's changed files, its Agents, its Shells, or a Plugin's items.
- **A row in that list opens the item's detail in the same tab:** one file's diff, an Agent's Feed, or a Shell's output. Back returns to the list. Each tab retains its selected detail and scroll position across tab switches.
- **Wide:** its own region beside the Feed. At 1440 the Workbench auto-hides. Both fit from 1456 with the list folded, or from 1768 with the list shown.
- **Medium:** the desktop floating design remains pending the ADR-0026 decision above.
- **Size-class changes retain open tabs.** Returning to wide restores the selected tab.

## The content column

- `--container-column` is 800. The Feed viewport and the Composer take the same centered column: `max-width` 848 at a 24 gutter on each side, `align-self: center`, on every desktop board.
- The region caps at 848, including its two 24px gutters. Its protected floor is 688: the 640px Composer plus those gutters. Manual Inspector resizing respects that floor.
- The Workbench and the Inspector sit outside the cap: they are regions of the window, not content in the column.

## Phones

Compact has no column, so the Workbench is a menu and a sheet. Every card and every Inspector tab is still reachable, as ADR-0039 requires: nothing is dropped and no card is desktop-only.

**There is no Workbench page and no Workbench route.** Nothing navigates away from the Session.

**The Session header carries a Workbench IconButton beside its "…".** Pressing it opens a nav menu — the same component as the "…" menu that holds Archive and Rename — listing the Workbench's sections in the order the desktop cards take, each with its icon and its muted count: Changes, Agents, Shells, then the sections Plugins add through the Slot.

**Picking a section opens it as a bottom sheet over the Session,** built on Argo's `Sheet` primitive. That sheet is the phone's Inspector tab: its root page lists the section's items. The root page carries a ✕ in its title row; a page pushed inside it carries Back.

**Pressing a row inside a sheet pushes that item's detail as a page in the same sheet:** an Agent's Feed, a Shell's output, a Change's detail. The list and the pushed page are the tab's two levels, as they are on a desktop Inspector tab.

**A Change's detail page carries a SegmentedControl with two segments, Change and Files** — the Change's stage, its checks and its closing action, or its file changes.

**A Change row's trailing slot is a "…", not a chevron,** and it opens the Change's actions. Every other row keeps its chevron.

## Long sections

This one holds on desktop and on phones alike.

Changes previews at most three Open Changes and groups the remainder; Shells keeps one count in the Workbench. The Agents card previews active Agents, while completed Agents stay grouped. The Workbench column scrolls when its previews need more height.

The length lives in the Inspector tab the card opens, and the tab's list groups its items by state and counts each group, live first. The Agents tab reads `Active · 0` with `No active agents` under it when none are running, then `Done · 2` with a row for each finished Agent. Shells group the same way. The tab is a full view and scrolls, so no group is folded away.

## Agents, not Subagents

Subagent is not a word in Argo any more (owner, 2026-10-21). An Agent a Session started is an Agent, in the UI, on this page, in `GLOSSARY.md` and in ADR-0039, and the Workbench section is the **Agents** card. That collides with Argo's Agents page, which lists the installed ACP Agents with the Registry below them: two different things carry one word, and the collision is unresolved. Where a sentence would otherwise be ambiguous, the docs say which of the two is meant. No second name has been coined, because that is the owner's call.

## The name in code

Inspector is the name in code, docs and Paper. `InspectorPane` and `SessionInspector` draw this surface; `--spacing-frame-inspector` and `w-frame-inspector` supply its default width. The owner retained Inspector on 2026-10-21, replacing the proposed Stage rename. Workbench names the separate summary column. No Inspector-to-Stage code rename is required.
