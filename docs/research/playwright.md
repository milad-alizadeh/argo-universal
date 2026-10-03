# Playwright, Playwright for Electron included

Research note for spec 0001 (step 1). Checked on 2026-10-03.

## Sources

| # | Title | URL | Used for |
|---|---|---|---|
| S1 | npm registry: `@playwright/test`, `playwright`, `create-playwright`, `electron` | https://www.npmjs.com/package/@playwright/test | Versions, dist-tags, release dates (`npm view`) |
| S2 | Playwright: Installation | https://playwright.dev/docs/intro | Init command per package manager, prompts, files, supported Node and OS |
| S3 | `create-playwright` source (`cli.ts`, `generator.ts`, `packageManager.ts`) | https://github.com/microsoft/create-playwright/tree/main/src | Every flag, quiet-mode defaults, pnpm detection, `-w` behaviour. Also ran `create-playwright@1.17.139` in a temp dir |
| S4 | Playwright: Web server | https://playwright.dev/docs/test-webserver | `webServer` options, array form, `url` vs `port`, readiness codes, `baseURL` |
| S5 | `webServerPlugin.ts` | https://github.com/microsoft/playwright/blob/main/packages/playwright/src/plugins/webServerPlugin.ts | How `env` merges, `port`+`url` conflict, reuse error |
| S6 | `runner/tasks.ts` | https://github.com/microsoft/playwright/blob/main/packages/playwright/src/runner/tasks.ts | Web servers start before `globalSetup` |
| S7 | Playwright: TestConfig | https://playwright.dev/docs/api/class-testconfig | `testDir`, `testMatch`, `outputDir`, `webServer` is top-level only, reporter defaults |
| S8 | Playwright: Projects | https://playwright.dev/docs/test-projects | Per-project `testMatch`, `use`, `timeout`, `--project`, dependencies |
| S9 | Playwright: Parameterize tests | https://playwright.dev/docs/test-parameterize | Per-project options with `{ option: true }` |
| S10 | Playwright: Fixtures | https://playwright.dev/docs/test-fixtures | `test.extend`, overriding `page`, worker scope, fixture timeout |
| S11 | Playwright: Timeouts | https://playwright.dev/docs/test-timeouts | Timeout defaults |
| S12 | Playwright: Global setup and teardown | https://playwright.dev/docs/test-global-setup-teardown | Project dependencies vs `globalSetup` |
| S13 | Playwright: Continuous Integration | https://playwright.dev/docs/ci | `--with-deps`, workers on CI, `xvfb-run`, no browser caching, Docker image |
| S14 | Playwright: Browsers | https://playwright.dev/docs/browsers | `install --with-deps chromium`, `--only-shell`, cache paths, `PLAYWRIGHT_BROWSERS_PATH` |
| S15 | Playwright: Release notes | https://playwright.dev/docs/release-notes | 1.63 browser versions and breaking changes |
| S16 | Playwright: class Electron | https://playwright.dev/docs/api/class-electron | Experimental status, `launch()` options, `nodeCliInspect` fuse note |
| S17 | Playwright: class ElectronApplication | https://playwright.dev/docs/api/class-electronapplication | `firstWindow()`, `evaluate()`, `close()`, events |
| S18 | `electron.ts` (playwright-core) | https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/server/electron/electron.ts | Added args, `--no-sandbox` on Linux, `env` replaces `process.env`, how `electron` is resolved, X display error |
| S19 | `nativeDeps.ts` (playwright-core) | https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/server/registry/nativeDeps.ts | `--with-deps` installs `xvfb` on Ubuntu |
| S20 | Playwright CI: `tests_secondary.yml` and `run-test` action | https://github.com/microsoft/playwright/blob/main/.github/workflows/tests_secondary.yml, https://github.com/microsoft/playwright/blob/main/.github/actions/run-test/action.yml | How Playwright itself runs Electron tests on `ubuntu-latest` |
| S21 | Electron: Automated testing | https://www.electronjs.org/docs/latest/tutorial/automated-testing | Electron's own Playwright example |
| S22 | Electron: Testing on headless CI | https://www.electronjs.org/docs/latest/tutorial/testing-on-headless-ci | Why Electron needs Xvfb on Linux |
| S23 | electron/electron issue 42510 | https://github.com/electron/electron/issues/42510 | Ubuntu 24.04 sandbox error (open) |
| S24 | Turborepo: Playwright guide | https://turborepo.dev/docs/guides/tools/playwright | Package per suite, `passThroughEnv: ["PLAYWRIGHT_*"]`, task graph |
| S25 | pnpm: node_modules settings | https://pnpm.io/settings/node-modules | `hoist` / `hoistPattern` defaults |
| S26 | Expo: Publishing websites | https://docs.expo.dev/guides/publishing-websites/ | `npx expo export -p web`, `web.output` modes, `npx expo serve` on 8081 |
| S27 | Expo Router: Static rendering | https://docs.expo.dev/router/reference/static-rendering/ | `npx serve dist` for static output, dynamic routes |
| S28 | `@expo/cli` serve source | https://github.com/expo/expo/tree/main/packages/%40expo/cli/src/serve | `--port`, no SPA fallback in static mode |
| S29 | vercel/serve | https://github.com/vercel/serve | `-s/--single` SPA rewrite, `-l` listen (from `serve --help`, v14.2.6) |

