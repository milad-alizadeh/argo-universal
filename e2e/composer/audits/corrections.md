# Composer blind audit corrections

Completed 6 October 2026 against the current [Paper Session masters](https://app.paper.design/file/01M44G6AG3HPXGPPPMKS9S3H8J/p-3-0), token hash `2737d693`.

Three agents ran sequentially, each without conversation or previous audit history. Their original reports and before-state evidence remain unchanged: [shell/editor/toolbar](blind-shell.md), [menus/sheets/configuration](blind-menus.md), and [footer/Plan/Context/Usage](blind-status.md). They found 23 visual items, with the common phone sheet inset counted twice: **22 distinct visual corrections**, plus font/token drift. The implementing agent applied and verified the fixes below; this is a resolution record, not a second independent audit.

## Resolved findings

| Audit | Correction | Verification |
| --- | --- | --- |
| Shell 1 | Toolbar Mode icon uses Paper's effective 16 px size. | Rendered SVG computed size 16 px. |
| Shell 2 | Oversized-image warning uses the exact stroked vector and centered alignment with 2 px top margin. | Actual icon top is 3 px below text top; one-line error preserved. |
| Shell 3 | Remove-image cross uses Paper's stroked, round-capped vector. | 10 px SVG, 18 px badge and 32 px target preserved. |
| Shell 4 | Desktop Send has no shadow; phone Send and Stop retain their shadow. | Computed wide Send shadow contains only zero-sized transparent entries. An important utility defeats the shared custom shadow rule. |
| Menus 1 | Branch selection background covers its full row. | Selected row is `rgb(245,245,245)` in light mode. |
| Menus 2 | Branch search has its magnifier, divider and row rhythm. | Search 40 px, glyph 14 px, bottom border 1 px, no focus outline; choice padding 8 px, heights 32 px, gaps 2 px. |
| Menus 3 | Effort labels share Slider step anchors. | Interior label centers match dots exactly; endpoints align to the content edges. Meaningful browser regression assertions measure the alignment. |
| Menus 4 | Agent rows override shared SVG padding and use the designed radius. | Horizontal padding 8 px, corner radius 6 px. |
| Menus 5 | Desktop headings have the correct first-row gap. | First row 31 px below popup top; three-Model menu 580 × 354 px. |
| Menus 6 | Phone attachments regain circular icon plates and exact stroked icons. | Plates 32 × 32 px, muted surface, glyphs 18 px; text begins 56 px after row left. |
| Menus 7 | Phone Back uses an 18 px foreground arrow and bottom header border only. | Computed glyph size/color and 0 px top / 1 px bottom borders checked. |
| Menus 8 | Mode choices use 16 px foreground glyphs; dangerous mode uses the warning triangle. | Both adapter presentation catalogs and their tests updated; dangerous icon resolves to destructive color. |
| Menus 9 / Status 10 | Web phone sheets use the shared 34 px bottom inset. | Actual sheet surface computed padding is 34 px. Native safe-area implementation is unchanged. |
| Status 1 | Context SVG stays at 14 × 14 px despite shared Button SVG styling. | Computed SVG width/height checked; browser regression asserts both. |
| Status 2 | Usage rows match padding, gaps and percentage weight. | Rows 79 px, padding 12 px vertical / 16 px horizontal, gap 6 px, percentage weight 400. |
| Status 3 | Plan popup/sheet header uses a 16 px foreground icon. | Computed 16 px and light foreground `rgb(10,10,10)`. |
| Status 4 | Plan icons use centered 14 × 20 px slots; pending uses Paper's circle and ring token. | Completed/pending glyphs begin 3 px below text top; pending viewBox 18, radius 7, stroke 1.5. In-progress remains a real monochrome spinner. |
| Status 5 | Phone Plan uses 4 px inner gaps and 2 px count padding. | Responsive classes and phone tray screenshot checked; desktop retains 8 px gaps. |
| Status 6 | Context header gap and total tracking match. | Computed gap 2 px and tracking −0.2 px at 20 px text. |
| Status 7 | Tray/footer regain their surface shadows; footer includes its border within 44 px. | Outer footer 44 px; inner row 31 px; shadow `0 1px 2px rgba(0,0,0,.05)`. |
| Status 8 | Worktree states use the designed wording, colors and chevrons. | Off: muted label/branch, “on main”, no chevron, readable opacity. On: “from main”, 12 px chevron. Clicking New worktree still toggles the shared small Switch. |
| Status 9 | Phone Compact glyph matches desktop at 14 px. | Source and corrected phone Context screenshot checked. |
| Tokens | Font fallback strings and explicit fractional spacing/line-height aliases match Paper. | Sans starts with SF Pro Text; mono with SF Mono; exact Paper fallback chains and missing aliases restored. No claim of identifying every platform's actual glyph face. |

## After-state evidence

[Measured DOM values](screenshots/corrections/measurements.json) supplement the independent before-state JSON and Paper exports. Fonts were awaited with `document.fonts.ready`; popup geometry was observed after settling. Tests await finite animation completion while excluding perpetual spinners.

- All nine Composer variations: [desktop light](screenshots/corrections/desktop-light-overview.jpg), [desktop dark](screenshots/corrections/desktop-dark-overview.jpg), [phone light](screenshots/corrections/phone-light-overview.jpg), [phone dark](screenshots/corrections/phone-dark-overview.jpg). The final isolated desktop dark board uses 1280 × 720; phone boards use 390 × 844. Both exercise the same 720 px wide breakpoint.
- Desktop: [menu](screenshots/corrections/desktop-light-menu.jpg), [branch](screenshots/corrections/desktop-light-branch.jpg), [Mode](screenshots/corrections/desktop-light-mode.jpg), [worktree off](screenshots/corrections/desktop-light-switch-off.jpg), [Plan](screenshots/corrections/desktop-light-plan.jpg), [Context](screenshots/corrections/desktop-light-context.jpg), [Usage](screenshots/corrections/desktop-light-usage.jpg).
- Phone: [Attach](screenshots/corrections/phone-light-attach.jpg), [settings](screenshots/corrections/phone-light-settings.jpg), [Agent page](screenshots/corrections/phone-light-agent-page.jpg), [Plan](screenshots/corrections/phone-light-plan.jpg), [Context](screenshots/corrections/phone-light-context.jpg), [Usage](screenshots/corrections/phone-light-usage.jpg).
- Dark equivalents of menu, branch, Plan, Context and Usage, plus phone settings/Attach, are in [the correction folder](screenshots/corrections). Dark rendering is checked against existing semantic theme tokens; Paper's inspected Session masters provide light designs only.

## Validation and boundaries

All 18 Composer browser plays and 15 adapter configuration tests pass. Client, Storybook and Agents type checks pass. Changed source/theme files pass Biome and `git diff --check`. The full suite passes **3,644 tests**, with 94 files passed and one skipped, using `vitest run --maxWorkers=2 --testTimeout=15000`.

Two bounded master-copy differences remain in Paper: phone settings Effort bottom padding is 12 px in the master and 14 px in its Session copy; the Session checkout copy uses a tree glyph while the master uses git-branch. Implementation follows the masters. No Paper content was changed.

Native sheets/gestures/safe areas, Electron-specific rendering, real CLI catalogs, warning Context states and long counts were not visually certified. The Android device currently points to another Metro on 8090 and was left untouched. SessionScreen is a placeholder; screen integration and external action wiring belong to #39. The story's 16 px exterior inset does not prove Paper's 8 px integrated phone Session inset. Desktop Attach has no designed interior in the inspected Paper cell. Queued Turns, questionnaires, and file upload/retry require the unresolved scope split described in the checklist.

Formal code review remains paused by the owner until all requested work is handled. PR #136 stays draft.
