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
The checked-in snapshot records its source revision.
Area is line count. Height is file touches across the last 1,000 commits.
Colour is a lexical branch count, not cyclomatic complexity.
Stress datasets repeat real measurements under unique `stress-N/` paths and IDs.
They do not claim that this Project has 20,000 unique files.

The 3D view uses one instanced box mesh through R3F and three.js WebGL.
The flat view uses a recorded Skia picture through `WithSkiaWeb` and CanvasKit.
The token palette comes from the existing `useNativeTheme` helper.
The browser resolves its colour strings to RGB for both renderers.
Lights also use theme tokens. No renderer supplies a default colour.
Labels use kit `Text` and screen-space culling, capped at 32.
An accessible file selector returns the same file ID as a canvas press.
The native entry renders nothing. Phones do not import either renderer.

## Collect evidence

The collector uses the existing E2E package's Playwright and desktop package's Electron installations.
It launches one browser at a time, with three six-second pan samples per file count and renderer.
It writes JSON and screenshots outside git, in `/tmp/codemap-834-evidence` by default.

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
The in-page mount timer starts at prototype-module evaluation and ends at the renderer-ready callback.
`electron-no-gpu` calls `app.disableHardwareAcceleration()` before `ready`.
The full desktop mode uses Electron’s `--disable-gpu` switch and records GPU feature status.
Neither mode forces a software renderer or changes CSP.

The Electron harness imports the unchanged production `app://` handler.
It does not start the Server or prove the complete desktop App lifecycle.
A protocol-harness result cannot close the full desktop App criterion.
The `desktop` modes instead launch the unchanged App with its real Server and preload.
Each launch uses its own `ARGO_HOME`, App data directory, and free Server port.
Append `3d` or `flat` to the collector command to measure one renderer.
`build-desktop.mjs` compiles the existing entry points without changing their source.
It copies the export into the local ignored `dist` directory expected by the App.
The PR body and the #834 comment hold measurements, screenshots, and the verdict.

## Dependencies and limits

All new renderer dependencies belong to this branch's separate prototype package.
Skia is pinned to 2.6.2, matching the parallel chart prototype.
This branch does not change that prototype, its route, the universal-app manifest, or `app-protocol.ts`.
The root lockfile adds the prototype importer and refreshes peer snapshots without changing existing pinned package versions.
It overlaps #709 and the chart work and requires a fresh dependency reconciliation before any later integration.

Main's current desktop CSP has no `wasm-unsafe-eval` allowance.
ADR-0028 describes that allowance, and the chart branch owns its pending implementation.
A CanvasKit CSP failure remains open until that owner integrates the change.
This prototype does not bypass the policy.

Links and trace steps are not implemented or benchmarked.
File-only results cannot validate ADR-0028's 50,000-link or 200-step caps.
Production validation, disposal under rapid renderer switches, accessibility journeys, and phone file lists remain outside this prototype.