## Versions

Checked 2026-10-03 with `npm view` [S1].

| Package | Version | Notes |
|---|---|---|
| `@playwright/test` | **1.63.0** (`latest`, published 2026-09-04) | Depends on `playwright@1.63.0`. `next` is `1.64.0-alpha-2026-10-02`. |
| `playwright` | 1.63.0 | Engines: `node >=20` |
| `create-playwright` | 1.17.139 | The generator behind `npm init playwright` |
| `electron` | 44.5.1 | For reference. Playwright supports Electron v12.2.0+, v13.4.0+, v14+ [S16] |

- Playwright 1.63 ships Chromium 153.0.8010.12, Firefox 155.0, WebKit 26.6. It drops Ubuntu 20.04 and deprecates the experimental component-testing packages [S15].
- Supported Node: latest 22.x, 24.x, 26.x. Supported Linux: Debian 12/13, Ubuntu 22.04/24.04/26.04 [S2]. Node 24 (our pin) is fine.
- Official Docker image: `mcr.microsoft.com/playwright:v1.63.0-noble` [S13].

## Install command

- `pnpm add -D -w @playwright/test` puts it in the root `package.json` of a pnpm workspace. This is the exact command the generator runs when it finds `pnpm-workspace.yaml` [S3].
- Browsers: `pnpm exec playwright install --with-deps chromium` [S14]. `--with-deps` also installs OS packages and needs root on Linux [S3, S13].
- Headless-only CI can skip the full browser: `playwright install --with-deps --only-shell chromium` [S14].
- Electron is not a Playwright browser. Playwright runs the `electron` package's binary, so it needs no `playwright install` for Electron [S18].
- Update: `pnpm add -D @playwright/test@latest` then `pnpm exec playwright install --with-deps` [S2].

## Generator command and its prompts

Command: `npm init playwright@latest`, `yarn create playwright`, or `pnpm create playwright` [S2]. The generator picks the package manager from `npm_config_user_agent`, so in this repo use **`pnpm create playwright`**. With `npm init` it would run `npm` commands [S3].

Usage: `create-playwright [options] [rootDir]`, `rootDir` defaults to `.` [S3].

### Prompts (interactive mode) [S3]

1. "Do you want to use TypeScript or JavaScript?" Skipped if `tsconfig.json` exists (then TypeScript) or `--lang` is set.
2. "Where to put your end-to-end tests?" Default `tests`, or `e2e` if `tests/` already exists.
3. "Add a GitHub Actions workflow?" Default yes. Skipped with `--gha`.
4. "Install Playwright browsers (can be done manually via '… playwright install')?" Default yes. Skipped with `--no-browsers` or `--browser`.
5. Linux only: "Install Playwright operating system dependencies (requires sudo / root …)?" Default no. Skipped with `--install-deps`.

### Flags (from `--help` and `cli.ts`) [S3]

| Flag | Effect |
|---|---|
| `--browser <browser...>` | Browsers in the config. Default `chromium,firefox,webkit`. Others are written commented out. Also limits the download. |
| `--no-browsers` | Do not download browsers |
| `--no-examples` | Do not write `example.spec.ts` |
| `--install-deps` | Install OS dependencies (`--with-deps`) |
| `--next` / `--beta` | Install `@playwright/test@next` / `@beta` |
| `--ct` | Component testing (deprecated in 1.63 [S15]) |
| `--quiet` | No prompts. Uses: TypeScript unless `--lang js`; `testDir` = `tests` (or `e2e` if `tests/` exists); GHA only with `--gha`; browsers unless `--no-browsers`. **The tests folder cannot be set in quiet mode.** |
| `--gha` | Write `.github/workflows/playwright.yml` |
| `--lang <language>` | `js` or `TypeScript` |

