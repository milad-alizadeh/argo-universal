---
status: proposed
---

# Plugins draw SVG, charts and code maps

This amends [ADR-0025](0025-plugins-run-on-the-server-and-draw-argo-components.md) and [ADR-0027](0027-plugins-act-through-one-api-hook-core-and-replace-named-components.md) (owner, 2026-10-16, Spec 0016 #725). The kit cannot draw a diagram, a chart or a code map, and Plugins such as Atlas need all three. Claude Code mods have an `Svg` element, but only on Desktop. Argo adds `Svg` and `Chart` to the kit on iOS, Android, web and desktop, and `CodeMap` on desktop and web. All three start as proposed API, as ADR-0025 says. A council review (platforms, security, library health, fit with Argo's rules) shaped this version.

## Decision

- **`Svg` draws SVG markup the Plugin sends.** Its props are `xml`, `label`, `tone`, an optional `aspectRatio` and an optional `onPress`. The App draws it with `react-native-svg`'s `SvgXml` on every platform, as `AgentLogo` already does for registry logos.
  - The Server parses the markup with `react-native-svg`'s own `parse`, checks the tree against the allowlists below and sends re-serialised markup. The Apps never read a Plugin's raw markup.
  - Elements allowed: `svg`, `g`, `defs`, `path`, `rect`, `circle`, `ellipse`, `line`, `polyline`, `polygon`, `text`, `tspan`, `linearGradient`, `radialGradient`, `stop` and `clipPath`. Everything else is refused, including `image`, `use`, `pattern`, `mask`, `filter`, `foreignObject`, `a`, `style` and `script`, so no SVG fetches a URL.
  - Attributes come from an allowlist; `style`, `class` and event attributes are refused. `href` and `url()` may only point at an id in the same markup.
  - Colours come only from `currentColor`, and `tone` sets it from Argo's tone enum. Any other `fill`, `stroke` or `stop-color` colour is refused, so Plugins keep to the tokens.
  - Caps: 131,072 characters (Claude Code's cap), 2,000 elements, nesting depth 32, finite numbers only.
  - The whole node can be pressed; its shapes cannot. `label` is required and is read by screen readers. If drawing fails, the App shows the `label` instead.

  Copied from Claude Code's `Svg` element and its cap, made to work on phones by the subset.
- **`Chart` draws data, not markup.** Its props are `kind` (`line`, `bar`, `area`, `scatter`, `pie` or `donut`), `label`, an optional `stacked`, an optional `onPress`, and `series`: each series has a name, a tone and `{ x, y }` points. At most 8 series (one per tone) and 2,000 points per series; names and labels at most 120 characters; finite numbers only. Plugins never see the renderer's API, so it can be replaced without breaking a Plugin. Copied from Block Kit's data visualization block and Raycast's typed props, as the research advised against passing chart SVG through.
- **`CodeMap` draws a codebase as data, on desktop and web.** Its props are `label`, `view` (`3d` or `flat`), `files` and optional `links`, `trace`, `selectedId` and `onSelect`:
  - each file has a unique `id`, a `path`, an `area` number, an optional `height` number and a `tone`; folders come from the paths;
  - each link has `from`, `to` and a `weight`, for files that change together; both ends must be existing ids;
  - `trace` is an ordered list of file ids with a short label each, drawn as numbered steps;
  - `onSelect` gets the pressed file's id;
  - caps start at 20,000 files, 50,000 links and 200 trace steps, and are set from the 3D prototype.

  The App draws the layout, labels, camera, zoom and selection. Labels are culled to what fits on screen, never one view per file. Plugins never see the renderer, as with `Chart`. This is the Atlas Code Map in Paper; it becomes a kit component because Plugins cannot draw thousands of files any other way. A map is poor on a small screen (owner), so phones never draw it: on iOS and Android a `CodeMap` node draws its accessible file list instead.
- **Screen readers.** A canvas exposes nothing, so each canvas has a text twin, as Highcharts and WCAG's data table alternative do. `Chart` has an image role with its `label` and a hidden table of its series. `CodeMap` has an accessible file list that selects the same file as the canvas.
- **Victory Native draws charts on every App.** It runs on React Native Skia, Reanimated and Gesture Handler. Argo already has the last two, so it adds `@shopify/react-native-skia` 2.x and `victory-native`. Core uses the same `Chart` for its own charts, so there is one chart library in Argo. Victory does not claim web support; Argo's prototype proved it on web and desktop.
  - Skia v3 ships as `react-native-skia`, and `@shopify/react-native-skia` stops at 2.14. Argo stays on the 2.x line Expo pins until `victory-native` supports v3, then moves. v3 needs Android API 26 with Vulkan and iOS 15.1.
- **Skia draws every other 2D canvas.** `CodeMap`'s `flat` view, its trace steps and links, and the lines between boxes in Atlas diagrams are drawn with Skia directly. Boxes, cards and labels that hold text stay kit views laid over the canvas, so text, press and screen readers work as everywhere else. Small bars, such as the measure bars in an inspector, stay plain views and never load Skia.
- **three.js draws `CodeMap`'s `3d` view** with WebGL and `@react-three/fiber`, on web and desktop only. This adds `three` and `@react-three/fiber`; nothing is added on phones.
- **Colours come from tokens.** Skia and three.js read Argo's tokens through the same helper as the native screens (`useNativeTheme`), and redraw when the theme changes. No renderer default colour or light is left raw.
- **Web and desktop load Skia and three.js only when they are used.** On web, Skia runs as CanvasKit, a WebAssembly file of about 3.2 MB gzipped. The App loads it with `WithSkiaWeb` the first time a Skia view appears; only its 38 KB loader is in the launch bundle. three.js loads the first time a `3d` `CodeMap` appears. The desktop App ships these files inside the app, so they cost no download, only the time to compile them.
  - The App serves `canvaskit.wasm` from its own files, copied by Skia's `setup-skia-web` on every Skia upgrade, never from a CDN. CI checks its hash against the pinned `canvaskit-wasm`.
  - The desktop App's content security policy adds `'wasm-unsafe-eval'` to `script-src`, and never `'unsafe-eval'`. It allows compiling WebAssembly, not `eval`; without it CanvasKit cannot load on desktop.
- **The Server checks all three.** `argo plugin validate`, the plugin host and `mount()` in the test kit refuse an `Svg`, `Chart` or `CodeMap` that breaks these rules and log one line naming the Plugin, the node and the reason. The plugin host also caps each node's size before sending it. In a Replaceable Slot the whole tree is refused and core draws its own, as ADR-0027 says. In pages and ordinary Slots the node is dropped, as an unknown leaf is in ADR-0025.
- **Where it lives.** The three components are kit components in `display/` (ADR-0017). They are drawn by Argo, not Expo UI (ADR-0020).

## Before this is accepted

- Done (2026-10-16): a prototype drew line, bar, grouped bar, stacked bar, area, stacked area, scatter, pie and donut charts on web (production export) and in the desktop App over `app://`, with press and touch working. CanvasKit loaded in 76–175 ms cold on localhost, about 1.4 s cold at 20 Mbps, and about 35 ms on desktop; charts were drawn about 0.4–0.65 s after the page mounted. Desktop needed the content security policy change above.
- Charts must be drawn on a physical iPhone and a physical Android phone, recording pan frame rate, rotation and the release app size added by Skia (Skia's docs say about 6 MB on iOS and 4 MB on Android).
- A second prototype must draw a `3d` and a `flat` `CodeMap` of argo-universal's files on web and desktop, including a machine without GPU acceleration, and record the frame rate while panning.
- The owner answers the open questions below.

If any check fails, this ADR goes back to the owner instead of switching renderers silently.

## Open questions

- **Chart text.** CanvasKit cannot reach system fonts, and SF Pro cannot be bundled for web. Either axis and value labels are kit `Text` over the canvas in the system font (to be proved), or a bundled font is named here and the system-font rule is amended.
- **More chart colours.** Charts are capped at one series per tone. More series would need a categorical token set, which amends ADR-0026's deletion of `chart-1` to `chart-5`.
- **When `CodeMap` becomes stable.** ADR-0025 needs two Plugins to use an API; only Atlas will use `CodeMap`.

## Considered options

- **react-native-gifted-charts as the chart renderer.** It draws with `react-native-svg`, which Argo already has, so it needs no WebAssembly and no bundled font. Not chosen: one author, and weaker gestures and animation. It is the fallback if Victory Native fails, replacing Victory's SVG version, which has had no release since January 2025.
- **Victory Native on phones, Victory (SVG) on web and desktop.** Rejected: two chart libraries whose drawings must be kept alike.
- **`Svg` on desktop and web only,** as in Claude Code. Rejected: Plugin UI would differ on phones, and the phones already draw SVG.
- **Any SVG `SvgXml` accepts.** Rejected: Plugins could set raw colours and fetch remote images, which leaks the user's IP address.
- **Charts as SVG from the Plugin.** Rejected: every Plugin would draw its own axes and labels, and they would not match.
- **The code map as SVG from the Plugin.** Rejected: thousands of files pass the 131,072-character cap, and SVG cannot pan, zoom or draw 3D smoothly.
- **`CodeMap` on phones.** Deferred: the map is poor on a small screen (owner). On phones today, three.js on `expo-gl` is broken (expo/expo#51543, a WebGL2 context passes `instanceof WebGLRenderingContext` from SDK 57) and `@react-three/fiber` v10 drops its native entry. Both workarounds need a patch.
- **`react-native-webgpu` with three.js's WebGPU renderer** for 3D on phones. Deferred with `CodeMap` on phones: `@react-three/fiber` needs a patch to run on it, and it has one maintainer.
- **The 3D map in a WebView with three.js.** Rejected: every press and selection crosses a message bridge, gestures do not feel native, and ADR-0025 keeps web views to desktop and web.
- **Plugin-drawn WebGL.** Rejected: WebGL needs JavaScript draw calls and shaders, which are code, and ADR-0025 keeps Plugin code off the Apps. Desktop and web may get it later through ADR-0025's web view escape hatch.
- **A `Scene` kit component that takes glTF, the standard 3D scene file.** Deferred until a second Plugin needs 3D. It would follow `Svg`'s rules: a size and vertex cap set from the 3D prototype; meshes, lines, groups, transforms and a camera allowed; shaders, scripts, external URLs and textures refused; material names mapped to Argo tones instead of raw colours; the App draws pan, zoom and orbit, and `onPress` returns the pressed object's name. Not added now: no plugin system we copy does this, and Atlas would re-send the whole scene on every selection where `CodeMap` changes one prop.
- **Exposing Victory Native's, Skia's or three.js's components to Plugins.** Rejected: the renderer could never change, and props would carry styles the kit forbids.
