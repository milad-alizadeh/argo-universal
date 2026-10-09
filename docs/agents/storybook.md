# Storybook

- Presentation: `*.stories.tsx` renders the actual component for people to inspect and use. Name stories for visible states or experiences, not a prop inventory. A file with one story names it after the component (`name: 'Button'`) so the sidebar shows a single entry.
- Screens: every screen has `<ScreenName>.stories.tsx`, titled `Screens/<ScreenName>`, showing the complete normal screen at the full available viewport with its providers and mocks. Child stories do not replace it. `parameters.screenPreview` fills the viewport; use it for screens, shells and interactive lists.
- Uniqueness: present each distinct result once. Identical appearance and behavior make stories duplicates even when props differ. Keep the normal state once; additional loading, empty, or error stories must visibly differ.
- Ownership: child states belong in child stories. Parents may naturally contain them, but get no separate story or variation for an already-covered child state. Selected SessionRow coverage rules out selected-row SessionsList and SessionsScreen showcases.
- Callbacks: function-only cases such as `onSearch`, `onSelect`, and `onProjectSettings` belong in functionality tests. Passing a function or logging an action does not justify a presentation story.
- Comparisons: use shared `Variation` and `Variations` helpers for distinct component states. Use viewport and theme controls for phone, desktop, light, and dark instead of multiplying presentation stories.
- Interaction: use existing product controls and visibly update the UI. Search filters; Project + inserts a Session. Pagination starts with enough rows to scroll, shows temporary loading, appends rows, and stops at the limit. Use valid product states.
- Wrappers: provide required context and realistic layout constraints. Extra padding, surfaces, and sizing must not distort the component's product appearance or scrolling.
- Isolation: reset story state between visits; clean up timers, subscriptions, and mocks. A story's result must not depend on which story ran before it. `apps/storybook/vitest.setup.ts` restores the viewport before each test.
- Data: use stable mock IDs, dates, and ordering. Keep interactive changes predictable and reproducible.
- Platforms: share presentation stories and mock data across web and iOS. Check both previews when changing shared UI; preserve intentional platform differences.
- Tests: `*.test.stories.tsx`, titled `Tests/<ComponentName>`, uses browser play functions for functionality assertions and test-only scenarios. Assert observable outcomes: loading indicators must be inside the viewport, and animation checks must catch missing movement or overlapping text. Await observable asynchronous states. Plain Vitest tests non-UI code only.
- Styling: tests never assert how things look. No font sizes, line heights, weights, colours, spacing, radii, or fixed widths and heights; Paper owns those. When a design change breaks one, delete the assertion. Layout bugs a user would see, such as overflow, clipping or a covered control, are behaviour and stay.
  - A play function that clicks, types or selects runs at one viewport for one Agent. Make one story per viewport and Agent with a file-local factory, as `conflict(width)` in `PermissionRequest.test.stories.tsx` does, reusing `settleViewport` and `layoutWidths` from `packages/client/mocks/`.
  - Take expectations from the story's own recorded catalog, and state what a catalog must contain in one module-level check that throws "Recorded catalog needs …".
  - Assert absence as well as presence; never guard an assertion with `if (found)`.
- SettingsList: keep one interactive `Settings` presentation story; clicking its rows demonstrates selection.
