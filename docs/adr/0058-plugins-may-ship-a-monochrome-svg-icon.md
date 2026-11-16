# Plugins may ship a monochrome SVG icon

This amends [ADR-0025](0025-plugins-run-on-the-server-and-draw-argo-components.md)'s ruling that a Plugin's icon is an official symbol name (owner, 2026-11-16). A Plugin such as Jira or Linear has a mark of its own that no SF Symbol or Material Symbol draws, so its rail tile showed a generic glyph. Since the same ruling, the rail and the drawer draw every icon outlined and mark the selected one by its tint (ADR-0025), so an icon with no filled twin now looks right beside Argo's own.

## Decision

- **`icon.svg` names an SVG file in the Plugin's folder**, beside `sf`, `sfFilled` and `material`. A manifest gives at least one of them. Example: `"icon": { "svg": "icon.svg", "sf": "ticket", "material": "confirmation_number" }`.
- **The Server makes it one colour when it loads the Plugin.** It refuses a file over 32 KB, one with a declaration, or one that is not SVG. It repaints every `fill` and `stroke` other than `none` to `currentColor` and refuses a gradient or a pattern. It drops the root's width and height and paints the root `currentColor` for shapes that set no colour. Then it sanitizes the result as a Plugin's `Svg` is sanitized (ADR-0028). `argo plugin validate` reads the file the same way, so a Plugin author sees the refusal before shipping.
- **The App draws the markup in the icon's tint.** The Plugin list carries it as `iconMarkup`. The kit's `Icon` takes a Plugin's markup as a third kind of drawing, after a system symbol and an SVG component (ADR-0041), and draws it with `SvgXml` in `currentColor`. The rail tile and the drawer row therefore take the same muted, hovered and selected tints as Argo's symbols, in light and dark.
- **The symbol names stay the fallback.** A native menu, a SwiftUI toolbar or an iOS context menu holds no React Native view, so it draws `sf` or `material`, and Argo's Plugin icon when the Plugin gave neither. Markup is App-side only: it never travels in a Plugin tree, so a Plugin page cannot send markup in an icon prop.
- **A brand logo in colour is the sign-in's, not the rail's.** `SignInOptions.logo` keeps its colours; the manifest's icon never does.

## Considered options

- **Raster images (PNG).** Rejected: they blur at rail sizes and cannot take the selected tint or dark mode.
- **SVG drawn as the Plugin coloured it.** Rejected: a coloured tile sits wrong among Argo's quiet ones, and nothing would keep a Plugin to one colour.
- **Keep symbol names only.** Rejected: the owner wants a Plugin's own mark in the rail.