### Files it writes

Ran `pnpm create playwright` equivalent (`create-playwright@1.17.139 --quiet --browser=chromium --gha --no-browsers`) in a temp pnpm workspace on 2026-10-03 [S3]:

- `playwright.config.ts`: `defineConfig` with `testDir: './tests'`, `fullyParallel: true`, `forbidOnly: !!process.env.CI`, `retries: process.env.CI ? 2 : 0`, `workers: process.env.CI ? 1 : undefined`, `reporter: 'html'`, `use.trace: 'on-first-retry'`, one `chromium` project (`devices['Desktop Chrome']`), other browsers and `webServer` commented out. Its dotenv comment uses `__dirname`.
- `tests/example.spec.ts`: two tests against `https://playwright.dev/`.
- `.github/workflows/playwright.yml` (with `--gha`): `actions/checkout@v4`, `actions/setup-node@v4` with `lts/*`, `npm install -g pnpm && pnpm install`, `pnpm exec playwright install --with-deps`, `pnpm exec playwright test`, uploads `playwright-report/` for 30 days, `timeout-minutes: 60`.
- `.gitignore` gets `node_modules/`, `/test-results/`, `/playwright-report/`, `/blob-report/`, `/playwright/.cache/`, `/playwright/.auth/`.
- `package.json` gets `@playwright/test` and `@types/node` as dev dependencies, and an empty `scripts` object.

## Recommended configuration

These snippets use the documented APIs. The shape (one option that picks web or Electron) is our proposal, not a Playwright default.

### `e2e/playwright.config.ts`

```ts
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import type { AppOptions } from './fixtures';

const repoRoot = path.resolve(import.meta.dirname, '..');
const argoHome = process.env.ARGO_HOME ?? path.join(repoRoot, 'test-results', 'argo-home');

export default defineConfig<AppOptions>({
  testDir: '.',                       // config dir is the default anyway [S7]
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: { baseURL: 'http://127.0.0.1:8081', trace: 'on-first-retry' },
  webServer: [
    {
      name: 'Server',
      command: 'pnpm --filter @argo/server start',
      url: 'http://127.0.0.1:7337/health',
      cwd: repoRoot,
      env: { ARGO_HOME: argoHome },
      reuseExistingServer: !process.env.CI,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
    },
    {
      name: 'Web',
      command: 'pnpm --filter @argo/universal-app exec expo serve --port 8081',
      url: 'http://127.0.0.1:8081',
      cwd: repoRoot,
      reuseExistingServer: !process.env.CI,
    },
  ],
  projects: [
    { name: 'web', use: { ...devices['Desktop Chrome'], appTarget: 'web' } },
    { name: 'electron', use: { appTarget: 'electron' } },
  ],
});
```

Facts behind it:

- `webServer` takes one object or an array; each entry starts before the tests [S4]. It is top-level only, not per project [S7]. So both servers start for `--project=electron` too, unless the config builds the array conditionally.
- Use `url`. `port` is deprecated, and setting both throws [S4, S5]. The URL is ready when it returns 2xx, 3xx, 400, 401, 402 or 403 [S4]. `/health` fits.
- `env` is merged over `process.env` (plus `PLAYWRIGHT_TEST=1`), not a replacement [S4, S5].
- `cwd` defaults to the config file's folder [S4]. With the config in `e2e/`, set `cwd` to the repo root.
- `timeout` defaults to 60 000 ms. `stdout` defaults to `ignore`, `stderr` to `pipe`. Without `gracefulShutdown` the process is killed with `SIGKILL` [S4]. `SIGTERM` lets the Server supervisor remove `server.json` (spec 0001 section 5).
- `reuseExistingServer: false` (the default) throws if the URL already answers [S4, S5].
- `use.baseURL` makes `page.goto('/')` resolve against it [S4].
- Per-project `testMatch`, `testIgnore`, `timeout`, `retries`, `use`, `dependencies` are supported; run one with `--project=web` [S8].
- `{ option: true }` fixtures can be set per project in `use`, with `defineConfig<Options>` for types [S9].

### `e2e/fixtures.ts`

