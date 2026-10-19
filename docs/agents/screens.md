# Screens

- `packages/client/src/screens/` mirrors `apps/universal-app/src/app/`: one folder per route. A route file is a one-line shell that reads its params and renders its screen from `@repo/client`.
- Name screens and views `<entity>-<list|detail|new|edit>-{screen,view}` (`CODING_STANDARDS.md`).
- A dynamic segment's folder is `$param`, never `[param]`: `app/sessions/[id].tsx` renders from `screens/sessions/$id/`. Oxlint overrides and `tooling/oxlint/kit-styling-allowlist.json` read path patterns as globs, where `[id]` is a character class that never matches the folder.
- A section's root header, its trailing items and its search come from its `SectionList` (`screens/section-lists.tsx`), which the section stack reads; the root screen sets none. Settings and Plugin pages draw their header through the kit `Page` in their view: its title, Back, search and Actions become the native stack header on a phone and its own heading when wide. Session pages still set their narrow header in the screen (never the view) through `ScreenHeader`.
- Plugin sections are the exception: a Plugin has no `SectionList`, so its narrow root header is the nav item's title from its manifest (`navigation/plugin-drawer.ts`), and its catch-all `[...path]` route renders from `screens/plugins/$path/`.
