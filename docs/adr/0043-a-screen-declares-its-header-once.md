# A Screen declares its header once

A Screen declares its own header in one place, beside its content: `title`, `search`, `primaryAction` and `actions` (sections of verbs). Content inside the Screen can no longer add Actions to it (owner, 2026-10-23). This replaces the header registry, where any `ActionList` in a Page's content registered its Actions with the Page. The kit's `Page` is renamed `Screen` everywhere, `Sheet.Page` included (owner, 2026-10-23). It supersedes the line in [ADR-0020](0020-argo-owns-its-primitives.md) that makes search a header action found by the registry, and the header and context variants of `ActionList`. ActionList was never in an ADR; the glossary defined it.

The registry (`usePageActions`, `ActionListHeaderContext`, `PageHeaderActions`) let a Detail or a Table add its own Actions to the header. It cost more than it gave. The header's contents were spread across the tree, so no one place showed what a screen's header held. Order and the overflow label had to be patched so they would not jump when a list re-registered. And phones could not hand it to Expo Router, which wants the header as data on the screen.

## Decision

- **A Screen is one stack entry: its header and its content together.** A route renders one `Screen`; a Sheet stacks `Sheet.Screen`s; the picker's pushed page is a `Screen`. On phones `Screen` sets the route's `Stack.Screen` options itself, so a screen's header and its content are written in one place. The name follows Expo Router's: every entry on a stack is a screen (owner, 2026-10-23).
- **A Screen declares its header as props.** `title`, `search`, `primaryAction` and `actions`. `actions` is sections of verbs, with an optional Section title and `tone: 'danger'` last, as `ActionList` Sections are today. A screen that needs a header Action passes it to its Screen; its content cannot.
- **Phones give the declaration to Expo Router's Stack.**
  - iOS: `Stack.Toolbar` items, and `Stack.SearchBar` for `search`.
  - Android: `headerRight` draws the stock Compose icon buttons and the overflow `DropdownMenu`, and `Stack.SearchBar` draws `search`. Expo Router has no toolbar-items API on Android.
- **Desktop and web draw the kit's own heading row** from the same declaration, and keep keyboard shortcuts.
- **Row and tile menus are not headers.** They are `ListItem`'s `actions` (ADR-0032 anatomy), drawn as each platform's context menu. `ActionList variant="context"` goes.
- **The header holds verbs only.** A Choice Action (`selected`, as for a filter or sort) is not a verb. It moves to `Menu` with `groups` (ADR-0042), which keeps sections and checks.
- **Plugins declare the same Screen props on the wire.** The wire version and minimum move up (ADR-0034). A Plugin Screen's header is the declaration it sends, not Actions nested in its content.
- **Plugin header contributions are a named Slot.** ADR-0035's "Header actions" Slot is how Plugins add to a core header. It stays a named, versioned Slot that Argo places after the Screen's own `actions`. It is not a free registry.

## Consequences

- Deleted: `usePageActions`, `ActionListHeaderContext` and its `HeaderSink`, `PageHeaderActions`, the header-registration path in `ActionList`, and the `context` and header variants. `ActionList` the component goes; its Actions shape (Actions, Sections, shortcuts) stays, and Screen `actions`, `ListItem actions`, `Menu` and `SplitButton` read it.
- `Page`, `PageProps` and `Sheet.Page` are renamed `Screen`, `ScreenProps` and `Sheet.Screen`, in the kit, the client, the Plugin wire and plugin-kit, in the same wire version bump.
- The registry has three kit and client consumers. Detail's `actions` prop and the Table's compact Sort by call `PageHeaderActions`; the Sessions root page's filter is an `ActionList` in its Screen header, and the session row menu is the context case. Detail and Table hand their Actions to the Screen through props their screen forwards, and the Sort and filter choices become `Menu` groups. No Plugin Slot and no core screen relies on the registry in a way the declaration cannot carry. The ADR-0035 header Slot is declared in the manifest and does not use it.
- The Inspector's `ActionListHeaderContext` reset (so its actions draw in place) goes with the context.
- A Plugin built for the older wire stops loading until it moves header Actions to Screen props.
- Content that wants a header Action it does not own has to be lifted to the screen. This is the cost of the choice.

## Considered options

- **Keep the name `Page`.** Rejected: a route is a screen in Expo Router, and the component owns the route's `Stack.Screen` options, so `Screen` says what it is.

- **Keep the registry.** Rejected: a header assembled from the tree has no single place to read it, needs order and label patches, and cannot be given to the Stack as data.
- **Draw Android headers fully with Expo Router.** Rejected: it has no toolbar-items API on Android, so Android draws `headerRight` itself.
- **Keep `selected` choice Actions in headers.** Rejected: menus hold verbs, lists hold state. Choices belong to `Menu` with groups.
- **Keep `ActionList variant="context"` for rows.** Rejected: `ListItem actions` already carries the row menu.