```ts
import { createRequire } from 'node:module';
import path from 'node:path';
import { test as base, _electron as electron } from '@playwright/test';

export type AppOptions = { appTarget: 'web' | 'electron' };

const repoRoot = path.resolve(import.meta.dirname, '..');
const desktopRequire = createRequire(path.join(repoRoot, 'apps/desktop/package.json'));

export const test = base.extend<AppOptions>({
  appTarget: ['web', { option: true }],
  page: async ({ appTarget, page }, use) => {
    if (appTarget === 'web') {
      await page.goto('/');
      await use(page);
      return;
    }
    const electronApp = await electron.launch({
      executablePath: desktopRequire('electron') as unknown as string,
      args: [path.join(repoRoot, 'apps/desktop')],
      env: { ...process.env },
    });
    await use(await electronApp.firstWindow());
    await electronApp.close();
  },
});
export { expect } from '@playwright/test';
```

Facts behind it:

- `_electron` is exported from `@playwright/test`; Electron's docs use `import { test, expect, _electron as electron } from '@playwright/test'` and `electron.launch({ args: ['.'] })` [S21].
- Electron support is **experimental** [S16, S21].
- `launch()` options include `args`, `cwd`, `env`, `executablePath`, `timeout` (default 30 000 ms), `artifactsDir`, `recordVideo`, `tracesDir`, `chromiumSandbox` (default `false`) [S16].
- `env`: if you pass it, it **replaces** `process.env`; Playwright also deletes `NODE_OPTIONS` [S18]. Spread `process.env` in.
- Without `executablePath`, Playwright does `require("electron/index.js")` from its own install, and injects its loader script [S18]. With `executablePath` it skips the loader [S18].
- `firstWindow({ timeout })` waits for the first window, default 30 000 ms [S17]. `electronApp.evaluate(fn)` runs in the main process; `close()` ends the app; `windows()`, `browserWindow(page)`, `process()`, `context()` and the `window`, `console`, `close` events also exist [S17].
- Overriding `page` in `test.extend` is documented [S10]. Because this override depends on `page`, the electron project still starts the default browser (inferred from fixture dependency rules, not tested).

### Root scripts and CI

```jsonc
// package.json (root)
"test:e2e": "playwright test -c e2e --project=web",
"test:e2e:electron": "playwright test -c e2e --project=electron"
```

```yaml
# .github/workflows/ci.yml (relevant steps)
- run: pnpm exec playwright install --with-deps chromium
- run: pnpm test:e2e
# main and release/* only:
- run: xvfb-run --auto-servernum --server-args="-screen 0 1280x960x24" -- pnpm test:e2e:electron
```

- Linux needs Xvfb for headed browsers and for Electron: `xvfb-run npx playwright test` [S13, S22]. Without it Playwright fails with "Unable to open X display" [S18].
- `--with-deps` installs the `xvfb` package on Ubuntu 22.04 and 24.04 [S19].
- Playwright runs its own Electron tests on `ubuntu-latest` with `xvfb-run --auto-servernum --server-args="-screen 0 1280x960x24"` after `playwright install --with-deps chromium` [S20].
- Do not cache browsers; restoring takes about as long as downloading [S13].
- One worker on CI is recommended [S13].
- Upload `playwright-report/` as the generated workflow does [S3].

### Timeouts [S11]

| Timeout | Default | Set with |
|---|---|---|
| Test | 30 000 ms | `timeout` |
| `expect` | 5 000 ms | `expect: { timeout }` |
| Action / navigation | none | `use: { actionTimeout, navigationTimeout }` |
| Global | none | `globalTimeout` |
| `beforeAll` / `afterAll` | 30 000 ms | `test.setTimeout()` in the hook |
| Fixture | none | `{ timeout }` on the fixture [S10] |
| `webServer` start | 60 000 ms | `webServer[].timeout` [S4] |
| `electron.launch` | 30 000 ms | `timeout` [S16] |

The clock spec waits for at least one tick of one second; the 5 s `expect` default covers that.

### Serving the Expo web export

- Build: `npx expo export -p web`, output in `dist/` [S26].
- `web.output` is `single` by default (one `index.html`); `static` writes one HTML file per route; `server` adds API routes [S26].
- `npx expo serve` hosts `dist` locally, default port 8081, HTTP only [S26]. It takes `--port` [S28]. In static mode it serves files with `index.html` and `.html` extension lookup and returns 404 for anything else, so there is **no SPA fallback** [S28].
- Expo's static-rendering docs suggest `npx serve dist` for static output [S27]. `serve -s` rewrites not-found requests to `index.html` (SPA mode); it listens on `0.0.0.0:3000` by default [S29].
- With `single` output, a deep link such as `/sessions/abc` needs `serve -s dist` (or a fixed `expo serve`). The scaffold spec only opens `/`, so `expo serve` is enough for now [S26, S28].

