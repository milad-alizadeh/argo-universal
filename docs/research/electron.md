# Electron

Research for `apps/desktop` (spec 0001, section 9 Desktop). Checked on 2026-10-03.

## Sources

| # | Title | URL | Used for |
|---|---|---|---|
| S1 | npm registry: `electron` (`npm view`, `npm pack electron@44.5.1`) | https://www.npmjs.com/package/electron | Dist-tags, release dates, `package.json` (no lifecycle scripts, `bin`, `engines`, deps), `install.js`, `index.js` |
| S2 | Electron releases feed | https://releases.electronjs.org/releases.json | Bundled Node, Chromium, V8 per release |
| S3 | Breaking changes | https://github.com/electron/electron/blob/main/docs/breaking-changes.md | 42.0 postinstall removal, 44/45/46 changes |
| S4 | Advanced installation | https://www.electronjs.org/docs/latest/tutorial/installation | Install command, lazy download, cache, env vars |
| S5 | ES Modules (ESM) in Electron | https://github.com/electron/electron/blob/v44.5.1/docs/tutorial/esm.md | ESM rules for main and preload |
| S6 | Process Sandboxing | https://github.com/electron/electron/blob/v44.5.1/docs/tutorial/sandbox.md | Sandboxed preload `require` subset |
| S7 | Security checklist | https://github.com/electron/electron/blob/v44.5.1/docs/tutorial/security.md | Context isolation, sandbox, CSP, navigation, IPC sender, custom protocol |
| S8 | `protocol` API | https://github.com/electron/electron/blob/v44.5.1/docs/api/protocol.md | `registerSchemesAsPrivileged`, `protocol.handle`, `net.fetch` |
| S9 | `CustomScheme` structure | https://github.com/electron/electron/blob/v44.5.1/docs/api/structures/custom-scheme.md | Scheme privileges |
| S10 | `webPreferences` | https://github.com/electron/electron/blob/v44.5.1/docs/api/structures/web-preferences.md | `preload`, `sandbox`, `contextIsolation`, `nodeIntegration`, `additionalArguments` |
| S11 | `process` API | https://github.com/electron/electron/blob/v44.5.1/docs/api/process.md | `process.argv` exists in sandboxed renderers |
| S12 | Sandboxed preload runner source | https://github.com/electron/electron/blob/v44.5.1/lib/sandboxed_renderer/preload.ts | Preload wrapper gets `require, process, exports, module` |
| S13 | `contextBridge` API | https://github.com/electron/electron/blob/v44.5.1/docs/api/context-bridge.md | `exposeInMainWorld` |
| S14 | Inter-Process Communication | https://github.com/electron/electron/blob/v44.5.1/docs/tutorial/ipc.md | `send`/`on`, `invoke`/`handle`, `sendSync` warning, `fromWebContents` |
| S15 | `BaseWindow` / `BrowserWindow` API | https://github.com/electron/electron/blob/v44.5.1/docs/api/base-window.md | `minimize`, `maximize`, `unmaximize`, `isMaximized`, `close` |
| S16 | Process model | https://github.com/electron/electron/blob/v44.5.1/docs/tutorial/process-model.md | `utilityProcess`, `electron/main` type aliases |
| S17 | `utilityProcess` API | https://github.com/electron/electron/blob/v44.5.1/docs/api/utility-process.md | Options (no `detached`) |
| S18 | Environment variables | https://github.com/electron/electron/blob/v44.5.1/docs/api/environment-variables.md | `ELECTRON_RUN_AS_NODE` |
| S19 | `app` API | https://github.com/electron/electron/blob/v44.5.1/docs/api/app.md | `app.isPackaged` |
| S20 | Electron ESM spec fixture | https://github.com/electron/electron/blob/v44.5.1/spec/fixtures/esm/import-meta/main.mjs | Named ESM imports from `electron`, `import.meta.url` for preload path |
| S21 | Electron timelines | https://github.com/electron/electron/blob/main/docs/tutorial/electron-timelines.md | Latest three stable majors supported |
| S22 | Distributing apps with Electron Forge | https://github.com/electron/electron/blob/v44.5.1/docs/tutorial/forge-overview.md | Forge is the official packaging tool |
| S23 | Electron Forge home | https://www.electronforge.io/ | Generator command, pnpm `node-linker=hoisted` requirement |
| S24 | Forge Vite plugin | https://www.electronforge.io/config/plugins/vite | Vite plugin is experimental, dev-server globals |
| S25 | `create-electron-app@8.0.1` source (`npm pack`) | https://www.npmjs.com/package/create-electron-app | Flags and prompts, installed dependencies |
| S26 | `@electron-forge/template-vite@8.0.1` and `template-base@8.0.1` (`npm pack`) | https://www.npmjs.com/package/@electron-forge/template-vite | Generated files and pnpm config |
| S27 | Forge GitHub releases | https://github.com/electron/forge/releases | v8 changes (Node 22 + ESM, `--typescript`, `--package-manager`, Vite 8) |
| S28 | npm registry: `electron-vite` | https://www.npmjs.com/package/electron-vite | Version, peer `vite` range |
| S29 | TypeScript modules reference | https://www.typescriptlang.org/docs/handbook/modules/reference.html | `.cts` always emits CommonJS `.cjs` |
| S30 | Node.js 24 `child_process` docs | https://github.com/nodejs/node/blob/v24.x/doc/api/child_process.md | `detached`, `unref()`, `stdio` |
| S31 | pnpm build settings | https://pnpm.io/settings/build | `allowBuilds`, removal of `onlyBuiltDependencies`, `strictDepBuilds` |
| S32 | Turborepo configuration reference | https://turborepo.dev/docs/reference/configuration | `persistent`, `cache`, `with`, `env`, `passThroughEnv` |
| S33 | Turborepo env source | https://github.com/vercel/turborepo/blob/main/crates/turborepo-env/src/lib.rs | Built-in pass-through env list (`DISPLAY`, `ELECTRON_RUN_AS_NODE`) |
| S34 | Paseo `packages/desktop/src/main.ts` @ d831c7b | https://github.com/getpaseo/paseo/blob/d831c7bf33bbcad1835cf8e81668b8eebb97f3f4/packages/desktop/src/main.ts | Working `app://` handler for an Expo web export |
| S36 | First app tutorial | https://github.com/electron/electron/blob/v44.5.1/docs/tutorial/tutorial-2-first-app.md | `"start": "electron ."`, `main` entry |
| S37 | Packaging tutorial | https://github.com/electron/electron/blob/v44.5.1/docs/tutorial/tutorial-5-packaging.md | `electron-forge import` for existing apps |
| S35 | Paseo `packages/desktop/package.json` and `tsconfig.json` @ d831c7b | https://github.com/getpaseo/paseo/blob/d831c7bf33bbcad1835cf8e81668b8eebb97f3f4/packages/desktop/package.json | Paseo builds main with plain `tsc` |

