# CodeMap #834 — throwaway prototype

This branch answers the renderer question in [#834](https://github.com/milad-alizadeh/argo-universal/issues/834).
It is a review artifact. It must not become the production Plugin registry or `CodeMap` component.

Design source: [Argo · Atlas](https://app.paper.design/file/01M4RJB4J2JMHAQCZYTSD808R7/p-1-0).
The map uses `Code Map area / 3D` (`8G-0`), `File selected` (`AU-0`), and `Flat` (`CZ-0`).
The view toggle, measure plate, and camera controls use their masters in `Components / Map controls` (`3O-0`).
The prototype omits the Frame, Inspector, filters, and measure menus.

## Run

From the Project root:

```sh
pnpm install --frozen-lockfile
pnpm --filter @repo/codemap-834-prototype web
```

Open [the prototype](http://localhost:8340/codemap-834-prototype).
Use `?view=3d` or `?view=flat`.
Use `&files=5000` or `&files=20000` for a stress run.
Other `files` values show the real dataset once.

For a production web export:

```sh
pnpm --filter @repo/codemap-834-prototype export-web
node apps/codemap-834-prototype/scripts/serve-export.mjs
```

## Data and renderers

`prepare-map` reads tracked text files from the current Checkout.
It excludes binary files, files larger than 500,000 characters, and this prototype package.
It also excludes its manual generator in `tools/codemap-834/`.
The checked-in snapshot records its source revision.
Area is line count. Height is file touches across the last 1,000 commits.
Colour is a lexical branch count, not cyclomatic complexity.
Stress datasets repeat real measurements under unique `stress-N/` paths and IDs.
They do not claim that this Project has 20,000 unique files.

The 3D view uses one instanced box mesh through R3F and three.js WebGL.
The flat view uses a recorded Skia picture through `WithSkiaWeb` and CanvasKit.
Skia draws that picture into its public CPU surface API on every web and desktop configuration.
This keeps map pixels in the same sRGB colour space as their token-based legend.
Skia 2.6.2’s web Canvas hard-codes Display P3 and ignores its public colour-space prop on web.
The App copies those pixels to a 2D canvas at DPR 1.
Picking, labels, tokens and camera transforms use the same data and rules.
The CPU surface and image are disposed after each completed copy.
CPU readiness is reported only after pixels reach the visible canvas.
3D readiness is reported from the first frame R3F draws.
The token palette comes from the existing `useNativeTheme` helper.
The browser resolves its colour strings to RGB for both renderers.
Lights also use theme tokens. No renderer supplies a default colour.
Labels use kit `Text` and screen-space culling, capped at 32.
3D labels omit roof anchors hidden behind nearer buildings.
An accessible file selector returns the same file ID as a canvas press.
`CodeMap` (`src/code-map/`, imported through its `index.ts`) takes only ADR-0028's `label`, `view`, `files`, `selectedId` and `onSelect`; it owns the renderer, camera controls, labels, palette, readiness and file list.
It reports readiness, labels and selection to the measurement record in `src/evidence/`, never through props.

`src/` has one folder per module:

- `code-map/`: the `CodeMap` module. Its `index.ts` is the only entry other folders use. Inside it:
  - `flat/` and `three/` hold the two renderers;
  - `viewport/` holds the camera interface both renderers satisfy, and pointer picking;
  - `labels/` places labels from a camera pose;
  - `layout/` is the treemap;
  - `plates/` measures the plates over the map to keep labels clear of them.
- `evidence/`: the measurement record behind `window.__codemap834` and the pan frame sampler.
- `page/`: the prototype page around the map, its state and the dataset snapshot reader.
The native entry renders nothing. Phones do not import either renderer.

## Collect evidence

The collector declares Playwright, Electron and rolldown through the existing workspace catalog.
Its imports are static. The manual generator runs outside the App source.
It launches one browser at a time, with three six-second pan samples per file count and renderer.
It writes JSON and screenshots outside git, in a unique temporary directory by default.
Set `CODEMAP_EVIDENCE` to choose the directory.

```sh
node apps/codemap-834-prototype/scripts/measure.mjs web
node apps/codemap-834-prototype/scripts/measure.mjs electron
node apps/codemap-834-prototype/scripts/measure.mjs electron-no-gpu
node apps/codemap-834-prototype/scripts/build-desktop.mjs
node apps/codemap-834-prototype/scripts/measure.mjs desktop
node apps/codemap-834-prototype/scripts/measure.mjs desktop-no-gpu
```

The reported FPS is submitted-frame cadence during a moving camera or Skia transform.
It is not a GPU completion timer or a guarantee of physical display refresh.
The collector records the renderer string and Electron GPU feature status.
Scenario-ready timing starts before context creation or Electron launch and stops before the one-second settling delay.
The in-page mount timer starts at prototype-module evaluation and ends when the mounted view's first frame is drawn.
`electron-no-gpu` calls `app.disableHardwareAcceleration()` before `ready`.
The full desktop mode uses Electron’s `--disable-gpu` switch and records GPU feature status.
Neither mode forces a software renderer or changes CSP.

The Electron harness imports the production `app://` handler.
It does not start the Server or prove the complete desktop App lifecycle.
A protocol-harness result cannot close the full desktop App criterion.
The `desktop` modes launch the App with its real Server and preload.
Each launch uses its own `ARGO_HOME`, App data directory, and free Server port.
Desktop collection uses the existing `ARGO_BACKGROUND=1` setting to disable background timer throttling.
The collector then shows and focuses the App window.
Each pan sample has a ten-second timeout to expose a stalled timer.
Append `3d` or `flat` to the collector command to measure one renderer.
`build-desktop.mjs` compiles the existing entry points without changing their source.
It copies the export into the local ignored `dist` directory expected by the App.
The PR body and the #834 comment hold measurements, screenshots, and the verdict.

## Dependencies and limits

All new renderer dependencies belong to this branch's separate prototype package.
The package imports kit Text and theme helpers through explicit client exports.
The shared theme helper adds the existing warning token without changing other roles.
Skia is pinned to 2.6.2, matching the parallel chart prototype.
This branch does not change the chart prototype, its route, or the universal-app manifest.
The root lockfile adds the prototype importer and refreshes peer snapshots without changing existing pinned package versions.
It overlaps #709 and the chart work and requires a fresh dependency reconciliation before any later integration.

The desktop CSP adds only `wasm-unsafe-eval` to `script-src`, as ADR-0028 specifies.
Every other directive stays unchanged; JavaScript `unsafe-eval` remains forbidden.
The chart branch has an overlapping uncommitted change. Coalesce the identical CSP edit during integration.
Normal desktop flat and GPU-disabled flat now use CanvasKit without a CSP bypass.
3D still requires WebGL. A proposed Flat fallback is awaiting owner design approval in Atlas Explorations.
ADR-0017 records the owner's exception for the two deferred renderer imports.

Links and trace steps are not implemented or benchmarked.
File-only results cannot validate ADR-0028's 50,000-link or 200-step caps.
Production validation, disposal under rapid renderer switches, accessibility journeys, and phone file lists remain outside this prototype.
