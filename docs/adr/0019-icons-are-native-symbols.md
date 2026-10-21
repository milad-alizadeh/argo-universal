# Icons are native symbols

Every icon is a native system symbol drawn through `expo-symbols` (owner, 2026-10-09), except the git icons (see Git icons), the web disclosure chevron (see Web disclosure chevron) and logos (see Logos). Phosphor is removed: its one look sat wrong beside native controls on iOS and Android, and each platform ships a full symbol set that follows its own weight and size rules.

| Platform | Symbol set | Drawn by |
| --- | --- | --- |
| iOS | SF Symbols | `SymbolView`, natively |
| Android | Material Symbols | `SymbolView`, natively |
| Web | Material Symbols | `SymbolView`, from the Material Symbols font |
| Electron on Windows and Linux | Material Symbols | as on web |
| Electron on macOS | SF Symbols | macOS, at runtime |

One map, `packages/kit/src/symbols/icon-names.ts`, gives each Argo icon name its SF and Material name, typed against `expo-symbols`, so a wrong name fails the type-check. Screens write `<Icon name="close" role="control" />`; colour comes from the text class. The one exception is a Plugin's icon (owner, 2026-10-16, [ADR-0025](0025-plugins-run-on-the-server-and-draw-argo-components.md)): a Plugin names its own SF and Material symbols, so `Icon` also takes an `{ sf, sfFilled?, material }` pair that bypasses the map. Screens never write a pair; only Plugin navigation passes one.

## Icon roles

An icon takes a role, never a size (owner, 2026-10-12): where it sits decides its size, and an icon beside text steps up on the phone as the text does. `packages/kit/src/symbols/icon-role.ts` is the one table of roles and their wide and phone sizes, on the 12, 14, 16, 20 and 24 scale. SwiftUI and Compose trees, which cannot hold `Icon`, read the same table through `useIconPixels(role)` or draw with `SwiftUISymbol`, so native icons cannot drift from the rest. The `argo/icon-role` lint rule rejects a size prop, a `size-*` class on an icon, a hand-written `systemName` and a numeric Compose `size` modifier outside the kit's `symbols/`.

Apple's licence allows SF Symbols only in apps for Apple platforms, so no SF Symbol image is committed or shipped in the web build. On macOS, the Electron main process draws the symbol with `nativeImage.createFromNamedImage` and the preload script returns it as a PNG data URL. The page uses that image as a CSS mask filled with the text colour, caches it, and keeps an empty box of the same size while it loads. The IPC request is validated; an unrecognised request is rejected, reported and counted.

## Custom symbols

Where SF Symbols has no symbol for an Argo icon, Argo draws a custom SF Symbol (owner, 2026-10-10). The first is `custom.robot`, the Agent icon; SF Symbols 8 has no robot. Each custom symbol is one Regular-M template path in `packages/kit/src/symbols/custom-symbol-paths.json`, named `custom.<name>` so it cannot clash with Apple's names:

- iOS: the Expo plugin `apps/universal-app/plugins/with-custom-symbols.mjs` writes it into the app's asset catalog as a symbol set, and `SymbolView`, patched to fall back to `UIImage(named:)`, draws it natively, so it follows weight and size like the system symbols.
- Electron on macOS: the page masks the path itself; no IPC is needed, since the art is Argo's own and its licence allows shipping it.
- Android, web, Windows and Linux: the Material name, as for every icon.

`SymbolView` fits a custom symbol's box to the icon box, so where the page or Android draws a custom path, its box fills the icon box too, and the symbol is one size on every platform.

A filled icon uses the platform's filled variant (owner correction, 2026-10-11). Apple drawings select the mapped SF filled name. Android and web pass a bundled Material Symbols filled font to `expo-symbols`; it has the same weight and optical size as Expo's outlined font. The font is subset to Argo's icon map and retains Google's Apache licence. A Plugin icon's Material glyph therefore never draws filled. No SF paths are shipped as a Material fallback. The Icon component owns this choice and isolates glyph weight from surrounding text.

Paper designs may use SF Symbols exported as SVG as mockups only; they never reach the code.

## Git icons

