# Plugins add to named Slots and never edit core screens

This amends [ADR-0027](0027-plugins-act-through-one-api-hook-core-and-replace-named-components.md) and widens [ADR-0025](0025-plugins-run-on-the-server-and-draw-argo-components.md) (owner, 2026-10-20). The Issue tracker needs to show an Issue's number on Session rows and in a Session. ADR-0025 has one Slot, Project details. ADR-0027 lets a Plugin rewrite or replace a few core components, so a Plugin can hide the plan, drop a CI failure, or undo another Plugin's change. The owner's kit rule from 2026-10-14 (Spec 0015 #724, Tier 2) already says Plugins add to Argo rows through decoration points and never override them. A council review of a props-rewrite design for the Session row found the same traps that WordPress and Gutenberg prop filters hit: accidental order, changes nobody can trace, and prop shapes that freeze the host's layout.

## Decision

- **Three levels.**
  - Core screens are Argo's. A Plugin can't move, hide, rename or restyle anything on them.
  - Named Slots on core screens take Plugin content of a fixed shape. Argo decides where it goes, in what order, and how much fits.
  - A Plugin's own sections (its rail icons and pages, ADR-0025) are its own, drawn with any kit components.
  
  Copied from VS Code: an extension adds a file decoration to the Explorer and never edits the Explorer's rows, and it draws its own rows in its own view.
- **Plugins add content, not layout.** A Slot's schema names what a Plugin sends, such as an icon, text, a tone and an action. Argo draws it. A Slot that holds a Plugin page, such as a Workbench card, is the exception: inside it the Plugin draws whatever it likes, as on its own pages.
- **Plugins stack, they don't compete.** Each Plugin's items are its own. A Plugin never sees or changes Argo's items or another Plugin's. Items are kept in a stable order: Argo's first, then Plugins in their declared order, ties broken by Plugin id. Past a Slot's limit, the rest collapse into "+N", which lists each item with its Plugin's name. A part that only one source can fill, such as the Session row's activity line, is Argo's unless the user chooses one Plugin for it in Settings.
- **Each Plugin is checked on its own.** An item that fails its schema, throws or runs late is dropped, and the Server logs one line per Plugin, Slot and reason. Every other Plugin's items still show, and Argo's always do.
- **The first named Slots:**
  - **Session row.** Title, status, warnings (such as CI failed or a waiting Permission request), press, swipe and the context menu are Argo's. Plugins add meta-line items: an icon and short text, limited, then "+N". The activity line is Argo's unless the user gives it to one Plugin. The Issue tracker fills the Issue item the row already has.
  - **Composer tray.** Permission and Elicitation requests, the plan, the message queue and the work chips are Argo's and always show. Plugins add one row of chips beneath them, one line high, limited, then "+N". A chip opens the Plugin's sheet or page.
  - **Session bar.** One line below the Session header, under Argo's own banners. When several Plugins fill it, Argo shows one and the rest sit behind "+N".
  - **Header actions.** A Plugin declares an action with an icon, a label and a placement: `header` or `menu`. A `header` action sits beside Argo's icons on desktop and overflows into "…" past the limit; on phones it is always in "…". A `menu` action is always in "…". An action can open the Plugin's Workbench card, run a Plugin action or open a Plugin page.
  - **Workbench card.** A Plugin page inside the Session's Workbench. Argo owns the Workbench, the order and closing. A header action that opens the card toggles it: a column on wide screens, a sheet on medium widths and phones.
  - **Project details** stays as ADR-0025 has it.
- **Slots declared in the manifest draw without starting the Plugin.** Header actions, menu items and Workbench cards are listed in `contributes`, as ADR-0025's nav items are. Content that changes with a row, such as meta items, is asked for once per list in one batched call keyed by Session, and cached until the Plugin says its data changed. Copied from VS Code's `provideFileDecorations` with `onDidChangeFileDecorations`.
- **The Composer stops being replaceable.** `argo/composer/above/v1` becomes the add-only Composer tray Slot. A Plugin can no longer replace the tray or rewrite its props, and the guard against added core actions goes with it.
- **Feed rows stay replaceable for now.** `argo/feed/tool-call/v1` and `argo/feed/message/v1` keep ADR-0027's rules until the Feed's views are kit components. Their Hooks gain a declared `order` number, as WordPress's filter priority does, and the Server logs every Plugin that changed props and every Plugin skipped because an earlier one returned a tree.
- **Each Slot gets a Paper design before code,** as every new visible state does.

## Considered options

- **Pass the drawn component's props and let Plugins rewrite them** (a Session-row Replaceable Slot carrying `ListItem`'s title, meta and core items as opaque handles). Rejected by the council and the owner. A Plugin could hide a CI failure or a blocked Agent. The last Plugin in the chain would decide the row. `ListItem`'s props would become frozen Plugin API, so a row redesign would break Plugins. Gutenberg's docs now steer plugins away from prop filters for the same reasons.
- **Lock the whole row and allow only a badge,** as VS Code's Explorer does. Rejected: the meta and activity lines are where an Issue tracker or CI Plugin has something to say, and the owner wants them open.
- **Let a Plugin replace the Composer tray.** Rejected: the plan, requests and message queue must always show above the Composer.
- **A second sidebar for Plugin lists.** Rejected: there is one sidebar, and a Plugin's rail section fills it (owner, 2026-10-19).