## Versions

Checked 2026-10-03.

| Package | Version | Notes |
|---|---|---|
| `electron` | **44.5.1** (`latest`, 2026-09-30) | Node **24.21.0**, Chromium 152.0.7977.130, V8 15.2 [S1, S2]. 44.0.0 shipped 2026-08-24 [S2]. `engines.node >= 22.12.0` [S1]. |
| `electron` beta / alpha | 44.0.0-beta.6 / 45.0.0-alpha.14 | 45 alpha also bundles Node 24.21.0 [S1, S2]. |
| Supported lines | 44, 43, 42 | "The latest three stable major versions are supported" [S21]; 43.7.7 and 42.11.10 were released 2026-09-30 [S1]. |
| `create-electron-app` / `@electron-forge/cli` | 8.0.1 | `engines.node >= 22.13.0` [S1, S25]. |
| `@electron-forge/template-vite-typescript` | 7.11.2 | Last v7 package; in v8 the Vite template takes `--typescript` instead [S25, S26]. |
| `electron-vite` (community) | 5.0.0 | Peer `vite ^5 \|\| ^6 \|\| ^7` (not 8) [S28]. |

Electron 44's bundled Node (24.21.0) matches the repo's Node 24.21.0 [S2].

`electron` depends on `@types/node ^24.9.0` [S1].

## Install command

```sh
pnpm add --save-dev --save-exact electron@44.5.1 --filter @argo/desktop
```

