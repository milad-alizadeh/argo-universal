# Composer design checklist

Source: [current Paper Session page](https://app.paper.design/file/01M44G6AG3HPXGPPPMKS9S3H8J/p-3-0), inspected on 6 October 2026. Composer master `322-0`, Agent/model menu master `282I-0`, attachments master `1X2P-0`, overlays master `23CG-0`. Paper token hash: `36197a80`.

## Implemented and checked in the browser

- [x] Follow the current Paper masters, including desktop dropdowns and phone bottom sheets.
- [x] Keep image errors short and on one line.
- [x] Use monochrome sending spinners and a spinner for a Plan step in progress.
- [x] Match Composer surfaces, borders, shadows, and button dimensions; keep the Context ring visible.
- [x] Match SF Pro Text, text sizes and weights; await font readiness and verify theme font loading.
- [x] Keep the checkout label **Main**.
- [x] Use the original reusable Switch geometry, with a smaller variation; clicking **New worktree** toggles it.
- [x] Remove the branch search focus outline.
- [x] Remove the Usage subtitle.
- [x] Use the shared Slider with step dots, full-width alignment and single-line effort labels.
- [x] Prevent text selection inside dropdowns.
- [x] Use check icons, designed Mode icons, and selection backgrounds covering the icon, text and check.
- [x] Resolve the recommended Model name and concrete default Effort in adapters.
- [x] Show one Agent logo, the actual Model and Effort, and a Fast icon when enabled; compact phone widths show the logo and chevron.
- [x] Combine Agent and Model into the current desktop menu: 580 px wide, with a 172 px Agent column.
- [x] Use an internally scrollable LegendList in the desktop Agent column, beneath its fixed heading. A 40-Agent browser check verifies bounded menu height, independent scrolling and selection of the last Agent: [scrolled catalogue](screenshots/latest-paper/desktop-agent-list-scroll.jpg).
- [x] Use phone settings, Agent and Model pages with back navigation; keep the Session Agent fixed after starting.
- [x] Match desktop and phone attachment choices separately.
- [x] Match Plan and Context trays, including optional phone Subagents and Shells counts.
- [x] Remove the blue focus outline from the actual desktop popup wrapper, keep the Plan spinner at 14 px, and mute pending steps to match Paper.
- [x] Resolve the Context ring's grey track and coloured arc from theme tokens; keep `34k / 200k` on one line. Verify the rendered light and dark previews, including keyboard focus: [light](screenshots/latest-paper/storybook-status-light.jpg), [dark](screenshots/latest-paper/storybook-status-dark.jpg).
- [x] Capture all existing Composer states at phone and wide widths in light and dark: [screenshots](screenshots/latest-paper).
- [x] Pass the 18 Composer browser plays and both adapter configuration test files (33 tests).
- [x] Pass Client, Storybook and Agents type checks, formatting, and lint.
- [x] Pass the full suite: 3,644 tests, 94 files passed and one skipped (`vitest run --maxWorkers=2 --testTimeout=15000`). Four Server tests had timed out at five seconds in the earlier run; both affected files also passed their isolated recheck.

## Remaining

- [ ] Verify current native sheets on Android. After restarting with software rendering, the task's emulator booted, connected to this branch's Metro on port 8091, loaded its JavaScript bundle and accepted `argo://storybook`. The available UI tool cannot target its window, so sheet interactions and the visible story remain unverified. Other tasks' devices and Metro servers were left alone.
- [ ] Resolve the proposed split for queued Turns, questionnaires, and file upload/retry states newly shown in Paper. Issue #37 covers text and images and requires proposing a split when scope grows. These features are not implemented by this change.
- [ ] Resume code review only after every requested item is handled. The owner explicitly paused it; PR #136 remains draft.

The Composer takes controlled props. Session screen integration and external action wiring belong to #39.
