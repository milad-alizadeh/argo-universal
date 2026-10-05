# Shell motion without squeezing sidebar text

Researched 2026-10-05 for issue #29. Installed `react-native-reanimated` is **4.5.1**, resolved from `packages/client`. This note records the implementation, its primary-source basis, and measured desktop results.

## What is expensive in the initial implementation

`ShellPane.tsx` originally animated its own `width` with `withTiming`. Its children inherited each intermediate width. That explains sidebar text wrapping and collapsing during toggles: the animation repeatedly changes the children's layout constraints.

Moving work to Reanimated's native UI runtime removes JavaScript scheduling from native animation updates, but does not make width updates free. Layout properties require layout recalculation; transforms avoid that work. Reanimated's performance guidance recommends non-layout styles and release-build measurement. Its optional synchronous non-layout update flags have touch-detection caveats and require native build configuration; they should not be enabled speculatively for this shell. [Reanimated performance guidance](https://docs.swmansion.com/react-native-reanimated/docs/guides/performance/)

On web, Reanimated worklets execute as ordinary JavaScript because there is no separate worklet UI thread. The original hook-based animation therefore cannot be described as an independent native-thread browser animation. [Reanimated worklets](https://docs.swmansion.com/react-native-reanimated/docs/guides/worklets/)

## Recommended design

The following is an engineering recommendation inferred from those platform constraints, rather than a guarantee made by either platform.

Keep sidebar content at its last useful open width throughout a toggle. Use a clipping boundary to reveal or conceal it; translate the sidebar when appropriate. Keep all panes mounted so hiding them preserves scroll positions and local state. Make hidden panes inert and inaccessible immediately, even while their visible exit motion finishes. Divider dragging changes the chosen content width; toggling changes visibility rather than repeatedly resizing its text.

Separate the detail Card's surface from its content if a transform-only width effect is needed. The surface can scale horizontally while the content translates at its natural text scale. Commit the content's target layout once, then animate a visual transition from the preceding geometry. This is a FLIP-style approach: measure preceding bounds, apply final layout, invert its position visually, then animate the inversion away. It removes continuous text reflow but requires choosing when the content reflows once. Cross-fading old and new content would add duplication, focus, and rendering costs; avoid it for this shell unless real screen content demonstrates a need.

An alternative is fixed-size nested clipping Views: translate the clipping rectangle and counter-translate its child, producing a moving edge without changing the child's width or scale. This is a candidate to profile, particularly on web; clipping, rounded corners, shadows, and layer allocation can still require painting. Do not claim that this construction is compositor-only before examining its trace.

Avoid scaling the entire detail subtree merely to get a FLIP resize: that squashes its text. Inverse scaling every descendant complicates interruptions and can change rasterization. A background-only scale or fixed-width clipping has a clearer contract. If the product requires genuine continuous responsive content reflow, some layout work is unavoidable; choose that explicitly and profile it rather than labeling it GPU-only.

Browsers optimize `transform` and `opacity` for compositing. Layout and paint properties need main-thread work. `will-change` can help layer promotion but consumes resources, so apply it sparingly after measurement. A `translateZ(0)` declaration is not evidence that an animation avoids repainting. [Chrome team's animation guide](https://web.dev/articles/animations-guide), [animation rendering pipeline](https://web.dev/articles/animations-and-performance/)

## Animation scheduling and interruption

Reanimated 4 exposes CSS transitions on Android, iOS, and web. Use an explicit `transitionProperty: 'transform'` rather than `all` if selecting this API. Installed `src/css/web/managers/CSSTransitionsManager.ts` maps these options to the element's CSS transition properties; the browser can schedule suitable transforms itself. Changing APIs while continuing to animate `width` would retain the layout cost. [Reanimated transitionProperty](https://docs.swmansion.com/react-native-reanimated/docs/css-transitions/transition-property/)

Native hook-based transforms remain a valid alternative. Use one shared transition progress for coordinated panes, and retarget from the current visual position on a second toggle. Cancel an obsolete animation when needed; completion handlers must check whether their transition is still current before hiding or clearing anything. [Reanimated cancelAnimation](https://docs.swmansion.com/react-native-reanimated/docs/core/cancelAnimation/)

For web WAAPI, read or preserve the current rendered transform before canceling an interrupted animation. `cancel()` removes the animation effect; `commitStyles()` can persist its current computed state. Reset temporary inline styles after final geometry is committed so a stale transform cannot override later layout. [Animation.cancel](https://developer.mozilla.org/en-US/docs/Web/API/Animation/cancel), [Animation.commitStyles](https://developer.mozilla.org/en-US/docs/Web/API/Animation/commitStyles)

Respect system reduced motion: apply the target geometry without the visual transition. Existing `ReduceMotion.System` is appropriate for `withTiming`; a browser CSS implementation needs a `prefers-reduced-motion` path. [Reanimated accessibility](https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility/), [withTiming configuration](https://docs.swmansion.com/react-native-reanimated/docs/animations/withTiming/)

## Profiling and acceptance

Record the same interactions before and after the change: left hide/show, Inspector open/close, expand/restore, a toggle reversed before completion, and a divider drag. Include narrow and wide layouts, both themes, and realistic long sidebar text. Verify the sidebar text's width remains constant during toggles. Check restored content, focus, scroll position, and the final Paper geometry separately from performance.

For browser measurement, use a built static Storybook and record Chrome Performance traces after warming the page. Mark interaction windows. Report frame intervals, long tasks, and the count and duration of Layout/Paint events within those windows. Inspect the Frames and Animations tracks, compositing failure reasons, layer behavior, and paint flashing. Repeat with an explicitly reported CPU throttle and several runs. Do not force a layout read on every frame inside the measurement probe: that changes the workload being measured. Keep traces and browser/version/device/build metadata with the results. [Chrome Performance reference](https://developer.chrome.com/docs/devtools/performance/reference)

At 60 Hz the frame budget is approximately 16.67 ms; higher-refresh devices have smaller budgets. Native measurements should use a release build on a physical target device and distinguish JavaScript stalls from UI frame drops. A simulator shares the host's resources, and development mode introduces overhead, so neither supports a universal 60 FPS claim. Re-measure when actual screen content replaces placeholder slots. [React Native performance overview](https://reactnative.dev/docs/performance)

The acceptance claim should be bounded: measured smooth motion in the recorded environment, stable sidebar text, fewer repeated layout/paint operations, and preserved state under interruption. GPU scheduling reduces one source of jank; it cannot guarantee frame rate under arbitrary content, device load, or platform behavior.

## Implemented desktop motion and measured results

`ShellPane.web.tsx` commits the target pane width once. A browser-scheduled Web Animations API transition translates a fixed-width viewport and animates its inset clip; only the separate Card surface scales. Sidebar text retains its open width and all panes stay mounted. `ShellHeaderContent.web.tsx` translates the title by the old-to-new inset difference, avoiding the jump when the header starts reserving room for the sidebar toggle. Interrupted animations restart from their current rendered position. Resize handles live outside the animated clip and drag updates remain immediate. The iOS PhoneDrawer retains its Gesture Handler implementation.

Run `node tools/profile-shell.mjs <label> <cpu-rate> <origin>` against a built Storybook to reproduce the benchmark. The tool records Chrome timeline traces, Performance metrics, and requestAnimationFrame intervals without reading layout every frame. It adds 450 text rows, warms four toggles, then measures 12 sidebar and 12 Inspector toggles. Raw traces are written under `/tmp/argo-shell-profile`; compact summaries are saved alongside this note.

Measured on 2026-10-05 in headless Chromium 153.0.8010.12 at 1440 × 900:

| Measurement across 24 toggles | Original width animation, development | Final browser animation, production | Final production, 4× CPU throttling |
| --- | ---: | ---: | ---: |
| Layout events | 476 | 24 | 24 |
| Layout time | 494 ms | 27 ms | 147 ms |
| Paint events | 1,504 | 288 | 288 |
| Paint time | 118 ms | 17 ms | 95 ms |
| Raster tasks | 7,112 | 9,810 | 9,677 |
| Raster task time | 1,160 ms | 706 ms | 852 ms |
| Sidebar p95 frame interval | 16.7 ms | 16.7 ms | 16.8 ms |
| Inspector p95 frame interval | 16.7 ms | 16.7 ms | 16.8 ms |
| Sampled frame intervals over 25 ms | 3 | 0 / 725 | 27 / 578 |
| Maximum sampled interval | 83.3 ms | 16.8 ms | 200 ms |

The baseline ran in development without the later warmup; it is not a controlled production-to-production frame-rate comparison. A development run of the browser implementation also measured 24 layout events and 237 paints, confirming the large reduction before changing build mode. The final title animation adds paint events but preserves one layout event per toggle. Raster task count increased, even though total raster time decreased in these runs. Layer promotion therefore is not equivalent to eliminating raster work.

The normal production sample meets the 60 Hz frame interval on this machine. CPU-throttled runs expose stalls, and requestAnimationFrame measures main-thread scheduling rather than actual GPU presentation. These results do not guarantee 60 FPS on every machine, with future screen content, or in a native release build. Browser style recalculation and clipping work remain; this is not a claim of a fully compositor-only animation.
