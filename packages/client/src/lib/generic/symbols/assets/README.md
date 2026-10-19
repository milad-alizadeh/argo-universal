# Material filled symbols

`material-filled.ttf` is Google's Material Symbols Outlined, with FILL 1, weight 200, optical size 48 and grade 0. These settings match the outlined font bundled by `expo-symbols`, apart from fill. `LICENSE` is Google's Apache 2.0 licence.

The font contains the 128 distinct Material names that `icon-names.ts`, `file-symbols.ts` and `status-symbols.ts` held when it was cut, plus `play_arrow` and `pause` for the Audio transport; the git icons' former names (`alt_route`, `fork_left`, `merge`, `difference`, `book`) stay in it unused now that those icons draw Tabler paths. The exact Google Fonts request is in `material-filled-source.txt`. To regenerate, fetch that CSS and download its TrueType `src` URL. Update the sorted `icon_names` query when the map gains an icon that needs a filled variant. Check every requested codepoint against Expo's `android/symbols.json` before replacing the asset.

Metro imports the font as an asset ID; Vite imports its URL. `expo-symbols` passes either to `expo-font`.

# Compose vector icons

`expand-more.xml` is Material Symbols Outlined `expand_more` (the Material name for `chevron-down`) as an Android vector drawable, sized to the `control` icon role (16dp). The Android SplitButton draws it with `@expo/ui`'s Compose `Icon` inside its stock button, so the whole button takes the tap; an icon hosted from React Native would take the touch itself.

# Tabler git icons

`tabler/` holds the source SVGs of the git icons, unchanged from Tabler Icons v3.49.0's outline set (github.com/tabler/tabler-icons, `icons/outline` at tag `v3.49.0`), and `tabler/LICENSE`, Tabler's MIT licence (ADR-0019).

Tabler draws 2-point strokes on a 24-point grid; the asset catalog and the masks need filled shapes. The Swift package `tools/sf-symbols/tabler-symbols` outlines each icon's strokes with round caps and joins, unions them with Core Graphics, and places them in the custom symbols' 137.5-unit box. It needs macOS 14 or later, for `CGPath.normalized(using:)`, and the Swift toolchain from Xcode. To regenerate, from the repository root:

```sh
swift run --quiet --package-path tools/sf-symbols/tabler-symbols tabler-symbols \
  packages/client/src/lib/generic/symbols/assets/tabler \
  > packages/client/src/lib/generic/symbols/tabler-symbol-paths.json
```

`chevron-right.svg` is the web grouped row's disclosure (ADR-0019, Web disclosure chevron); `with-custom-symbols` leaves it out of the iOS asset catalog.

To add a git icon, copy its outline SVG from the same Tabler release into `tabler/`, regenerate, and map it in `git-symbols.ts`.

# Logos

`logos/` holds brand marks as plain SVG files (ADR-0019). `logo-source.ts` imports each one as a react-native-svg component, and `Icon` draws it through its `source` prop, the same on every platform: Metro converts the file with `react-native-svg-transformer` for the app and the desktop app, and `vite-plugin-svgr` converts it for Storybook. A logo's fills are `currentColor`, so it takes the icon's text colour.

`brand-github.svg` is GitHub's Octicons `mark-github-16.svg` from `github.com/primer/octicons` at tag `v19.15.5`, under the MIT licence in `logos/OCTICONS-LICENSE`; the only change is `fill="currentColor"` on its root element. The Agent card's repository link draws it.

To add a logo, copy its SVG into `logos/` with `currentColor` fills, add a `<name>.svg.d.ts` beside it like `brand-github.svg.d.ts`, and add it to `logoSources`.