- Electron's docs install it as a dev dependency: `npm install electron --save-dev` [S1 README, S4]. Forge installs it with an exact version [S25].
- Since Electron 42 the package has **no `postinstall` script**. The binary downloads the first time `electron` runs (for example `npx electron .`), or when `require('electron')` runs from Node [S3, S1 `index.js`]. Electron 41.10.7 still had `"postinstall": "node install.js"`, and 42.11.10 has none [S1].
- To download ahead of time, for example in CI before tests: `npx install-electron --no` [S3, S4].
- `ELECTRON_SKIP_BINARY_DOWNLOAD` is no longer supported [S3]. To pick a target, use `ELECTRON_INSTALL_PLATFORM` / `ELECTRON_INSTALL_ARCH` at first run [S3].
- Cache: `~/Library/Caches/electron/` on macOS and `$XDG_CACHE_HOME` or `~/.cache/electron/` on Linux. Override it with `electron_config_cache` [S4].

## Generator command and its prompts

The official generator is Electron Forge's `create-electron-app`. Electron's docs point to Forge for packaging and distribution [S22, S23].

For a Vite + TypeScript project with no prompts:

```sh
npx create-electron-app@latest desktop --template=vite --typescript --package-manager=pnpm --skip-git
```

- In Forge 8, `--template=vite --typescript` replaces the v7 `--template=vite-typescript` [S25, S26]. The Forge website still shows the v7 form `npx create-electron-app@latest my-new-app --template=vite-typescript` [S24].
- Flags: `-t/--template`, `--typescript`, `--package-manager <npm|pnpm|yarn[@ver]>`, `--electron-version <ver|latest|beta|nightly>`, `--skip-git`, `-f/--force`, `-c/--copy-ci-files` [S25].
- When you pass any flag, it does not prompt. The one exception: `--typescript` without `--template` asks "Select a bundler" (Vite or webpack) [S25].

With no flags, the interactive prompts are, in order [S25]:
1. If the directory is not empty: "… is not empty. Would you like to continue and overwrite existing files?" (default No).
2. "Select a package manager": npm, pnpm, Yarn (Berry), Yarn (Classic).
3. "Select a bundler": None, Vite, webpack.
4. Only if the bundler is not None: "Select a programming language": JavaScript or TypeScript.
5. "Select an Electron release": `electron@latest`, `electron@beta`, `electron-nightly@latest`.
6. "Would you like to initialize Git in your new project?" (default Yes).

What `--template=vite --typescript` produces (Forge 8.0.1) [S25, S26]:
- `forge.config.mts` contains makers (Squirrel, ZIP, Deb, Rpm), `VitePlugin` (main `src/main.ts`, preload `src/preload.ts`, renderer `main_window`), and `FusesPlugin`.
- `vite.main.config.mts`, `vite.preload.config.mts`, and `vite.renderer.config.mts` are all empty `defineConfig({})`.
- Other files: `index.html`, `src/main.ts`, `src/preload.ts` (empty), `src/renderer.ts`, `src/index.css`, `src/declarations.d.ts`, `tsconfig.json` (`module: preserve`, `moduleResolution: bundler`), `.oxlintrc.json`, `.oxfmtrc.json`, and `.gitignore`.
- `package.json` has `main: ".vite/build/main.cjs"` and the scripts `start`, `package`, `make`, `release`, `lint` (oxlint + oxfmt), and `typecheck`. The main process is **bundled to CommonJS**, and the template main loads `preload.cjs` through `__dirname`.
- Dependencies: `electron-squirrel-startup`. Dev dependencies: `@electron-forge/cli`, the four makers, `plugin-auto-unpack-natives`, `plugin-fuses`, `@electron/fuses`, `@electron-forge/plugin-vite`, `vite ^8`, `typescript ^6`, `oxlint`, `oxfmt`, and `electron` (exact).
- With pnpm it also writes a **`pnpm-workspace.yaml`** containing `allowBuilds: {electron: true, electron-winstaller: true}` and `nodeLinker: hoisted`. It also adds `devEngines.packageManager: pnpm@11.21.0` and a `peerDependencies` entry for `electron-winstaller`.

### Facts that bear on using Forge when packaging is out of scope

