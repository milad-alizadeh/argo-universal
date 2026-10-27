# Material filled symbols

`material-filled.ttf` is Google's Material Symbols Outlined, with FILL 1, weight 400, optical size 48 and grade 0, the default weight like the outlined font bundled by `expo-symbols`, apart from fill. `LICENSE` is Google's Apache 2.0 licence.

The font contains the 129 distinct Material names that `icon-names.ts`, `file-symbols.ts` and `status-symbols.ts` held when it was cut, plus `play_arrow` and `pause` for the Audio transport and `check_circle` for a done Issue; the git icons' former names (`alt_route`, `fork_left`, `merge`, `difference`, `book`) stay in it unused now that those icons draw SVG components. The exact Google Fonts request is in `material-filled-source.txt`. To regenerate, fetch that CSS and download its TrueType `src` URL. Update the sorted `icon_names` query when the map gains an icon that needs a filled variant. Check every requested codepoint against Expo's `android/symbols.json` before replacing the asset.

Metro imports the font as an asset ID; Vite imports its URL. `expo-symbols` passes either to `expo-font`.

# Compose vector icons

`expand-more.xml` is Material Symbols Outlined `expand_more` (the Material name for `chevron-down`) as an Android vector drawable, sized to the `control` icon role (16dp). The Android SplitButton draws it with `@expo/ui`'s Compose `Icon` inside its stock button, so the whole button takes the tap; an icon hosted from React Native would take the touch itself.

# Logos

`logos/` holds brand marks as plain SVG files (ADR-0019). `logo-source.ts` imports each one as a react-native-svg component, and `Icon` draws it through its `source` prop, the same on every platform: Metro converts the file with `react-native-svg-transformer` for the app and the desktop app, and `vite-plugin-svgr` converts it for Storybook. A logo's fills are `currentColor`, so it takes the icon's text colour.

`brand-github.svg` is GitHub's Octicons `mark-github-16.svg` from `github.com/primer/octicons` at tag `v19.15.5`, under the MIT licence in `logos/OCTICONS-LICENSE`; the only change is `fill="currentColor"` on its root element. The Agent card's repository link draws it.

To add a logo, copy its SVG into `logos/` with `currentColor` fills, add a `<name>.svg.d.ts` beside it like `brand-github.svg.d.ts`, and add it to `logoSources`.

# Android light drawings

`material-light/` holds each drawn Material name as an outlined Android vector drawable at weight 300, since `@expo/material-symbols` ships weight 400, which draws heavier than the iOS symbols. `generate:material-images` imports them in place of the package's. To add a name, cut it and rename the file:

```bash
pnpm exec add-material-symbols -w 300 -o src/symbols/assets/material-light <name>
```

The CLI names its file `<name>_wght300.xml`; rename it to `<name>.xml`. It takes one name per run.

# Android filled drawings

`material-filled/` holds each drawn Material name as a filled Android vector drawable. `@expo/material-symbols` ships the outlined style only, so these give Expo UI's `Icon` a filled drawing for the selected state. Expo's own CLI makes them, as its README describes:

```bash
pnpm exec add-material-symbols --fill -o src/symbols/assets/material-filled <names…>
```

The CLI names its files `<name>_fill.xml`; rename each to `<name>.xml`. `generate:material-images` imports them into `materialFilledImages`. `xml.d.ts` types every `.xml` import as an asset.
