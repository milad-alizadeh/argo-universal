# Composer design checklist

Source: [current Paper Session page](https://app.paper.design/file/01M44G6AG3HPXGPPPMKS9S3H8J/p-3-0), inspected on 6 October 2026. Composer master `322-0`, Agent/model menu master `282I-0`, attachments master `1X2P-0`, overlays master `23CG-0`. Paper token hash: `2737d693`.

## Latest desktop and phone redesign

- [x] Match the visible pending Plan circle diameter/stroke to the loading spinner on desktop and phone.
- [x] Animate desktop Plan envelope expansion and collapse instead of snapping its height.
- [x] Set the toolbar Agent logo's actual SVG to 14 px, preventing the shared button SVG rule from enlarging it; match the visible Usage artwork.

- [x] Preserve the Attach button's original 16 × 28 px layout; only its hover/press highlight becomes a centred 28 × 28 px square.
- [x] Revert the extra Usage left padding; keep its original 2 px inset and the 10 px right envelope padding.
- [x] Add 10 px right padding to the desktop bottom envelope so its checkout chevron aligns with the Send arrow.
- [x] Add folder / Git branch icons to Local / New worktree menu choices and the selected trigger.
- [x] Replace the old checkout Switch/search/branch menu with just **Local** and **New worktree** choices.
- [x] Allow created worktree names up to 384 px on desktop, three times their earlier maximum, before truncation.
- [x] Once created, render the worktree directory name as read-only text on desktop and phone, even if callbacks remain.
- [x] Remove the existing Session checkout popup with path/Finder/terminal actions.
- [x] Keep the desktop checkout trigger flat, without a box shadow.
- [x] Give the bottom desktop envelope the same deep shadow as the main Composer.
- [x] Use the circular web-style spinner for the native mobile Plan step only.
- [x] Carefully analyze current canonical desktop/phone states, source values, tokens and drift: [analysis](redesign/analysis.md).
- [x] Apply the new three-part card, Plan tray and phone chip shadow.
- [x] Match 80 px card layout, 14/20 draft typography, toolbar padding/gaps and glyph sizes.
- [x] Match desktop Agent/Model lanes, muted Mode controls and 7 px tray/footer insets.
- [x] Expand desktop Plan steps inside its tray, never a desktop popover.
- [x] Replace phone envelope with centred Plan/Agents or checkout chips.
- [x] Use phone Model-only trigger and icon-only Usage, Context and Mode without chevrons.
- [x] Cap the editor at four lines; longer drafts scroll inside on web and iOS.
- [x] Preserve all image, error, adapter, menu, slider and scrolling interactions.
- [x] Open and visually check updated Storybook desktop/phone previews.
- [x] Open and visually check Composer and sheets in the iOS simulator.
- [x] Run final tests/typechecks, update screenshots and PR, commit/push.

## Previous design, implemented and checked in the browser

- [x] Follow the current Paper masters, including desktop dropdowns and phone bottom sheets.
- [x] Keep image errors short and on one line.
- [x] Use monochrome sending spinners and a spinner for a Plan step in progress.
- [x] Match Composer surfaces, borders, shadows, and button dimensions; keep the Context ring visible.
- [x] Match SF Pro Text, text sizes and weights; await font readiness and verify theme font loading.
- [x] Display branch labels in lowercase, including **main**, in the checkout control and branch choices.
- [x] Use the original reusable Switch geometry, with a smaller variation; clicking **New worktree** toggles it.
- [x] Remove the branch search focus outline.
- [x] Remove the Usage subtitle.
- [x] Use the shared Slider with step dots, full-width alignment and single-line effort labels.
- [x] Prevent text selection inside dropdowns.
- [x] Use check icons, designed Mode icons, and selection backgrounds covering the icon, text and check.
- [x] Resolve the recommended Model name and concrete default Effort in adapters.
- [x] Show one Agent logo, the actual Model and Effort, and a Fast icon when enabled; compact phone widths show the logo and chevron.
- [x] Combine Agent and Model into the current desktop menu: 580 px wide, with a 172 px Agent column.
- [x] Use an internally scrollable LegendList in the desktop Agent column, beneath its fixed heading. A 40-Agent browser check verifies bounded menu height, independent scrolling and selection of the last Agent.
- [x] Use phone settings, Agent and Model pages with back navigation; keep the Session Agent fixed after starting.
- [x] Match desktop and phone attachment choices separately.
- [x] Match Plan and Context trays, including optional phone Subagents and Shells counts.
- [x] Remove the blue focus outline from the actual desktop popup wrapper, keep the Plan spinner at 14 px, and mute pending steps to match Paper.
- [x] Resolve the Context ring's grey track and coloured arc from theme tokens; keep `34k / 200k` on one line. Verify the rendered light and dark previews, including keyboard focus.
- [x] Capture all existing Composer states at phone and wide widths in light and dark.
- [x] Pass the 18 Composer browser plays and both adapter configuration test files (33 tests).
- [x] Pass Client, Storybook and Agents type checks, formatting, and lint.
- [x] Pass the full suite: 3,644 tests, 94 files passed and one skipped (`vitest run --maxWorkers=2 --testTimeout=15000`). Four Server tests had timed out at five seconds in the earlier run; both affected files also passed their isolated recheck.

## Remaining

- [ ] Verify current native sheets on Android. The earlier emulator run loaded this branch from Metro 8091 and accepted `argo://storybook`, but did not prove sheet rendering or interaction. At the latest read-only check the active device points to another Metro on 8090 and shows its loading screen; it was left untouched. Android sheets, gestures and safe-area layout remain unverified.
- [ ] Resolve the proposed split for queued Turns, questionnaires, and file upload/retry states newly shown in Paper. Issue #37 covers text and images and requires proposing a split when scope grows. These features are not implemented by this change.
- [ ] Resume code review only after every requested item is handled. The owner explicitly paused agent code review, then approved the UI and requested PR #136 be submitted for review.

The Composer takes controlled props. Session screen integration and external action wiring belong to #39.
