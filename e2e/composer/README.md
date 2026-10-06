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
- [x] Use phone settings, Agent and Model pages with back navigation; keep the Session Agent fixed after starting.
- [x] Match desktop and phone attachment choices separately.
- [x] Match Plan and Context trays, including optional phone Subagents and Shells counts.
- [x] Capture all existing Composer states at phone and wide widths in light and dark: [screenshots](screenshots/latest-paper).
- [x] Pass the 17 Composer browser plays and both adapter configuration test files (32 tests).
- [x] Pass Client, Storybook and Agents type checks, formatting, and lint.
- [x] Pass the full suite: 3,643 tests, 94 files passed and one skipped (`vitest run --maxWorkers=2 --testTimeout=15000`). Four Server tests had timed out at five seconds in the earlier run; both affected files also passed their isolated recheck.

## Remaining

- [ ] Verify current native sheets on Android. The task's emulator package-manager calls timed out; after restarting with software rendering the package service is unavailable and boot has not completed. Other tasks' devices and Metro servers were left alone.
- [ ] Resolve the proposed split for queued Turns, questionnaires, and file upload/retry states newly shown in Paper. Issue #37 covers text and images and requires proposing a split when scope grows. These features are not implemented by this change.
- [ ] Resume code review only after every requested item is handled. The owner explicitly paused it; PR #136 remains draft.

The Composer takes controlled props. Session screen integration and external action wiring belong to #39.
