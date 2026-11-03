# Animating a Collapsible's height

How the kit's `Collapsible` should open and close: no overshoot, no snap at the end, content that changes while open is followed, reduced motion takes one step. Researched 2026-11-03 for #1865.

## The problem

Opening to `height: auto` means animating towards a size that is not known in advance and can change while the motion runs (a Plugin tree arriving, a diff loading). Every option either measures the content and animates a number, or lets the layout engine size it.

- Measuring once and animating to that number (Radix, Base UI, Motion) is stale as soon as the content changes: it overshoots or snaps at the end.
- Measuring every frame (#1939's ResizeObserver machine) follows the content but runs JS and React on every frame, which is what drops frames at 4× CPU.

## Web options

| Option | Support | Follows live content | Notes |
| --- | --- | --- | --- |
| `grid-template-rows: 0fr → 1fr` transition, child `min-height: 0; overflow: hidden` | Chrome/Edge 107, Firefox 66, Safari 16 ([caniuse](https://caniuse.com/css-grid-animation)) | Yes: the browser sizes the row from the content each frame | No measuring, no JS per frame. The row is `t × content height` because a flex sum below 1 is treated as 1 ([CSS Grid 2 §12.7.1](https://www.w3.org/TR/css-grid-2/#algo-find-fr-size)), so it can never pass its end. |
| `interpolate-size: allow-keywords` / `calc-size()` | Chrome/Edge 129 only; Firefox and Safari not shipped ([web-features](https://web-platform-dx.github.io/web-features-explorer/features/interpolate-size), [Chrome](https://developer.chrome.com/docs/css-ui/animate-to-height-auto)) | Yes | Would be the cleanest, but Electron and Chrome only. Safari (iOS web) gets no motion. |
| `<details>` + `::details-content` | Chrome 131, Safari 18.4, Firefox 143 ([web-features](https://web-platform-dx.github.io/web-features-explorer/features/details-content)) | Only with `interpolate-size` | Still needs `interpolate-size` to animate height, and the trigger must be a `<summary>`, which breaks `CollapsibleHeader`'s layout. |
| Radix Collapsible 1.1.20 (`--radix-collapsible-content-height`) | All browsers | No | Read in the installed dist: it measures once in a layout effect on `[open, present]`, forcing `transitionDuration: 0s` and `animationName: none` on the content node while it measures. Keyframes to that stale number overshoot or snap; a CSS transition on the content is applied instantly. Presence unmounts on `animationend` only. |
| Base UI Collapsible 1.9.0 (`--collapsible-panel-height`) | All browsers | No | Measures `scrollHeight` when opening begins; unmounts after `getAnimations()` finish ([source](https://github.com/mui/base-ui/blob/master/packages/react/src/collapsible/panel/useCollapsiblePanel.ts)). Same stale number as Radix. |
| Headless UI Disclosure | All browsers | n/a | No height support; docs animate opacity/translate or hand off to Motion ([docs](https://headlessui.com/react/disclosure)). |
| Motion `AnimatePresence` + `height: 'auto'` | All browsers | Measures at the start | JS on the main thread every frame. Not in the stack. |

## Native options

| Option | Platforms | Thread | Measures | Content changes | Reduced motion | Cost / upkeep | Fits the repo rules |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Reanimated measured accordion: height shared value from `onLayout`, draw `height × progress` ([example](https://docs.swmansion.com/react-native-reanimated/examples/accordion)) | iOS, Android, web | UI | `onLayout` of the absolutely placed content | Followed: a new `onLayout` changes `height`, the drawn height follows on the next UI frame | `ReduceMotion.System` ([docs](https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility/)) | Already a dependency | Yes |
| Reanimated 4 layout animations (`LinearTransition`) ([docs](https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/layout-transitions/)) | iOS, Android, web | UI | Implicit | Animates each layout change of the item, not a clip | `reduceMotion` | Already a dependency | Needs entering/exiting on the content too; the clip is not the docs' use case |
| Reanimated 4 CSS transitions to `height: 'auto'` | iOS, Android, web | UI | Undocumented | Undocumented | `ReduceMotion` | Already a dependency | The [transitionProperty docs](https://docs.swmansion.com/react-native-reanimated/docs/css-transitions/transition-property/) say nothing about `auto`; not relied on |
| `@expo/ui` 58.0.22 universal `Collapsible` (installed source) | iOS SwiftUI `DisclosureGroup`, Android Compose `AnimatedVisibility` in an M3 card, web an unanimated `<details>` | Native | Native | Native | System | Already a dependency | No: `label` is a string, so `CollapsibleHeader` and Card's title row cannot be the trigger; fixed padding and tint; RN children need a `Host`, and a native host per Feed row breaks Legend List; web gets no motion |
| react-native-collapsible 1.6.2 (2024-08) | iOS, Android | JS (RN Animated) | `onLayout` | Re-measures | None built in | New dependency, low activity | No: a second primitive interface |
| Moti 0.30.0 (2025-01) | iOS, Android, web | UI (Reanimated) | Via its `View` `onLayout` | Re-measures | Reanimated's | New dependency; no released Reanimated 4 support | No |
| @legendapp/motion 2.5.3 | iOS, Android, web | JS | No height-auto helper | n/a | None | New dependency | No |
| react-native-reanimated-collapsible | — | — | — | — | — | npm page unreachable; not evaluated | — |

## The Feed is different

Legend List (3.7.1) places every row absolutely and learns a row's new size only after it is drawn. A row that grows on its own, by a CSS transition or on the UI thread, overlaps the row below for a frame, and the list re-lays out every frame. Tried on 2026-11-03: the grid version inside the Feed failed three Feed tests with a ResizeObserver loop error on every frame. So the Feed keeps its JS-stepped path: each frame it steps the height and tells the list the change in the same frame (`CollapsibleLayoutSyncContext.grow`), so the row and the rows below commit together.

## Reduced motion

`@media (prefers-reduced-motion: reduce)` is the web signal ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)); Tailwind's `motion-reduce:` variant writes it. Reanimated reads the OS setting through `ReduceMotion.System`.

## Pick

- **Web, everywhere outside the Feed:** the grid row transition. Pure CSS: no measuring, no ResizeObserver, no React per frame, and it follows content that changes while open by construction. The content unmounts once `getAnimations()` settle after a close (the Base UI idea, without its measuring). `motion-reduce:transition-none` makes it one step.
- **iOS and Android outside the Feed:** Reanimated's measured accordion on the UI thread, with `ReduceMotion.System`.
- **The Feed, every platform:** the existing JS-stepped path, for the Legend List reason above.
- **Dropped:** Radix Collapsible (its measure-once variable is the cause of the overshoot and snap, and it blocks transitions on its node), #1939's ResizeObserver machine, `@expo/ui`'s Collapsible (cannot take the kit's header), and new animation libraries (a second primitive interface for no gain over Reanimated).
- **Later:** when Safari and Firefox ship `interpolate-size`, `height: auto` with a transition can replace the grid wrapper.
