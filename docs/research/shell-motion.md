# Shell motion without squeezing sidebar text

Researched 2026-10-05 for issue #29. Installed `react-native-reanimated` is **4.5.1**, resolved from `packages/client`.

## What is expensive in the initial implementation

`ShellPane.tsx` originally animated its own `width` with `withTiming`. Its children inherited each intermediate width. That explains the sidebar text wrapping and collapsing during toggles: the animation repeatedly changes the children's layout constraints.

The native UI runtime removes JavaScript scheduling from native animation updates, but width updates still need layout recalculation; transforms avoid it. Reanimated recommends non-layout styles and release-build measurement. Its optional synchronous non-layout update flags have touch-detection caveats and need native build configuration; do not enable them speculatively for this shell. [Reanimated performance guidance](https://docs.swmansion.com/react-native-reanimated/docs/guides/performance/)

On web, worklets run as ordinary JavaScript (no separate UI thread), so the hook-based animation is not an independent native-thread browser animation. [Reanimated worklets](https://docs.swmansion.com/react-native-reanimated/docs/guides/worklets/)

## Recommended design

An engineering recommendation inferred from these constraints, not a platform guarantee.

Keep sidebar content at its last useful open width throughout a toggle; reveal or conceal it with a clipping boundary, translating the sidebar when appropriate. Keep all panes mounted to preserve scroll positions and local state. Make hidden panes inert and inaccessible immediately, even while their exit motion finishes. Divider dragging changes the content width; toggling changes only visibility.

For a transform-only width effect, separate the detail Card's surface from its content: the surface scales horizontally while the content translates at natural text scale. Commit the content's target layout once, then animate from the preceding geometry (FLIP: measure preceding bounds, apply final layout, invert visually, animate the inversion away). This removes continuous reflow but requires choosing when the content reflows once. Cross-fading old and new content adds duplication, focus, and rendering costs; avoid it unless real screen content needs it.

Alternative: fixed-size nested clipping Views. Translate the clipping rectangle and counter-translate its child, giving a moving edge without changing the child's width or scale. Profile it, especially on web; clipping, rounded corners, shadows, and layer allocation can still paint. Do not call it compositor-only before examining its trace.

Do not scale the whole detail subtree for a FLIP resize: it squashes text. Inverse-scaling every descendant complicates interruptions and can change rasterization. Background-only scale or fixed-width clipping has a clearer contract. Genuine continuous responsive reflow needs layout work; choose it explicitly and profile it rather than labeling it GPU-only.

Browsers optimize `transform` and `opacity` for compositing; layout and paint properties need main-thread work. `will-change` helps layer promotion but consumes resources: apply it sparingly after measurement. `translateZ(0)` is not evidence that an animation avoids repainting. [Chrome team's animation guide](https://web.dev/articles/animations-guide), [animation rendering pipeline](https://web.dev/articles/animations-and-performance/)

## Animation scheduling and interruption

Reanimated 4 exposes CSS transitions on Android, iOS, and web. Use explicit `transitionProperty: 'transform'`, not `all`. Installed `src/css/web/managers/CSSTransitionsManager.ts` maps these options to the element's CSS transition properties, so the browser can schedule suitable transforms itself. Switching APIs while still animating `width` keeps the layout cost. [Reanimated transitionProperty](https://docs.swmansion.com/react-native-reanimated/docs/css-transitions/transition-property/)

Native hook-based transforms remain valid. Use one shared transition progress for coordinated panes and retarget from the current visual position on a second toggle. Cancel obsolete animations; completion handlers must check their transition is still current before hiding or clearing anything. [Reanimated cancelAnimation](https://docs.swmansion.com/react-native-reanimated/docs/core/cancelAnimation/)

For web WAAPI, read or preserve the current rendered transform before canceling an interrupted animation: `cancel()` removes the effect; `commitStyles()` can persist its current computed state. Reset temporary inline styles after final geometry is committed so a stale transform cannot override later layout. [Animation.cancel](https://developer.mozilla.org/en-US/docs/Web/API/Animation/cancel), [Animation.commitStyles](https://developer.mozilla.org/en-US/docs/Web/API/Animation/commitStyles)

Reduced motion: apply the target geometry without the transition. `ReduceMotion.System` suits `withTiming`; a browser CSS implementation needs a `prefers-reduced-motion` path. [Reanimated accessibility](https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility/), [withTiming configuration](https://docs.swmansion.com/react-native-reanimated/docs/animations/withTiming/)

## Profiling and acceptance

Record the same interactions before and after: left hide/show, Inspector open/close, expand/restore, a toggle reversed mid-flight, and a divider drag. Cover narrow and wide layouts, both themes, and realistic long sidebar text. Verify sidebar text width stays constant during toggles. Check restored content, focus, scroll position, and final Paper geometry separately from performance.

Browser: use a built static Storybook and record Chrome Performance traces after warming the page. Mark interaction windows; report frame intervals, long tasks, and count and duration of Layout/Paint events within them. Inspect the Frames and Animations tracks, compositing failure reasons, layer behavior, and paint flashing. Repeat with a reported CPU throttle over several runs. The probe must not force a layout read every frame: that changes the measured workload. Keep traces and browser/version/device/build metadata with results. [Chrome Performance reference](https://developer.chrome.com/docs/devtools/performance/reference)

At 60 Hz the frame budget is about 16.67 ms; higher-refresh devices have less. Native measurements need a release build on a physical device and must distinguish JavaScript stalls from UI frame drops. Simulators share host resources and development mode adds overhead, so neither supports a universal 60 FPS claim. Re-measure when real screen content replaces placeholder slots. [React Native performance overview](https://reactnative.dev/docs/performance)

Bound the acceptance claim: measured smooth motion in the recorded environment, stable sidebar text, fewer repeated layout/paint operations, and preserved state under interruption. GPU scheduling reduces one source of jank; it cannot guarantee frame rate under arbitrary content, device load, or platform behavior.

## Implemented desktop motion and measured results

`ShellPane.web.tsx` commits the target pane width once. A browser-scheduled Web Animations API transition translates a fixed-width viewport and animates its inset clip; only the separate Card surface scales. Sidebar text keeps its open width; all panes stay mounted. The header sits outside the translated body viewport; flex layout anchors its trailing actions to the actual right edge. The leading title translates by the pane-origin minus toggle-inset difference; trailing actions translate only when the right edge moves. Main header actions stay mounted when the Inspector opens. Interrupted animations restart from their current rendered position. Persistent resize handles live outside the animated clip and keep pointer capture across close, reopen, and expansion. Drag state disables animations, including at snap thresholds; button toggles use the eased transition. The iOS PhoneDrawer keeps its Gesture Handler implementation.

Benchmark: `node tools/profile-frame.mjs <label> <cpu-rate> <origin>` against a built Storybook. It records Chrome timeline traces, Performance metrics, and requestAnimationFrame intervals without per-frame layout reads; adds 450 text rows, warms four toggles, then measures 12 sidebar and 12 Inspector toggles. Each run writes its trace and summary to a new temporary directory. The report gives the directory path.

Measured 2026-10-05 in headless Chromium 153.0.8010.12 at 1440 × 900:

| Measurement across 24 toggles | Original width animation, development | Final browser animation, production | Final production, 4× CPU throttling |
| --- | ---: | ---: | ---: |
| Layout events | 476 | 24 | 24 |
| Layout time | 494 ms | 14 ms | 62 ms |
| Paint events | 1,504 | 354 | 354 |
| Paint time | 118 ms | 12 ms | 51 ms |
| Raster tasks | 7,112 | 9,789 | 9,250 |
| Raster task time | 1,160 ms | 847 ms | 1,009 ms |
| Sidebar p95 frame interval | 16.7 ms | 16.8 ms | 16.8 ms |
| Inspector p95 frame interval | 16.7 ms | 16.8 ms | 16.8 ms |
| Sampled frame intervals over 25 ms | 3 / 714 | 0 / 723 | 27 / 693 |
| Maximum sampled interval | 83.3 ms | 16.8 ms | 50.0 ms |

The baseline ran in development without the later warmup, so it is not a controlled production-to-production frame-rate comparison. A development run of the browser implementation measured 24 layout events and 237 paints, confirming the reduction independent of build mode. The final title animation adds paint events but keeps one layout event per toggle. In these runs, raster task count rose while total raster time fell: layer promotion does not eliminate raster work.

The normal production sample meets the 60 Hz interval on this machine. CPU-throttled runs expose stalls, and requestAnimationFrame measures main-thread scheduling, not GPU presentation. No guarantee of 60 FPS on every machine, with future screen content, or in a native release build. Browser style recalculation and clipping work remain; this is not fully compositor-only.
