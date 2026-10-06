# Composer design checklist

Source: [current Paper Session page](https://app.paper.design/file/01M44G6AG3HPXGPPPMKS9S3H8J/p-3-0), inspected on 6 October 2026. Composer master `322-0`, Agent/model menu master `282I-0`, attachments master `1X2P-0`, overlays master `23CG-0`. Paper token hash: `2737d693`.

## Implemented and checked in the browser

- [x] Follow the current Paper masters, including desktop dropdowns and phone bottom sheets.
- [x] Keep image errors short and on one line.
- [x] Use monochrome sending spinners and a spinner for a Plan step in progress.
- [x] Match Composer surfaces, borders, shadows, and button dimensions; keep the Context ring visible.
- [x] Match SF Pro Text, text sizes and weights; await font readiness and verify theme font loading.
- [x] Display branch labels in lowercase, including **main**, in the checkout control and branch choices: [preview](screenshots/latest-paper/checkout-lowercase.jpg).
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

## Sequential blind design audits

Each auditor starts without implementation history and compares current Paper with rendered Storybook, including spacing, typography, colours, tokens, icons and interactions. These visual audits are separate from the paused code review.

- [x] Audit 1: Composer shell, editor, images and toolbar — [independent report](audits/blind-shell.md), four visual differences and font fallback token drift recorded for correction.
- [x] Audit 2: Dropdowns, sheets and configuration controls — [independent report](audits/blind-menus.md), nine visual differences recorded for correction; Agent scrolling and phone navigation verified.
- [x] Audit 3: Footer, Plan, Context and Usage — [independent report](audits/blind-status.md), ten findings recorded; the sheet inset duplicates audit 2.
- [x] Fix all 22 distinct visual findings and token drift, verify the corrections, and attach each independent report with before/after evidence: [resolution report](audits/corrections.md).

### Corrections found by the blind audits

- [x] Match the toolbar Mode icon's 16 px size.
- [x] Match the oversized-image warning vector and vertical alignment.
- [x] Match the remove-image cross vector.
- [x] Remove the extra desktop Send shadow while keeping the phone and Stop shadow.
- [x] Match Paper's sans and mono font fallback tokens.
- [x] Give the selected branch a full-row background.
- [x] Restore branch search icon/divider and branch row padding/gaps.
- [x] Align effort labels with slider steps.
- [x] Correct Agent row padding and corner radius.
- [x] Correct desktop menu heading-to-row spacing.
- [x] Restore phone attachment icon plates and text alignment.
- [x] Correct phone Back arrow size/colour and header border.
- [x] Correct Mode choice icon size/colour and dangerous-mode icon.
- [x] Match the web phone sheet's 34 px bottom inset.

- [x] Keep the actual Context SVG at 14 px despite shared Button SVG sizing.
- [x] Match Usage row padding, 6 px gaps, 79 px height and normal percentage weight.
- [x] Match the Plan header's 16 px foreground icon.
- [x] Center Plan row glyphs in 14 × 20 px slots and match the pending circle vector/token.
- [x] Match phone Plan group gaps and count padding.
- [x] Match Context header gap and total letter spacing.
- [x] Restore tray/footer shadows and the 44 px footer height.
- [x] Match worktree off/on labels, colours, branch wording and chevron treatment.
- [x] Keep the phone Compact icon at 14 px.
- [x] Restore Paper's explicit fractional spacing and line-height token aliases.

## Remaining

- [ ] Verify current native sheets on Android. The earlier emulator run loaded this branch from Metro 8091 and accepted `argo://storybook`, but did not prove sheet rendering or interaction. At the latest read-only check the active device points to another Metro on 8090 and shows its loading screen; it was left untouched. Native sheets, gestures and safe-area layout remain unverified.
- [ ] Resolve the proposed split for queued Turns, questionnaires, and file upload/retry states newly shown in Paper. Issue #37 covers text and images and requires proposing a split when scope grows. These features are not implemented by this change.
- [ ] Resume code review only after every requested item is handled. The owner explicitly paused it; PR #136 remains draft.

The Composer takes controlled props. Session screen integration and external action wiring belong to #39.
