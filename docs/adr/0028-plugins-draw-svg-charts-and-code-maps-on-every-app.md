---
status: proposed
---

# Plugins draw SVG, charts and code maps on every App

This amends [ADR-0025](0025-plugins-run-on-the-server-and-draw-argo-components.md) and [ADR-0027](0027-plugins-act-through-one-api-hook-core-and-replace-named-components.md) (owner, 2026-10-16, Spec 0016 #725). The kit cannot draw a diagram, a chart or a code map, and Plugins such as Atlas need all three. Claude Code mods have an `Svg` element, but only on Desktop. Argo adds `Svg`, `Chart` and `CodeMap` to the kit on iOS, Android, web and desktop. All three start as proposed API, as ADR-0025 says.

## Decision

- **`Svg` draws SVG markup the Plugin sends.** Its props are `xml`, `label`, `tone`, an optional `aspectRatio` and an optional `onPress`. The App draws it with `react-native-svg`'s `SvgXml` on every platform, as `AgentLogo` already does for registry logos.
  - The markup is at most 131,072 characters, Claude Code's cap.
  - Only what `SvgXml` draws on phones is allowed: shapes, `path`, `g`, `defs`, gradients, `clipPath`, `transform` and `text`. `<style>`, `<script>`, `<foreignObject>`, animation, event attributes and external `href`s are refused.
  - Colours come only from `currentColor`, and `tone` sets it from Argo's tone enum. Any other `fill` or `stroke` colour is refused, so Plugins keep to the tokens.
  - The whole node can be pressed; its shapes cannot.
  - `label` is required and is read by screen readers.

  Copied from Claude Code's `Svg` element and its cap, made to work on phones by the subset.
- **`Chart` draws data, not markup.** Its props are `kind` (`line`, `bar`, `area`, `scatter`, `pie` or `donut`), `label`, an optional `stacked`, and `series`: each series has a name, a tone and `{ x, y }` points. Plugins never see the renderer's API, so it can be replaced without breaking a Plugin. Copied from Block Kit's data visualization block and Raycast's typed props, as the research advised against passing chart SVG through.
- **`CodeMap` draws a codebase as data.** Its props are `label`, `view` (`3d` or `flat`), `files` and optional `links`, `trace`, `selectedId` and `onSelect`:
  - each file has an `id`, a `path`, an `area` number, an optional `height` number and a `tone`; folders come from the paths;
  - each link has `from`, `to` and a `weight`, for files that change together;
  - `trace` is an ordered list of file ids with a short label each, drawn as numbered steps;
  - `onSelect` gets the pressed file's id.

  The App draws the layout, labels, camera, zoom and selection. Plugins never see the renderer, as with `Chart`. This is the Atlas Code Map in Paper; it becomes a kit component because Plugins cannot draw thousands of files any other way.
- **Victory Native draws charts on every App.** It runs on React Native Skia, Reanimated and Gesture Handler. Argo already has the last two, so it adds `@shopify/react-native-skia` and `victory-native`. Core uses the same `Chart` for its own charts, so there is one chart library in Argo.
- **Skia draws every other 2D canvas.** `CodeMap`'s `flat` view, its trace steps and links, and the lines between boxes in Atlas diagrams are drawn with Skia directly. Boxes, cards and labels that hold text stay kit views laid over the canvas, so text, press and screen readers work as everywhere else. Small bars, such as the measure bars in an inspector, stay plain views and never load Skia.
- **three.js draws `CodeMap`'s `3d` view.** Phones use `expo-gl`, which gives a native OpenGL context with the WebGL API, and `@react-three/fiber/native`; web and desktop use WebGL with `@react-three/fiber`. This adds `expo-gl`, `three` and `@react-three/fiber`. Skia is 2D only, and three.js on `expo-gl` is the usual way to draw 3D in an Expo app.
- **Web and desktop load Skia and three.js only when they are used.** On web, Skia runs as CanvasKit, a 2.9 MB gzipped WebAssembly file. The App loads it with `WithSkiaWeb` the first time a Skia view appears, never at launch, and loads three.js the first time a `3d` `CodeMap` appears. The desktop App ships these files inside the app, so they cost no download, only the time to compile them.
- **The Server checks all three.** `argo plugin validate`, the plugin host and `mount()` in the test kit refuse an `Svg`, `Chart` or `CodeMap` that breaks these rules and log one line naming the Plugin, the node and the reason. In a Replaceable Slot the whole tree is refused and core draws its own, as ADR-0027 says. In pages and ordinary Slots the node is dropped, as an unknown leaf is in ADR-0025.

## Before this is accepted

- Victory Native's docs do not mention web. A prototype must draw each `Chart` kind on web and in the desktop App through `WithSkiaWeb`, and record how long CanvasKit takes to load there.
- A second prototype must draw a `3d` `CodeMap` of argo-universal's files on an iPhone, an Android phone and web, and record the frame rate while panning.

If either fails, this ADR goes back to the owner instead of switching renderers silently.

## Considered options

- **Victory Native on phones, Victory (SVG) on web and desktop.** Rejected: two chart libraries whose drawings must be kept alike, and nothing to draw what Victory lacks. It stays the fallback if the web prototype fails.
- **`Svg` on desktop and web only,** as in Claude Code. Rejected: Plugin UI would differ on phones, and the phones already draw SVG.
- **Any SVG `SvgXml` accepts.** Rejected: Plugins could set raw colours, and markup the phones drop would look different per App.
- **Charts as SVG from the Plugin.** Rejected: every Plugin would draw its own axes and labels, and they would not match.
- **The code map as SVG from the Plugin.** Rejected: thousands of files pass the 131,072-character cap, and SVG cannot pan, zoom or draw 3D smoothly on phones.
- **The 3D map in a WebView with three.js.** Rejected: every press and selection crosses a message bridge, gestures do not feel native, and ADR-0025 keeps web views to desktop and web.
- **Plugin-drawn WebGL.** Rejected: WebGL needs JavaScript draw calls and shaders, which are code, and ADR-0025 keeps Plugin code off the Apps. Desktop and web may get it later through ADR-0025's web view escape hatch.
- **A `Scene` kit component that takes glTF, the standard 3D scene file.** Deferred until a second Plugin needs 3D. It would follow `Svg`'s rules: a size and vertex cap set from the 3D prototype; meshes, lines, groups, transforms and a camera allowed; shaders, scripts, external URLs and textures refused; material names mapped to Argo tones instead of raw colours; the App draws pan, zoom and orbit, and `onPress` returns the pressed object's name. Not added now: no plugin system we copy does this, and Atlas would re-send the whole scene on every selection where `CodeMap` changes one prop.
- **`react-native-wgpu` with three.js's WebGPU renderer.** Rejected for now: newer and less proven than `expo-gl`. It is the next step if the 3D prototype is too slow.
- **Exposing Victory Native's, Skia's or three.js's components to Plugins.** Rejected: the renderer could never change, and props would carry styles the kit forbids.
