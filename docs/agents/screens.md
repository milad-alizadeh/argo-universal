# Screens

- `packages/client/src/screens/` mirrors `apps/universal-app/src/app/`: one folder per route. A route file is a one-line shell that reads its params and renders its screen from `@repo/client`.
- Name screens and views `<entity>-<list|detail|new|edit>-{screen,view}` (`CODING_STANDARDS.md`).
- A dynamic segment's folder is `$param`, never `[param]`: `app/sessions/[id].tsx` renders from `screens/sessions/$id/`. Oxlint overrides and `tooling/oxlint/kit-styling-allowlist.json` read path patterns as globs, where `[id]` is a character class that never matches the folder.
- A section's root header, its trailing items and its search come from the section's layout options (`useSectionRootHeaders`), not from the root screen. A pushed page's screen (never its view) sets its narrow header through `ScreenHeader`, title included; a view whose header needs its own state takes a `renderHeader` slot the screen fills.
