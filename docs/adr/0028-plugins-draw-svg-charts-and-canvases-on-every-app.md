# Plugins draw SVG, charts and canvases

This amends [ADR-0025](0025-plugins-run-on-the-server-and-draw-argo-components.md) and [ADR-0027](0027-plugins-act-through-one-api-hook-core-and-replace-named-components.md) (owner, 2026-10-16, Spec 0016 #725). The kit cannot draw a diagram, a chart or a visualisation, and Plugins such as Atlas need all three. Claude Code mods have an `Svg` element, but only on Desktop. Argo adds `Svg`, `Chart` and `Canvas` to the kit on iOS, Android, web and desktop. All three start as proposed API, as ADR-0025 says. A council review (platforms, security, library health, fit with Argo's rules) shaped the first version.

The first version also added `CodeMap`, the Atlas Code Map as a kit component with a 3D view. The owner rejected it on 2026-10-18: it is one Plugin's screen, no Argo screen would use it so it could never turn stable (ADR-0031), and every new visualisation (a heatmap, a dependency graph) would need its own kit component and an Argo release. `Canvas` replaces it: Plugins send shapes as data and lay them out themselves. 3D is dropped for now.

## Decision

- **`Svg` draws SVG markup the Plugin sends.** Its props are `xml`, `label`, `tone`, an optional `aspectRatio` and an optional `onPress`. The App draws it with `react-native-svg`'s `SvgXml` on every platform, as `AgentLogo` already does for registry logos.
  - The Server parses the markup with `react-native-svg`'s own `parse`, checks the tree against the allowlists below and sends re-serialised markup. The Apps never read a Plugin's raw markup.
  - Elements allowed: `svg`, `g`, `defs`, `path`, `rect`, `circle`, `ellipse`, `line`, `polyline`, `polygon`, `text`, `tspan`, `linearGradient`, `radialGradient`, `stop` and `clipPath`. Everything else is refused, including `image`, `use`, `pattern`, `mask`, `filter`, `foreignObject`, `a`, `style` and `script`, so no SVG fetches a URL.
  - Attributes come from an allowlist; `style`, `class` and event attributes are refused. `href` and `url()` may only point at an id in the same markup.
  - Colours come only from `currentColor`, and `tone` sets it from Argo's tone enum. Any other `fill`, `stroke` or `stop-color` colour is refused, so Plugins keep to the tokens.
  - Caps: 131,072 characters (Claude Code's cap), 2,000 elements, nesting depth 32, finite numbers only.
  - The whole node can be pressed; its shapes cannot. `label` is required and is read by screen readers. If drawing fails, the App shows the `label` instead.

  Copied from Claude Code's `Svg` element and its cap, made to work on phones by the subset.
- **`Chart` draws data, not markup.** Its props are `kind` (`line`, `bar`, `area`, `scatter`, `pie` or `donut`), `label`, an optional `stacked`, an optional `grid` (off by default), an optional `onPress`, and `series`: each series has a name, a tone and `{ x, y }` points. At most 8 series (one per tone) and 2,000 points per series; names and labels at most 120 characters; finite numbers only. Plugins never see the renderer's API, so it can be replaced without breaking a Plugin. Copied from Block Kit's data visualization block and Raycast's typed props, as the research advised against passing chart SVG through.
- **`Canvas` draws shapes the Plugin sends as data.** It is the one way to draw a visualisation the kit has no kit component for: a heatmap is a grid of rects, a code map nested rects, a dependency graph circles and lines. The App never knows which visualisation it is drawing.
  - `Canvas` takes `label`, `width` and `height` (the scene's own units, which the App scales to fit), an optional `aspectRatio`, `camera` (`fixed`, or `pan-zoom` for a scene larger than its frame), an optional `selectedKey`, and shapes as keyed children.
  - Shapes are `Canvas.Rect`, `Canvas.Circle`, `Canvas.Line`, `Canvas.Path` (SVG path data, under `Svg`'s rules), `Canvas.Text` and `Canvas.Group` (a translate, scale and rotate for its children). Shapes are only valid inside a `Canvas`.
  - Each shape takes geometry, `tone`, an optional `intensity` (0 to 1, which picks a shade of that tone, so a heatmap has a ramp and every colour is still a token), `fill` or `stroke` with `strokeWidth`, and optional `label` and `onPress`.
  - Shapes are keyed children, so ADR-0031's keyed patches resend only the shapes that change. Selection is a prop change, never a resent scene. `onPress` names the shape by its `key`, as every dispatch does.
  - The App owns pan, zoom, hover and the selection outline, so they feel native and never wait for the Server. On desktop and web, hovering a shape with a `label` shows it as a tooltip.
  - The Plugin does the layout in its worker. Layout libraries that need no DOM, such as d3-scale, d3-hierarchy and d3-force, work there; the kit adds none.
  - Caps start at 20,000 shapes (the #834 prototype held about 60 frames per second panning 20,000 flat boxes), nesting depth 16, path data under `Svg`'s character cap and labels of at most 120 characters, finite numbers only, and are set from the Canvas prototype below.
  - `Canvas.Text` is a kit `Text` laid over the canvas in the system font, culled when it no longer fits its shape at the current zoom, never one view per shape.
  - It draws on every App, phones included. A Plugin that wants something else on a small screen, such as a file list instead of Atlas's map, sends it for that App's surface (ADR-0027 `ctx.surface`).
- **Screen readers.** A canvas exposes nothing, so each canvas has a text twin, as Highcharts and WCAG's data table alternative do. `Chart` has an image role with its `label` and a hidden table of its series. `Canvas` has an image role with its `label` and a hidden list of its labelled shapes, in order; pressing one in the list presses that shape.
- **Victory Native draws charts on every App.** It runs on React Native Skia, Reanimated and Gesture Handler. Argo already has the last two, so it adds `@shopify/react-native-skia` 2.x and `victory-native`. Core uses the same `Chart` for its own charts, so there is one chart library in Argo. Victory does not claim web support; Argo's prototype proved it on web and desktop.
  - Skia v3 ships as `react-native-skia`, and `@shopify/react-native-skia` stops at 2.14. Argo stays on the 2.x line Expo pins until `victory-native` supports v3, then moves. v3 needs Android API 26 with Vulkan and iOS 15.1.
- **Skia draws `Canvas` and every other 2D canvas,** such as the lines between boxes in Atlas diagrams. Boxes, cards and labels that hold text stay kit views laid over the canvas, so text, press and screen readers work as everywhere else. Small bars, such as the measure bars in a Workbench card, stay plain views and never load Skia.
- **Colours come from tokens.** Skia reads Argo's tokens through the same helper as the native screens (`useNativeTheme`), and redraw when the theme changes. No renderer default colour is left raw. `intensity` maps onto each tone's shades.
- **Web and desktop load Skia only when it is used.** On web, Skia runs as CanvasKit, a WebAssembly file of about 3.2 MB gzipped. The App loads it with `WithSkiaWeb` the first time a Skia view appears; only its 38 KB loader is in the launch bundle. The desktop App ships these files inside the app, so they cost no download, only the time to compile them.
  - The App serves `canvaskit.wasm` from its own files, copied by Skia's `setup-skia-web` on every Skia upgrade, never from a CDN. CI checks its hash against the pinned `canvaskit-wasm`.
  - The desktop App's content security policy adds `'wasm-unsafe-eval'` to `script-src`, and never `'unsafe-eval'`. It allows compiling WebAssembly, not `eval`; without it CanvasKit cannot load on desktop.
- **The Server checks all three.** `argo plugin validate`, the plugin host and `mount()` in the test kit refuse an `Svg`, `Chart` or `Canvas` that breaks these rules and log one line naming the Plugin, the node and the reason. The plugin host also caps each node's size before sending it. In a Replaceable Slot the whole tree is refused and core draws its own, as ADR-0027 says. In pages and ordinary Slots the node is dropped, as an unknown leaf is in ADR-0025.
- **Where it lives.** The three components are kit components in `visual/` (Spec 0017 #959). They are drawn by Argo, not Expo UI (ADR-0020).

## Checks before the kit components turn stable

- Done (2026-10-16): a prototype drew line, bar, grouped bar, stacked bar, area, stacked area, scatter, pie and donut charts on web (production export) and in the desktop App over `app://`, with press and touch working. CanvasKit loaded in 76–175 ms cold on localhost, about 1.4 s cold at 20 Mbps, and about 35 ms on desktop; charts were drawn about 0.4–0.65 s after the page mounted. Desktop needed the content security policy change above.
- Charts must be drawn on a physical iPhone and a physical Android phone, recording pan frame rate, rotation and the release app size added by Skia (Skia's docs say about 6 MB on iOS and 4 MB on Android).
- Done (2026-10-17, #834): a code map prototype drew argo-universal's 2,961 files as flat Skia boxes, repeated to 5,000 and 20,000, on web (production export) and in the desktop App over `app://`, holding about 60 frames per second while panning on an Apple M4 Pro. Its 3D view is no longer part of this ADR.
- A `Canvas` prototype draws a heatmap and a flat code map from Plugin JSX on iOS, Android, web and desktop, recording pan frame rate and patch size when one shape changes, and sets the caps.
- The owner answers the open questions below.

Accepted by the owner on 2026-10-18 with these checks still to run. If any check fails, this ADR goes back to the owner instead of switching renderers silently.

## Open questions

- **Chart text: resolved by the owner, 2026-10-25 (#835).** CanvasKit cannot reach system fonts, and SF Pro cannot be bundled for web, so axis and value labels are kit `Text` laid over the canvas in the system font. Victory draws without a font, and the labels sit at the positions from its scales. No font is bundled.
- **More chart colours.** Charts are capped at one series per tone. More series would need a categorical token set, which amends ADR-0026's deletion of `chart-1` to `chart-5`.
- **Tone shades for `intensity`: resolved by the owner, 2026-10-19 (#836).** The approved Canvas master uses Tailwind 100–900 tone ramps, with the order reversed in dark mode. ADR-0026 records the mapping.
- **Which Argo screen uses `Canvas` first,** so it can turn stable under ADR-0031.

## Considered options

- **react-native-gifted-charts as the chart renderer.** It draws with `react-native-svg`, which Argo already has, so it needs no WebAssembly and no bundled font. Not chosen: one author, and weaker gestures and animation. It is the fallback if Victory Native fails, replacing Victory's SVG version, which has had no release since January 2025.
- **Victory Native on phones, Victory (SVG) on web and desktop.** Rejected: two chart libraries whose drawings must be kept alike.
- **`Svg` on desktop and web only,** as in Claude Code. Rejected: Plugin UI would differ on phones, and the phones already draw SVG.
- **Any SVG `SvgXml` accepts.** Rejected: Plugins could set raw colours and fetch remote images, which leaks the user's IP address.
- **Charts as SVG from the Plugin.** Rejected: every Plugin would draw its own axes and labels, and they would not match.
- **Plugin-drawn WebGL.** Rejected: WebGL needs JavaScript draw calls and shaders, which are code, and ADR-0025 keeps Plugin code off the Apps. Desktop and web may get it later through ADR-0025's web view escape hatch.
- **Exposing Victory Native's or Skia's components to Plugins.** Rejected: the renderer could never change, and props would carry styles the kit forbids.
- **`CodeMap` as a kit component,** as first proposed. Rejected (owner, 2026-10-18): it is one Plugin's screen and could never turn stable, and Atlas can draw it with `Canvas`.
- **A kit component per visualisation** (Treemap, Heatmap, Graph). Rejected (owner): too specific; each new visualisation would wait for an Argo release.
- **A Vega-Lite spec the App renders.** Rejected: every App would carry a large grammar runtime, and it still cannot draw free layouts such as a code map. `Chart` covers the standard charts.
- **`Svg` for everything.** Rejected: the 131,072-character cap stops at a few thousand shapes, markup is resent whole on every change, and shapes cannot be pressed, panned or zoomed.
- **3D.** Dropped for now (owner, 2026-10-18). three.js on `expo-gl` is broken on phones (expo/expo#51543) and `@react-three/fiber` v10 drops its native entry. If a Plugin needs 3D later, it follows `Canvas`: boxes, lines and groups as keyed data with tones, the App owns the camera.