- Forge is described as "a tool for packaging and publishing Electron applications" [S22]. Most of what it installs serves `package`/`make`/`publish`: makers, fuses, and `electron-squirrel-startup` [S25, S26].
- The Forge Vite plugin is marked **experimental** ("Future minor releases may contain breaking changes"). The docs say this for v7.5.0 and later [S24]. The v8 docs say nothing new about its status.
- Forge's docs require `node-linker=hoisted` with pnpm [S23], and the template writes `nodeLinker: hoisted` [S26].
- Forge's template lints with oxlint and oxfmt [S26]. ADR-0001 chooses Biome.
- The Forge Vite output is CommonJS (`main.cjs`, `preload.cjs`) [S26]. The spec asks for "ESM everywhere".
- Other documented options with no Forge involved:
  1. **Plain Electron + `tsc`.** Electron's docs run an app with `electron .` / `npx electron .` [S4, S36]. Paseo builds main with `tsc -p tsconfig.json` (NodeNext) and runs `electron` on `dist/main.js` [S35].
  2. **Plain Electron + a bundler** (esbuild, Vite in library mode, or similar) for main and preload. Electron's docs recommend a bundler when a sandboxed preload needs more than one file [S5, S6].
  3. **`electron-vite`** (community, not maintained by Electron). Version 5.0.0 has peer `vite` up to 7 [S28].
  4. **Forge without its generator**: `npm install --save-dev @electron-forge/cli && npx electron-forge import`. Electron's packaging tutorial documents this as the way to add Forge later [S37].

## Recommended configuration

### ESM rules (exact)

| Context | ESM? | Rule |
|---|---|---|
| Main process | Yes, Node loader | `.mjs`, or the nearest `package.json` has `"type": "module"` [S5]. Named imports work: `import { app, BrowserWindow } from 'electron'` [S20]. |
| Main, before `ready` | Caveat | ESM loads asynchronously. `await` anything that must run before `ready`, such as a dynamic `import()`. Static imports are fine [S5]. `protocol.registerSchemesAsPrivileged` must run before `ready` [S8]. |
| Preload, **sandboxed** (`sandbox: true`) | **No** | "Sandboxed preload scripts are run as plain JavaScript without an ESM context." Use `require('electron')` [S5]. |
| Preload, unsandboxed | Yes | Must be `.mjs`. Preload ignores `"type": "module"` [S5]. |

The sandboxed preload is called as a function with `require, process, exports, module` [S12]. CommonJS output from `tsc` therefore runs, as long as it is **one file**.

`require` in a sandboxed preload loads only `electron` (with `contextBridge`, `ipcRenderer`, `webFrame`, `webUtils`, `nativeImage`, `crashReporter`), plus `events`, `timers`, and `url` [S6]. Electron 45 removes `events`/`timers`/`url` and the `Buffer`/`setImmediate` globals from sandboxed preloads [S3].

Sandbox is the default since Electron 20. `nodeIntegration: true` turns the sandbox off [S6, S10]. `contextIsolation` defaults to `true` [S10].

In ESM main, `__dirname` does not exist. Use `import.meta.dirname` or `fileURLToPath(new URL('…', import.meta.url))` [S20]. `preload` must be an absolute path [S10].

### TypeScript: one way that keeps ESM main and a CommonJS preload with `tsc` only

TypeScript always emits a `.cts` file as CommonJS `.cjs`, whatever `"type"` says [S29]. So:

```
apps/desktop/
  package.json          "type": "module", "main": "dist/main/index.js"
  src/main/index.ts     → dist/main/index.js   (ESM)
  src/preload/index.cts → dist/preload/index.cjs (CommonJS, single file, imports only 'electron')
```

Caveats:
- The preload may `import type` from other packages, but a value import compiles to `require('…')`, which the sandbox rejects [S6, S12].
- If main imports a workspace package that ships TypeScript source, Electron must be able to load `.ts`. Electron does not document Node's type stripping. Unverified; either bundle main, or keep main's runtime imports to built JavaScript packages.

### Main process (sketch)