## pnpm + Turborepo monorepo specifics

- `pnpm create playwright` run at the repo root detects `pnpm-workspace.yaml` and installs with `pnpm add --save-dev -w` into the root `package.json` [S3, verified in a temp workspace].
- Run with `rootDir` = `e2e` (`pnpm create playwright e2e`), it finds no `pnpm-workspace.yaml` there, runs `pnpm init` in `e2e/`, installs without `-w`, and writes `e2e/package.json`, `e2e/.gitignore` and `e2e/tests/` [S3]. With local pnpm 9.15.4 this added an `e2e` importer to the root lockfile even though `e2e` is not in the workspace globs (observed, not documented).
- Turborepo recommends one Playwright **package** per suite, and `"passThroughEnv": ["PLAYWRIGHT_*"]` on the e2e task (or `globalPassThroughEnv`) [S24]. The e2e task should depend on `^build`, or the Playwright package should list the app as `workspace:*` [S24].
- Spec 0001 keeps `e2e/` at the root and its workspace globs are `apps/*`, `packages/*`, `tooling/*`. So either Playwright lives in the root `package.json` and runs as `playwright test -c e2e`, or `e2e` becomes a workspace package as Turborepo suggests. The second changes the spec's workspace list. **Owner decision.**
- `outputDir` defaults to `<package.json-directory>/test-results` [S7]. With no `e2e/package.json`, results land in the root `test-results/`, which the root `.gitignore` entries from the generator cover [S3].
- pnpm hoists every dependency to `node_modules/.pnpm/node_modules` by default (`hoist: true`, `hoistPattern: ['*']`) [S25]. That is what lets `playwright-core` find `electron` with its bare `require` [S18]. Setting `executablePath` from `apps/desktop` removes that dependence.
- Run Playwright from the root with `pnpm exec playwright …` [S3].

## Gotchas

1. **`--quiet` cannot set the tests folder.** It writes `tests/`; move it to `e2e/` in step 3, or answer the prompt interactively [S3].
2. **`npm init playwright` in a pnpm repo uses npm.** Use `pnpm create playwright` [S3].
3. **Web servers start before `globalSetup`.** Env vars set in `globalSetup` do not reach `webServer` commands [S6]. Set `ARGO_HOME` in the config or in the calling script.
4. **`reuseExistingServer: !process.env.CI` can reuse your dev Server** on 7337 with your real `~/.argo` (behaviour from [S4, S5]). Stop `pnpm dev` before local e2e, or use another port for e2e. The port in the web export comes from `EXPO_PUBLIC_ARGO_SERVER_URL` at export time (spec 0001 section 8).
5. **The Server binds `127.0.0.1` only** (spec 0001 section 5). Use `127.0.0.1`, not `localhost`, in `url` and `baseURL`; Playwright's own default for `port` is `http://localhost:<port>` [S5].
6. **The config is ESM here** (`"type": "module"` repo). Use `import.meta.dirname`, not the generator's `__dirname` comment [S3].
7. **Electron needs the `nodeCliInspect` fuse on.** Playwright passes `--inspect=0 --remote-debugging-port=0`; if the fuse is off, launch times out [S16, S18].
8. **On Linux, Playwright adds `--no-sandbox` to Electron** unless `chromiumSandbox: true` [S18]. Playwright's own CI still runs `sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0` on Ubuntu 24 for Electron jobs, pointing at electron/electron#42510 (still open) [S20, S23]. `ubuntu-latest` is Ubuntu 24.04; add that step if launch fails with the SUID sandbox error.
9. **`env` in `electron.launch` replaces the whole environment** [S18]. Spread `process.env`, or the app loses `PATH`, `HOME` and `DISPLAY`.
10. **`webServer` is global.** `pnpm test:e2e:electron` also starts `expo serve` unless the config skips it per run [S7].
11. **`expo serve` has no SPA fallback** in static mode [S28]. Deep links 404 with `web.output: 'single'`.
12. **Experimental status.** `_electron` is experimental and its API may change [S16]. Component testing is deprecated as of 1.63 [S15].
