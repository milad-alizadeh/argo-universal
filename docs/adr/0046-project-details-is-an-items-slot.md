# Project details is an items Slot

This amends [ADR-0035](0035-plugins-add-to-named-slots-and-never-edit-core-screens.md) and [ADR-0025](0025-plugins-run-on-the-server-and-draw-argo-components.md) (owner, 2026-10-31). ADR-0035 already decided the rule: "Plugins add content, not layout. A Slot's schema names what a Plugin sends, such as an icon, text, a tone and an action. Argo draws it." It then carved out one exception, "**Project details** stays as ADR-0025 has it", because Project details was the first Slot and predates the rule. That carve-out is the last tree Slot in `addOnlySlots`; every other add-only Slot is an items Slot.

The carve-out is also a bug. A tree has to land inside some host's section, and the two hosts frame it differently: Project details frames it in a `FieldGroup.Section` and `PluginSlot` frames it in a `List.Section`. A Section draws one row frame and one separator per child, and the Slot hands it the Plugin's whole tree as a single child, so a Plugin that draws several rows gets one frame, no separators and its own padding inside someone else's card. Nothing warns, because a child's type does not say how many rows it draws. The Issue tracker is written for the `List.Section` host it does not get.

## Decision

- **Project details becomes an items Slot,** with the same shape as the Session row, activity and bar Slots: the Plugin answers data, Argo draws the rows. The tree Slot kind goes with it, and so does the live view subscription behind it: Project details was its only caller.
- **One item is one row:** `{ icon?, title, value?, tone?, action? }`. `title` names the row, `value` is the trailing value a settings row shows, and `action.path` opens one of the Plugin's own pages. A Plugin sends at most 6 rows for a Project.
- **Each Plugin's rows are its own titled section,** as they are now, in Slot order after Argo's own Folder, Accounts and New Sessions sections. A Plugin never sizes, styles or orders that section.
- **A row that writes drills in.** The item shape has no controls and no write-back. A Plugin that needs the user to choose something opens one of its own pages from `action.path` and draws the choice there with any kit components, exactly as a Workbench card and a header action already do under ADR-0035. The Issue tracker's Project details card becomes one row naming the chosen Tracker, and the choice itself moves to a page of the Plugin's own.
- **ADR-0025's promise holds.** "Each Project chooses its Tracker in Project details" stays true: the choice starts in Project details and the Plugin owns the screen it opens.

## Considered options

- **Keep the tree and teach the hosts to spread it into rows.** Rejected. React parents cannot see a child's rendered output, so the row elements have to exist at the call site, which means lifting the per-tree dispatcher into a provider above the page and having each row read its controls from context. It keeps every Plugin able to freeze a core card's layout, which is what ADR-0035 decided against, and it keeps the live view machinery for one card.
- **Widen the item shape with declarative controls** (`choice`, `toggle`) that send an event back. Rejected for now. No items Slot has ever had a write path, and this would add a control vocabulary and a write path to all of them to serve one card. Drilling in needs nothing new, and the shape can be widened later without breaking a Plugin.
