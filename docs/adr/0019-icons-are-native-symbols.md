# Icons are native symbols

Every icon is a native system symbol drawn through `expo-symbols` (owner, 2026-10-09). Phosphor is removed: its one look sat wrong beside native controls on iOS and Android, and each platform already ships a full symbol set that follows its own weight and size rules.

| Platform | Symbol set | Drawn by |
| --- | --- | --- |
| iOS | SF Symbols | `SymbolView`, natively |
| Android | Material Symbols | `SymbolView`, natively |
| Web | Material Symbols | `SymbolView`, from the Material Symbols font |
| Electron on Windows and Linux | Material Symbols | as on web |
| Electron on macOS | SF Symbols | macOS, at runtime |

One map, `packages/client/src/lib/icon-names.ts`, gives each Argo icon name its SF and Material name, typed against `expo-symbols`, so a wrong name fails the type-check. Screens write `<Icon name="close" size="md" />`; size stays sm/md/lg and colour comes from the text class.

Apple's licence allows SF Symbols only in apps for Apple platforms, so no SF Symbol image is ever committed or shipped in the web build. On macOS, the Electron main process draws the symbol with `nativeImage.createFromNamedImage` and the preload script returns it as a PNG data URL. The page uses that image as a CSS mask filled with the text colour, caches it, and keeps an empty box of the same size while it loads. The IPC request is validated, and an unrecognised request is rejected, reported and counted.

## Custom symbols

Where SF Symbols has no symbol for an Argo icon, Argo draws its own as a custom SF Symbol (owner, 2026-10-10). The first is `custom.robot`, the Agent icon; SF Symbols, even version 8, has no robot. Each custom symbol is one Regular-M template path in `packages/client/src/lib/custom-symbols.json`, named `custom.<name>` so it cannot clash with Apple's names:

- iOS: the Expo plugin `apps/universal-app/plugins/with-custom-symbols.js` writes it into the app's asset catalog as a symbol set, and `SymbolView`, patched to fall back to `UIImage(named:)`, draws it natively, so it follows weight and size like the system symbols.
- Electron on macOS: the page masks the path itself; no IPC is needed, since the art is Argo's own and its licence allows shipping it.
- Android, web, Windows and Linux: the Material name, as for every icon.

A filled icon uses the SF `.fill` variant. The Material Symbols font that `expo-symbols` loads has no fill axis, so Android, web, Windows and Linux show the outline.

Paper designs may use SF Symbols exported as SVG, but only as mockups. They never reach the code.

## Considered options

- Keep Phosphor: one look everywhere, but foreign on both phone platforms.
- Ship SF Symbol SVGs to the web: ruled out by Apple's licence.
- A Swift helper on macOS: not needed, since Electron draws SF Symbols itself.
