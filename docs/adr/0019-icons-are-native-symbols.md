# Icons are native symbols

Every icon is a native system symbol drawn through `expo-symbols` (owner, 2026-10-09), except the git icons (see Git icons). Phosphor is removed: its one look sat wrong beside native controls on iOS and Android, and each platform ships a full symbol set that follows its own weight and size rules.

| Platform | Symbol set | Drawn by |
| --- | --- | --- |
| iOS | SF Symbols | `SymbolView`, natively |
| Android | Material Symbols | `SymbolView`, natively |
| Web | Material Symbols | `SymbolView`, from the Material Symbols font |
| Electron on Windows and Linux | Material Symbols | as on web |
| Electron on macOS | SF Symbols | macOS, at runtime |

One map, `packages/client/src/lib/generic/symbols/icon-names.ts`, gives each Argo icon name its SF and Material name, typed against `expo-symbols`, so a wrong name fails the type-check. Screens write `<Icon name="close" role="control" />`; colour comes from the text class.

## Icon roles

An icon takes a role, never a size (owner, 2026-10-12): where it sits decides its size, and an icon beside text steps up on the phone as the text does. `packages/client/src/lib/generic/symbols/icon-role.ts` is the one table of roles and their wide and phone sizes, on the 12, 14, 16, 20 and 24 scale. SwiftUI and Compose trees, which cannot hold `Icon`, read the same table through `useIconPixels(role)` or draw with `SwiftUISymbol`, so native icons cannot drift from the rest. The `argo/icon-role` lint rule rejects a size prop, a `size-*` class on an icon, a hand-written `systemName` and a numeric Compose `size` modifier outside `lib/generic/symbols`.

Apple's licence allows SF Symbols only in apps for Apple platforms, so no SF Symbol image is committed or shipped in the web build. On macOS, the Electron main process draws the symbol with `nativeImage.createFromNamedImage` and the preload script returns it as a PNG data URL. The page uses that image as a CSS mask filled with the text colour, caches it, and keeps an empty box of the same size while it loads. The IPC request is validated; an unrecognised request is rejected, reported and counted.

## Custom symbols

Where SF Symbols has no symbol for an Argo icon, Argo draws a custom SF Symbol (owner, 2026-10-10). The first is `custom.robot`, the Agent icon; SF Symbols 8 has no robot. Each custom symbol is one Regular-M template path in `packages/client/src/lib/generic/symbols/custom-symbol-paths.json`, named `custom.<name>` so it cannot clash with Apple's names:

- iOS: the Expo plugin `apps/universal-app/plugins/with-custom-symbols.mjs` writes it into the app's asset catalog as a symbol set, and `SymbolView`, patched to fall back to `UIImage(named:)`, draws it natively, so it follows weight and size like the system symbols.
- Electron on macOS: the page masks the path itself; no IPC is needed, since the art is Argo's own and its licence allows shipping it.
- Android, web, Windows and Linux: the Material name, as for every icon.

A filled icon uses the platform's filled variant (owner correction, 2026-10-11). Apple drawings select the mapped SF filled name. Android and web pass a bundled Material Symbols filled font to `expo-symbols`; it has the same weight and optical size as Expo's outlined font. The font is subset to Argo's icon map and retains Google's Apache licence. No SF paths are shipped as a Material fallback. The Icon component owns this choice and isolates glyph weight from surrounding text.

Paper designs may use SF Symbols exported as SVG as mockups only; they never reach the code.

## Git icons

Git icons are the one exception to native symbols (owner, 2026-10-16). Neither SF Symbols nor Material Symbols has a full set for branches and pull request states, and mixing the nearest names drew a different, incomplete set on each platform. So branch, pull request, every PR state (open, draft, merged, closed, conflict), Merge PR and Changes come from one licensed set, Tabler Icons v3.49.0 (MIT, © Paweł Kuna), drawn from the same paths on every platform. They take priority over SF Symbols, Material Symbols and any other set; no other set is mixed in.

- The source SVGs and Tabler's licence are committed in `packages/client/src/lib/generic/symbols/assets/tabler`. The Swift package `tools/sf-symbols/tabler-symbols` outlines their 2-point strokes and unions them with Core Graphics, so every platform gets filled paths, and writes `tabler-symbol-paths.json` in the custom symbols' units and box.
- iOS: `with-custom-symbols` writes them into the asset catalog with the other custom symbols, and `SymbolView` draws them.
- Electron on macOS and web, Windows and Linux: the page masks the path, as for the other custom symbols.
- Android: `react-native-svg` draws the path, filled with the icon's colour.

`git-symbols.ts` maps each Argo git icon to its Tabler path; such an entry has no Material name. Native menu rows draw no image for these icons, as for every custom symbol.

## Considered options

- Keep Phosphor: one look everywhere, but foreign on both phone platforms.
- Ship SF Symbol SVGs to the web: ruled out by Apple's licence.
- Git icons from GitHub's Octicons on Apple platforms and the nearest Material names elsewhere: replaced by Tabler, one set on every platform (owner, 2026-10-16).
- A Swift helper on macOS: not needed, since Electron draws SF Symbols itself.