Git icons are the first exception to native symbols (owner, 2026-10-16). Neither SF Symbols nor Material Symbols has a full set for branches and pull request states, and mixing the nearest names drew a different, incomplete set on each platform. Branch, pull request, every PR state (open, draft, merged, closed, conflict), Merge PR and Changes use Tabler Icons v3.49.0 (MIT, © Paweł Kuna), drawn from the same paths on every platform. These icons take priority over SF Symbols, Material Symbols and any other set. The source SVGs and licences are committed in `packages/kit/src/symbols/assets/tabler`.

- The source SVGs and Tabler's licence are committed in `packages/kit/src/symbols/assets/tabler`. The Swift package `tools/sf-symbols/tabler-symbols` outlines their 2-point strokes and unions them with Core Graphics, so every platform gets filled paths, and writes `tabler-symbol-paths.json` in the custom symbols' units and box.
- iOS: `with-custom-symbols` writes them into the asset catalog with the other custom symbols, and `SymbolView` draws them.
- Electron on macOS and web, Windows and Linux: the page masks the path, as for the other custom symbols.
- Android: `react-native-svg` draws the path, filled with the icon's colour.

`git-symbols.ts` maps each Argo git icon to its Tabler name, as `{ tabler: 'git-branch' }`; such an entry has no SF or Material name. Its asset-catalog name is `custom.<Tabler name>`, like the other custom symbols. Native menu rows draw no image for these icons, as for every custom symbol.

## Logos

Logos are plain SVG assets, not symbols (owner, 2026-10-19). A brand mark such as GitHub's is a logo, not a glyph: the Tabler pipeline, built for 2-point strokes on a 24-point grid, outlined the GitHub mark's filled 16-point shape as if it were strokes and drew it distorted. Native symbols and the Tabler pipeline stay for glyphs.

- The SVG files and their licences are committed in `packages/kit/src/symbols/assets/logos`, with `currentColor` fills. The first is GitHub's Octicons mark (MIT), which the Agent card's repository link draws (owner decision, 2026-10-16).
- `logo-source.ts` imports each file and gives it a name to speak; `Icon` draws one through its `source` prop, and `IconButton` through `iconSource`. A logo has no Argo icon name, so it never reaches the symbol map, the asset catalog or a Plugin.
- One renderer draws it on iOS, Android, web and Electron: `react-native-svg`, from a component the bundler makes of the file. Metro uses `react-native-svg-transformer` for the app and the desktop app's web build, and Storybook's Vite uses `vite-plugin-svgr` with SVGR's native output.
- It draws at the role's size from `icon-role.ts`, filling the share of the box that `circle` fills, so a round mark matches the symbols beside it, and takes the icon's text colour as every other icon does.

## Web disclosure chevron

A grouped row's disclosure chevron on web and Electron also comes from Tabler (owner, 2026-10-18): `chevron-right`, from the same release and folder as the git icons. Material's `chevron_right` is too thin beside iOS 26's, and SF Symbols cannot ship to the web, while Tabler's chevron has `chevron.forward`'s 7x12 shape and weight in a 20 box. `list-view-symbols.ts` maps it as `web-disclosure`, `{ tabler: 'chevron-right' }`; only the web grouped row draws it. iOS keeps the system `chevron.forward` and Android Material's `chevron_right` (`disclosure`), so `with-custom-symbols` leaves `custom.chevron-right` out of the asset catalog.

## Considered options

- Keep Phosphor: one look everywhere, but foreign on both phone platforms.
- Ship SF Symbol SVGs to the web: ruled out by Apple's licence.
- GitHub's Octicons mark for the repository icon: selected by the owner (2026-10-16), alongside Tabler icons for the remaining git actions; drawn as a logo since 2026-10-19.
- A logo through the Tabler pipeline: one path everywhere, but the pipeline outlines strokes, so a filled mark draws distorted.
- `expo-image` for logos: it draws SVG on every platform and tints it, but it is not yet a dependency, its iOS decoder can distort compact arc flags, which the GitHub mark uses, and the web draws an `<img>` rather than the same `react-native-svg` tree.
- A Swift helper on macOS: not needed, since Electron draws SF Symbols itself.
