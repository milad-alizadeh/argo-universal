# Argo owns its primitives

Screens import every control from `#primitives` and nothing else (owner, 2026-10-10). React Native Reusables, a set of shadcn copies drawn with React Native views, made the phone look like a web page and left two kits competing on screens that already use native controls. Argo now owns its primitives. This replaces the Reusables line in ADR-0001.

## Decision

- **One API, up to three drawings.** A primitive has one TypeScript type shared by all its platform files. Screens never import `@expo/ui`, `@rn-primitives`, SwiftUI or Compose types.
- **iOS** draws the SwiftUI control from `@expo/ui` inside a `Host` (`.ios.tsx`).
- **Android** draws the Jetpack Compose control from `@expo/ui` in Material 3, or Argo's own Compose composition where Expo UI's control is the wrong pattern (`.android.tsx`).
- **Web and desktop** use Expo UI's universal drawing when it meets the approved Paper master's look, states and behaviour; otherwise they use Argo's own React Native Web views, styled with Uniwind (the plain `.tsx` file). This replaces the blanket exclusion of Expo UI's web drawing (owner, 2026-10-10, #419). Screens still use Argo's shared primitive API.
- **Data props, not children.** SwiftUI and Compose buttons cannot take Argo `Text` children, so native-drawn primitives take `label`, `value`, `options` and similar props, and no `className`.
- **Argo draws its own content.** The Feed, Session rows, the Composer surface, request cards, code, badges, chips and icon buttons stay React Native views styled with Uniwind on every platform. Native drawing is for system controls inside system containers: grouped settings lists, the controls in them, menus, sheets, alerts and dialogs.
- **`@rn-primitives` stays only underneath web primitives** that need Radix keyboard, focus and collision handling (dialog, popover, dropdown-menu, portal, and select while it is needed). Only web primitive files and the portal host import it.

## When Expo UI's web drawing does not fit

In SDK 57, radii, heights, padding, font stack and destructive red are fixed in a `StyleSheet`. The shared `style` prop is limited to padding, background, radius, border, opacity, width and height. The controls have no `className`. Button has three variants. Colours are CSS variables. Compare each control with its approved Paper master, including interaction states, before choosing its drawing. FieldSection's white bordered card and dividers do not match Argo's grouped muted cards; ListItem lacks the required hover, focus and selected drawings. Those controls keep Argo's own web drawings.

## Why Android does not use Expo UI's FieldGroup

Expo UI's universal FieldGroup cannot be used or wrapped on Android:

- It hard-codes the tile colour (surfaceContainer) and a content padding of 16, with no navigation-bar inset.
- It matches sections by component identity, so an Argo wrapper becomes a row inside an implicit section.
- Its FieldSection puts every child inside a Compose ListItem's headline, so a nested ListItem draws a second ListItem inside the muted tile. That doubles the inset, makes rows taller and stops the ripple short of the tile.

Argo's Android FieldGroup and FieldSection are Argo's own Compose compositions, adapted from Expo's: colours come from the theme bridge, the bottom inset from safe-area context, and each row is drawn from its props with `clickable` on the clipped tile. The same applies to the Picker, a two-line row that opens a radio dialog, and to menus.

## Custom symbols in native rows

This amends ADR-0019. SwiftUI `Image` draws only system symbols, so `custom.<name>` symbols such as `custom.robot` cannot render inside a native row. Native rows draw Argo's `Icon` inside an `RNHostView` sized to its contents, with leading phone list icons using `size="lg"`. Icon dimensions are encapsulated in the Icon component, and callers choose a named size (owner correction, 2026-10-10). Disclosure chevrons stay system-drawn. Android Paper frames use Material Symbols, as ADR-0019 sets.

## Considered options

- Keep Reusables and restyle it: two kits stay side by side, and the phone still looks like the web.
- Use Expo UI's universal components everywhere, web included: controls that cannot match the approved Paper masters keep Argo's drawings, and Android's field group is the wrong pattern.
- Draw everything natively, Feed included: dense Argo content needs Argo's own design and layout control.