```ts
// src/main/index.ts
import { app, BrowserWindow, ipcMain, net, protocol } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const scheme = 'app';
const developmentUrl = process.env.ARGO_EXPO_WEB_URL ?? 'http://localhost:8081'; // Paseo uses 8081 [S34]

// Before `ready`, once [S8]. `standard` gives relative URLs and web storage; `secure` treats it like https [S8, S9].
protocol.registerSchemesAsPrivileged([
  { scheme, privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

function serveExport(distDirectory: string) {
  protocol.handle(scheme, async (request) => {
    const { pathname, search, hash } = new URL(request.url);
    const decodedPath = decodeURIComponent(pathname);
    // Paseo: redirect /index.html to / so Expo Router sees the route [S34]
    if (decodedPath.endsWith('/index.html')) {
      return Response.redirect(`${scheme}://app${decodedPath.slice(0, -11) || '/'}${search}${hash}`, 307);
    }
    const filePath = path.join(distDirectory, decodedPath);
    const relativePath = path.relative(distDirectory, filePath);
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      return new Response('Not found', { status: 404 }); // path-escape check, as in the docs [S8]
    }
    // SPA fallback: extensionless paths get index.html [S34]
    const target = !relativePath || !path.extname(relativePath) ? path.join(distDirectory, 'index.html') : filePath;
    const response = await net.fetch(pathToFileURL(target).toString());
    const headers = new Headers(response.headers);
    headers.set('Content-Security-Policy', contentSecurityPolicy);
    return new Response(response.body, { status: response.status, headers });
  });
}

// A starting point to verify against the Expo export. Server is on 127.0.0.1 (ADR-0002).
const contentSecurityPolicy =
  "default-src 'self'; script-src 'self'; connect-src 'self' ws://127.0.0.1:* http://127.0.0.1:*; img-src 'self' data: blob: http://127.0.0.1:*";

function createWindow(serverUrl: string) {
  const window = new BrowserWindow({
    webPreferences: {
      preload: path.join(import.meta.dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      additionalArguments: [`--argo-server-url=${serverUrl}`], // appended to process.argv in the renderer [S10]
    },
  });
  if (app.isPackaged /* [S19] */ || process.env.ARGO_DESKTOP_USE_EXPORT) {
    void window.loadURL(`${scheme}://app/`);
  } else {
    void window.loadURL(developmentUrl);
  }
  return window;
}

// Window controls: one-way renderer→main messages [S14], checking the sender [S7 #17].
for (const action of ['minimize', 'maximize', 'close'] as const) {
  ipcMain.on(`window:${action}`, (event) => {
    if (!isTrustedOrigin(event.senderFrame?.origin)) return;
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) return;
    if (action === 'maximize') window.isMaximized() ? window.unmaximize() : window.maximize(); // [S15]
    else window[action]();
  });
}
```

- `will-navigate`: keep the window on its own origin by calling `preventDefault` for other origins. `setWindowOpenHandler`: return `{ action: 'deny' }` [S7 #13, #14].
- Prefer a custom protocol over `file://`, because `file://` pages can read any file [S7 #18].
- A protocol handler is registered per session. With a custom `partition`, register it on that session [S8].

### Preload

```ts
// src/preload/index.cts — sandboxed: CommonJS, one file, only 'electron' [S5, S6]
import { contextBridge, ipcRenderer } from 'electron';

const prefix = '--argo-server-url=';
const serverUrl = process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length) ?? null;

contextBridge.exposeInMainWorld('argo', {
  serverUrl,
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
  },
});
```

