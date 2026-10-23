# Git icons are SVG components

Git icons are small SVG components, one per icon, drawn the same on every platform (owner, 2026-10-22). This supersedes the Tabler parts of [ADR-0019](0019-icons-are-native-symbols.md): Git icons and Web disclosure chevron. Tabler was a pipeline of outlined strokes, a generated path file, a Swift tool and an asset-catalog step built for a set of icons that had shrunk to the git icons alone; plain components need none of it.

- Branch, commit, Merge PR, Changes and every pull request state (open, draft, merged, closed, conflict) are react-native-svg components in `packages/kit/src/symbols/svg-symbols`, each with its own paths on a 24-point grid and a 2-point round stroke, the shape of Tabler Icons v3.49.0 (MIT, © Paweł Kuna). The licence is committed beside them. A component takes a size and a colour; the colour defaults to `currentColor`, so on web the icon's text class colours it, and natively `Icon` passes the text colour as the tint.
- `git-symbols.ts` and `list-view-symbols.ts` map an Argo icon name to a component name, as `{ svg: 'git-branch' }`; such an entry has no SF or Material name. `svg-symbols/index.ts` is the one list of components, so a wrong name fails the type-check.
- iOS, Android, web and Electron draw the same component, at the icon's box. Nothing is written to the iOS asset catalog for them, and Electron on macOS needs no mask.
- The web grouped row's disclosure chevron is one of these components, `web-disclosure`. iOS and Android keep `disclosure`.
- A native menu row, a SwiftUI tree or a system toolbar button cannot hold a React Native view, so an SVG icon draws no image there, as before for every custom icon. An iOS toolbar button whose icon is an SVG icon shows its label only.
- The icons that were Tabler but have a native symbol now use it: `pencil` (SF `pencil`, Material `edit`), `workbench` (`list.clipboard`, `assignment`), `stage` (`sidebar.right`, `right_panel_open`), `git-issue-open` (`smallcircle.filled.circle`, `adjust`) and `git-issue-closed` (`checkmark.circle`, `check_circle`).
- Removed: the Tabler SVG sources, `tabler-symbol-paths.json`, `tabler-symbols.ts`, the Swift package `tools/sf-symbols/tabler-symbols` and the Tabler step of `with-custom-symbols`.

## Considered options

- Keep the Tabler pipeline for the git icons: one outlined path everywhere and an asset-catalog image for iOS menus and toolbars, but a Swift tool, a generated file and a plugin step for nine icons.
- Map the nearest SF and Material names: rejected in ADR-0019, since each platform then draws a different, incomplete set.
