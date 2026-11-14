# Layout

[ADR-0039](../adr/0039-the-workbench-summarises-sections-and-the-inspector-shows-them-in-full.md) defines the Workbench and the Inspector. This page describes their layout. Paper supplies pane measurements from "Argo · Feed, Workbench & Inspector", page "Workbench & Inspector · Exploration". Existing tokens supply sizes.

[Spec 0020](https://github.com/milad-alizadeh/argo-universal/issues/1178) moves desktop controls into the window band. Its tickets define the derived thresholds below.

Two decisions remain pending: the desktop frame at 900px, and the status dot beside the band title. The current implementation retains ADR-0026 below 1100px and shows only the title in the band.

## The regions

- **Rail** — 56 (`--spacing-frame-rail`), inside the sidebar's glass panel, with its toggle in the window band. Sections live here. A Session's own content never gets a rail item. The desktop frame appears at wide widths ("Screen / Approved layout").
- **Sidebar** — the section's list, 312 (`--spacing-frame-list`) at the default text size and growing with the text up to 460, the widest a drag allows (the fold thresholds below move with it), beside the rail in the same glass panel. Rail plus list plus the 8 frame inset on each side make the 384 glass zone on "Screen / Approved layout"; the panel itself is `--radius-2xl` over `--color-glass`.
- **Content column** — the Feed viewport and the Composer share a centered column under the 800 cap. The band carries the title. The local Session header contributes no height. See [The content column](#the-content-column).
- **Workbench** — the Session's summary cards, one per section, drawn absolutely over the page's trailing edge and toggled from the band's `clipboard-list` IconButton. It takes no width from the page. One per Session. It is not a second sidebar and it is not a rail section.
- **Inspector** — the surface that shows a Workbench card's section in full, as a tab. A card opens it, the Workbench stays where the width budget permits, and it is never reached from the rail. A tab lists the section's items and a row opens that item's detail in the same tab.
- **Never in a header** — Changes, their checks, their counts and their file changes are the Workbench's on every platform. A Session header carries identity and state only (ADR-0039). The desktop band owns its title and actions. The proposed status dot needs owner approval.

## The widths

Size classes are `compact` (below `--breakpoint-medium`, 600, and every phone), `medium` (600 to 1099) and `wide` (`--breakpoint-wide`, 1100, and up), as `GLOSSARY.md` defines them.

The desktop frame reserves a 44px band (`--spacing-frame-control`). The band has no fill, border, or hairline. Panes start directly below it.

The leading group holds the platform controls and sidebar toggle, then, on web and the desktop app, Back and Forward, which step through the window's history as a browser's buttons do; a page opened by link or reload has no history behind it, so its Back goes up to its section's list. A page there hangs no Back beside its title (`ScreenBackInBand`); an iPad's wide pages keep theirs, and a panel's own Back, such as a Shell's output or a sheet's pushed page, is not screen history and stays. The trailing group is whatever the focused page contributes, and the band never filters by screen: it draws what it is given. A page that owns a Session supplies More, Workbench, Inspector expand and Inspector toggle, in that order, because each acts on the Session, its Workbench or its Inspector; the four arrive together, so a Session that declares no Action of its own still holds the More slot and the other three keep their places. A page that owns no Session — Settings and its sub-pages, Projects, Agents, Plugins, a Plugin's own screens — supplies none of the pane controls, and draws only the Actions its own Screen header declares, in More, if it declares any; a page that declares none has no trailing group at all. Each trailing control keeps its position as panes change, and the leading group and the title keep theirs where there is no trailing group. A Plugin's first Session header action sits just before More; phones keep every Plugin action inside More.

The title uses the content column's leading edge and stops before the trailing controls. Its spacer is `max(0, platformConstant - (frameInset + navigationWidth))`. The platform constant is 124 on macOS and 44 elsewhere, plus 64 for Back and Forward on web and the desktop app.

The following examples use the default pane widths and an available Workbench. The content region includes its two 24px gutters.

| Window | Inspector | Sessions list | Workbench | Content region |
| --- | --- | --- | --- | --- |
| 1440 | Closed | Shown | Auto-hidden | 848 |
| 1440 | Open | Shown | Auto-hidden | 688 |
| 1544 | Closed | Shown | Gutter, content moved aside | 848 |
| 1856 | Closed | Shown | Gutter, content centred | 848 |
| 1912 | Open | Shown | Gutter, content moved aside | 848 |
| 2224 | Open | Shown | Gutter, content centred | 848 |

The Inspector panel is 352px wide by default. Its region includes a 16px gap. The panel uses the sidebar's glass material, rounded corners, and an unclipped shadow. Its tabs sit below the window band.

**Medium remains a pending desktop exception.** The 900px Paper boards show a rail and floating panels. ADR-0026 requires the phone shell below 1100px on every platform. Production retains that rule until the owner decides whether Spec 0020 supersedes it.

**Compact** — see [Phones](#phones).

## Giving up width

These thresholds use default pane widths with an available Workbench.

Two regions compete with the content column for width: the Sessions list and the Inspector while it is open. The Workbench is not one of them: it is drawn absolutely over the page, the region left of the Inspector, so it never narrows the page, and the Feed's scroll view and scrollbar run to the page's trailing edge whether the Workbench shows or not.

1. **The Workbench hides first.** It shows only while the page's two gutters beside the capped content together hold it; below that it auto-hides. An explicit Show floats it over the content.
2. **Then the Sessions list collapses**, folding into the rail. The rail itself never collapses.
3. **The content column gives last**, and is capped at 800 however much room there is.

**The Workbench fits in the gutter when the page is at least `24 + 800 + 16 + 312 + 8 = 1160`:** the column's leading gutter, the column, the gap, a card and the inset. That is from 1544 with the Sessions list shown and from 1232 with it hidden, or 1912 and 1600 with the Inspector open.

**The content moves aside only as far as the cards need.** From a page of `800 + 2 × (312 + 16 + 8) = 1472` (1856 with the list shown, 2224 with the Inspector open too) the trailing gutter alone holds the cards and the content stays centred. Below that the Feed and the Composer move together towards the page's leading edge, just far enough to keep the 16px gap from the cards, and return to the centre when the Workbench hides. The move slides with the Workbench; a resize moves it at once. The Feed's scroll view still runs the page's width, so its scrollbar rests at the page's trailing edge either way.

**Opening another Session moves nothing.** A Session switch is a new page, not a pane toggle: the content column, the Workbench, the Inspector and the Sessions list take the new Session's places at once, as a resize does, including the changes its page makes as it mounts. Only the person's own toggles within a Session animate.

**The Sessions list folds below 1440 with the Inspector open, and below 1072 without it.** Closing the Inspector frees 368px: its 352px panel and 16px gap. Opening the Inspector can auto-hide the Workbench; closing it restores the Workbench when enough room returns. Explicit Show or Hide intent survives these changes.

The content floor is 688px: the Composer's 640px width and a 24px gutter on each side, unless a drag of the Inspector lowered it (see [The content column](#the-content-column)). Pane preferences change these thresholds. The sidebar and Inspector take priority over the Workbench.

The Workbench has four effective states. One toggle drives the person’s Show or Hide intent without rewriting it during a resize. Showing or hiding it never narrows the Feed or Composer, and never covers them where the gutters hold it.

- **Gutter** — the page's two gutters together fit a card and its gaps, so the cards sit at the page's trailing edge and the content, moved aside where the trailing gutter alone is too narrow, never sits under them.
- **Auto-hidden** — the gutters are too narrow and the toggle is unpressed: the Workbench is not drawn.
- **Overlay** — the gutters are too narrow and the person pressed Show: the Workbench is drawn over the trailing edge of the content, left of the Inspector when it is open. The column has no backing, so the Feed shows faintly through the cards' glass and nothing clips them. The page stays mounted and interactive underneath; the same band toggle hides it.
- **Hidden** — explicit Hide persists across resize. An expanded Inspector temporarily hides the Workbench without changing that intent.

## The Workbench

- **A stack of separate cards, one per section: an overview of what is happening in the Session.** Drawn at 312 with `--radius-2xl` cards and `--spacing-2` between them on "Spec / Workbench layout · collapsible cards".
- **Cards summarize their sections.** Changes shows a diff total and up to three Open Changes, with individual checks and menus. A grouped remainder counts further Changes by stage. Shells shows a count. The Agents card also previews active Agents, with role avatars, status marks and details. Completed Agents share one count and up to three overlapping role avatars. Its full header toggles the preview; pressing the body opens the full Inspector list.
- **Pressing a card's body or item opens its full view in the Inspector, as a tab.** The full header of a collapsible card toggles its preview.
- **Argo's cards are Changes, Agents and Shells.** Each appears and disappears on its own. On desktop and web the column reorders them: a handle on the card's title line drags a card to a new place, and the arrow keys move a focused handle. The handle shows only under the pointer, on keyboard focus and while its card is held; a touch screen shows none. Its lane keeps its width, so the title line never moves. The order lives in the column while it is drawn and is not stored. A lone card has no handle, and phones draw no column. The Agents card counts the Agents this Session started, not the installed Agents the Agents page lists.
- **A card is drawn only when the Session has one.** A section with nothing in it is not drawn at all, so an empty Workbench is an empty column, not three headers over nothing (same board). A Session with no Agents has no Agents card, as its header has no Agents button.
- **A card is the kit's collapsible `Card`, and its title line holds the title, the disclosure chevron after it and, where it can be moved, the drag handle.** No icon and no summary sits on that line; a summary belongs in the body. The column only places, stacks and reorders the cards it is given. A List or an EmptyState in a card's body draws as the card's rows: plain rows with no card of their own, no hairlines, their text on the card's own edge, and no end gap under the last row. A Sheet or a Dialog opened from a card is a page again.
- **Cards are kit components, and their Inspector tabs use the kit's `List`** ([ADR-0032](../adr/0032-one-list-and-one-list-item-drawn-by-argo-everywhere.md)). Agent and Background Task lists use `FieldGroup.Link` rows on native platforms; web and Electron wide lists use `ListItem`.
- **Issues open on their own pages.** The Issue tracker declares no Workbench card, header action or Inspector tab. A Session's Issue shows on its row, and its Session bar line is a Workbench card (#2012), and on a phone the line sits under the header.
- **Each Plugin's Session bar line is its own card** after Argo's cards and the Plugins' declared cards, titled with the Plugin's name. Pressing it opens the line's Plugin page; it has no Inspector tab. It hides with the Workbench like every other card; only a phone, with no Workbench column, keeps the line on its strip under the header.
- **Plugins contribute cards into the named Slot, add-only** ([ADR-0035](../adr/0035-plugins-add-to-named-slots-and-never-edit-core-screens.md)). The Plugin draws inside its own card; Argo decides where the card goes, in what order and how much fits. A Plugin never moves, hides, reorders or restyles Argo's cards or another Plugin's. A Plugin's `header` action may open its card.
- **Each card uses glass and its own shadow.** The owner selected [WorkbenchGlass / Agents](https://app.paper.design/file/01M4RJWCAC00EA21V8BKY91FEV/p-4-0/21BX-0) on 2026-10-21. Use `--color-glass`, `--shadow-glass` and the sidebar's blur. The scroll viewport leaves room for each card's shadow without shrinking its content width.

## The Inspector

- **A Workbench card opens it** — pressing the card, or a Plugin's `header` action for its own card. The Workbench stays; the Inspector is a surface, not a section.
- **A tab shows a section's full list:** the branch's changed files, its Agents, its Shells, or a Plugin's items.
- **A row in that list opens the item's detail in the same tab:** one file's diff, an Agent's Feed, or a Shell's output. Back returns to the list. Each tab retains its selected detail and scroll position across tab switches.
- **Wide:** its own region beside the page. At 1440 the Workbench auto-hides. Both show from 1912 with the list shown, or from 1600 when the user hides the list.
- **Medium:** the desktop floating design remains pending the ADR-0026 decision above.
- **Size-class changes retain open tabs.** Returning to wide restores the selected tab.
- **Closing the Inspector keeps its tabs.** The band's toggle reopens them with the same tab selected, and a card opened meanwhile adds its tab to them. Only closing every tab by hand empties it; the next opening then starts with the first Section offered.

## The content column

- `--container-column` is 800. The Feed viewport and the Composer take the same column: `max-width` 848 at a 24 gutter on each side, centred in the page, or moved aside together for a Workbench the trailing gutter alone does not hold.
- The region caps at 848, including its two 24px gutters. Its protected floor is 688: the 640px Composer plus those gutters. A window resize or a pane opening never takes the page below it.
- Dragging the Inspector's divider is the one way under that floor. The page keeps narrowing with the drag down to 200, and a drag past that expands the Inspector over the page. The list does not fold during the drag. The width the drag left is the content's floor until the Inspector closes, so a narrower window then folds the list before the page gives more, and expanding the Inspector keeps the list; closing the Inspector restores 688 and keeps its width, so it reopens where it was. The Sessions list keeps its dragged width across a close the same way. A divider moved while the Inspector is at its default width lowers nothing.
- The Workbench and the Inspector sit outside the cap. The Inspector is its own region of the window; the Workbench is drawn over the page's gutter.
- On a wide web or desktop window the Feed's scrollbar stays drawn while the Feed can scroll, at the page's trailing edge, which is the window's edge unless the Inspector is open. Its gutter is kept on both sides, so the Feed's column stays over the Composer's.

## A Screen's column

The session frame's column above (800 and a 24 gutter, 848 with its gutters) is the Feed's. A Screen, which draws every Plugin page and every Settings page, has its own: `--container-column` 800 inside `--spacing-8` margins on a wide window, so its region caps at 864, and `--spacing-4` below wide ([ADR-0049](../adr/0049-a-screen-frames-its-page-with-aside-bleed-and-footer.md)).

- **`aside`** holds the page's one Metadata. Its place comes from the Screen's width alone: a 280 column at the trailing edge when the reading column beside it keeps the medium width, a wrapping row of Pills under the title when it does not, and icon-only Pills below medium. The column moves towards the leading edge for the lane and never under it, with or without an aside, so opening an Issue from its list moves neither the title nor the body.
- **`width: bleed`** has no column and no margins; a Canvas in the body fills it. The title keeps its margin.
- **`footer`** is pinned under the body and rises with the keyboard. A body over a footer scrolls in a ScrollView or a List.

## Phones

Compact has no column, so the Workbench is a menu and a sheet. Every card and every Inspector tab is still reachable, as ADR-0039 requires: nothing is dropped and no card is desktop-only.

**There is no Workbench page and no Workbench route.** Nothing navigates away from the Session.

**The Session header carries a Workbench IconButton beside its "…".** Pressing it opens a nav menu — the same component as the "…" menu that holds Archive and Rename — listing the Workbench's sections in the order the desktop cards take, each with its icon and its muted count: Changes, Agents, Shells, then the sections Plugins add through the Slot.

**Picking a section opens it as a bottom sheet over the Session,** built on Argo's `Sheet` primitive. That sheet is the phone's Inspector tab: its root page lists the section's items. The root page carries a ✕ in its title row; a page pushed inside it carries Back. On Android, system Back closes the whole sheet instead of popping the pushed page; the page's own Back control pops one level. Material's dialog window consumes Back before React Native's `BackHandler` sees it, and props alone cannot change that.

**Pressing a row inside a sheet pushes that item's detail as a page in the same sheet:** an Agent's Feed, a Shell's output, a Change's detail. The list and the pushed page are the tab's two levels, as they are on a desktop Inspector tab.

**A Change's detail page carries a SegmentedControl with two segments, Change and Files** — the Change's stage, its checks and its closing action, or its file changes.

**A Change row's trailing slot is a "…", not a chevron,** and it opens the Change's actions. Other navigation rows follow the platform convention: iOS shows a disclosure chevron, and Android does not.

## Long sections

This one holds on desktop and on phones alike.

Changes previews at most three Open Changes and groups the remainder; Shells keeps one count in the Workbench. The Agents card previews active Agents, while completed Agents stay grouped. The Workbench column scrolls when its previews need more height.

The length lives in the Inspector tab the card opens, and the tab's list groups its items by state and counts each group, live first. The Agents tab reads `Active · 0` with `No active agents` under it when none are running, then `Done · 2` with a row for each finished Agent. Shells group the same way. The tab is a full view and scrolls, so no group is folded away.

## Agents, not Subagents

Subagent is not a word in Argo any more (owner, 2026-10-21). An Agent a Session started is an Agent, in the UI, on this page, in `GLOSSARY.md` and in ADR-0039, and the Workbench section is the **Agents** card. That collides with Argo's Agents page, which lists the installed ACP Agents with the Registry below them: two different things carry one word, and the collision is unresolved. Where a sentence would otherwise be ambiguous, the docs say which of the two is meant. No second name has been coined, because that is the owner's call.

## The name in code

Inspector is the name in code, docs and Paper. `InspectorPane` and `SessionInspector` draw this surface; `--spacing-frame-inspector` and `w-frame-inspector` supply its default width. The owner retained Inspector on 2026-10-21, replacing the proposed Stage rename. Workbench names the separate summary column. No Inspector-to-Stage code rename is required.
