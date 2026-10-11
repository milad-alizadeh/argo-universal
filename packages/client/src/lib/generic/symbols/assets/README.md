# Material filled symbols

`material-filled.ttf` is Google's Material Symbols Outlined, with FILL 1, weight 200, optical size 48 and grade 0. These settings match the outlined font bundled by `expo-symbols`, apart from fill. `LICENSE` is Google's Apache 2.0 licence.

The font contains the 128 distinct Material names in `icon-names.ts`, `file-symbols.ts` and `status-symbols.ts`. The exact Google Fonts request is in `material-filled-source.txt`. To regenerate, fetch that CSS and download its TrueType `src` URL. Update the sorted `icon_names` query when the map gains an icon that needs a filled variant. Check every requested codepoint against Expo's `android/symbols.json` before replacing the asset.

Metro imports the font as an asset ID; Vite imports its URL. `expo-symbols` passes either to `expo-font`.