- `process.argv` is one of the few `process` members in a sandboxed renderer [S11]. `additionalArguments` is documented as "useful for passing small bits of data down to renderer process preload scripts" [S10].
- Alternative: `ipcRenderer.sendSync`. Electron recommends "avoiding this API" because it blocks the renderer [S14]. `ipcRenderer.invoke` is async, so `serverUrl` would become a Promise and no longer a plain value [S14].
- Do not expose `ipcRenderer` or a raw `ipcRenderer.on`. Wrap each call [S7 #20, S14].

### Starting the Server detached

- `utilityProcess.fork` is Electron's preferred child-process API, but its options include no `detached` [S16, S17]. A Server that outlives the app therefore uses Node's `child_process.spawn`.
- With `detached: true` the child "will be made the leader of a new process group and session" on POSIX. Call `unref()`, and use `stdio` that is not connected to the parent (`'ignore'`, or file descriptors to a log file). Otherwise the child stays attached to the terminal [S30].
- In Electron, `process.execPath` is the Electron binary. Running it as Node needs `ELECTRON_RUN_AS_NODE=1`, and the `runAsNode` fuse turns that off [S18]. Forge's template turns that fuse off [S26]. In dev, spawning the Server's own command (for example `tsx`) avoids this.

```ts
import { spawn } from 'node:child_process';
const child = spawn(command, argumentsList, { detached: true, stdio: 'ignore', cwd: serverDirectory });
child.unref(); // [S30]
```

### Security checklist (applies here)

From S7:
- Context isolation on (#3).
- Sandbox on (#4).
- No Node integration (#2).
- No change to `webSecurity` (#6).
- A CSP (#7). It can be a response header, which our `protocol.handle` controls.
- Limit navigation and new windows (#13, #14).
- Validate the IPC `sender` (#17).
- A custom protocol, not `file://` (#18).
- Fuses at packaging time (#19, out of scope).
- Expose no raw Electron APIs (#20).
- Use a current Electron (#16).

## pnpm + Turborepo monorepo specifics

- **Build approval:** `electron` 42+ has no lifecycle scripts [S1, S3], so pnpm's build gate (`strictDepBuilds`, default `true` [S31]) does not involve it. pnpm 11 replaced `onlyBuiltDependencies` with `allowBuilds` (`onlyBuiltDependencies: [electron]` → `allowBuilds: {electron: true}`) [S31]. The Forge template still writes `allowBuilds: {electron: true}` [S26]. With 44.5.1 that has nothing to allow [S1].
- **Download in CI:** the binary downloads on first run [S3]. In CI, run `pnpm --filter @argo/desktop exec install-electron --no` before Playwright, and cache `~/.cache/electron` on Linux [S3, S4].
- **`node-linker`:** Electron's install docs say nothing about pnpm [S4]. Forge requires `node-linker=hoisted` [S23].
- **Nested workspace file:** the Forge generator writes its own `pnpm-workspace.yaml` (with `nodeLinker: hoisted`) into the generated folder when pnpm is chosen [S26]. Inside this repo, that file would sit under `apps/desktop/`, next to the root workspace file.
- **`@types/node`:** `electron` depends on `@types/node ^24.9.0` [S1]. Keep the catalog's `@types/node` on 24.x so that there is one copy.
- **Turborepo `dev`:** a persistent task cannot be a dependency ("Turborepo will error") [S32]. So `@argo/desktop#dev` cannot `dependsOn` the Server's or Expo's `dev`. It must wait by itself, as spec section 10 already says. `with` runs companion tasks alongside [S32]. Use `"persistent": true, "cache": false` for `dev` [S32].
- **Turborepo env:** strict mode filters the environment [S32]. `DISPLAY`, `XAUTHORITY`, `DBUS_SESSION_BUS_ADDRESS`, `HOME`, and `ELECTRON_RUN_AS_NODE` pass through by default [S33]. Add our own variables (for example the Expo web URL) to `env`/`passThroughEnv` [S32].

## Gotchas

- **`ELECTRON_RUN_AS_NODE` leaks.** If this variable is set in the shell, `electron .` starts as plain Node [S18]. Turborepo passes it through by default [S33]. Unset it in the desktop `dev` script.
- **Forge docs lag v8.** The website shows `--template=vite-typescript` and Node ≥ 16.4 [S23, S24]. Forge 8.0.1 needs Node ≥ 22.13 and uses `--template=vite --typescript` [S25, S26].
- **ESM main and `ready`.** Anything before `ready` (scheme registration, `app.setPath`) must be a static import or awaited [S5, S8].
- **Sandboxed preload is one file.** It cannot use ESM and cannot `require` local files [S5, S6]. Electron 45 also removes `Buffer`, `setImmediate`, and the `events`/`timers`/`url` shims [S3].
- **Standard scheme is required** for relative URLs and for `localStorage`/IndexedDB/cookies [S8].
- **Protocol per session.** A custom `partition` needs `session.protocol.handle` [S8].
- **Expo Router and `/index.html`.** Chromium may request `/index.html`. Paseo redirects it to `/` so the router sees the right route [S34].
- **Electron 44 drops macOS 12** and 32-bit Windows/Linux ARMv7 [S3].
- **`--no-sandbox`** is "for testing purposes" only [S6].
