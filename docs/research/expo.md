# Expo, Expo Router, and expo-dev-client

Research note for spec 0001, step 1. Checked on 2026-10-03.

## Sources

| # | Title | URL | Used for |
|---|---|---|---|
| S1 | npm registry: `expo`, `expo-router`, `expo-dev-client`, `expo-dev-menu`, `create-expo`, `create-expo-app` | https://www.npmjs.com/package/expo | dist-tags, versions, publish dates (`npm view`) |
| S2 | Expo SDK reference, versions table | https://docs.expo.dev/versions/latest/ | React, React Native, React Native Web, and minimum Node per SDK |
| S3 | Expo SDK 57 changelog | https://expo.dev/changelog/sdk-57 | SDK 57 release date and changes |
| S4 | Expo SDK 58 beta changelog | https://expo.dev/changelog/sdk-58-beta | what is coming, when |
| S5 | create-expo-app reference | https://docs.expo.dev/more/create-expo/ | flags and templates |
| S6 | `create-expo` source (npm `create-expo@5.0.3`, built `index.js`) | https://github.com/expo/expo/tree/main/packages/create-expo | how it picks the package manager |
| S7 | New Architecture guide | https://docs.expo.dev/guides/new-architecture/ | New Architecture status |
| S8 | Work with monorepos | https://docs.expo.dev/guides/monorepos/ | Metro auto-config, pnpm, isolated installs, duplicates, autolinking |
| S9 | Expo CLI reference | https://docs.expo.dev/more/expo-cli/ | `expo export`, `expo install --check`, `baseUrl`, `run:*`, `CI` |
| S10 | package.json reference (`expo.install`, `expo.doctor`) | https://docs.expo.dev/versions/latest/config/package-json/ | version-check exclusions, doctor config |
| S11 | Tools for development (Expo Doctor) | https://docs.expo.dev/develop/tools/ | `expo-doctor` usage |
| S12 | App config reference | https://docs.expo.dev/versions/latest/config/app/ | `web.output`, `web.bundler`, `experiments.baseUrl`, `typedRoutes`, `autolinkingModuleResolution` |
| S13 | Expo Router core concepts | https://docs.expo.dev/router/basics/core-concepts/ | rules of routing |
| S14 | Expo Router notation | https://docs.expo.dev/router/basics/notation/ | `[id]`, `(group)`, `_layout`, `+not-found` |
| S15 | Top-level src directory | https://docs.expo.dev/router/reference/src-directory/ | `src/app` default since SDK 55 |
| S16 | Typed routes | https://docs.expo.dev/router/reference/typed-routes/ | typed `Href`, generated files, CI |
| S17 | Protected routes | https://docs.expo.dev/router/advanced/protected/ | `Stack.Protected guard` |
| S18 | Navigating between pages | https://docs.expo.dev/router/basics/navigation/ | imperative `router` |
| S19 | Static rendering | https://docs.expo.dev/router/web/static-rendering/ | dynamic routes under `static` output |
| S20 | Publish websites | https://docs.expo.dev/guides/publishing-websites/ | output targets, `dist`, `expo serve`, SPA redirects |
| S21 | expo-dev-client reference | https://docs.expo.dev/versions/latest/sdk/dev-client/ | install, config plugin, `registerDevMenuItems` |
| S22 | expo-dev-menu reference | https://docs.expo.dev/versions/latest/sdk/dev-menu/ | `registerDevMenuItems`, `ExpoDevMenuItem` |
| S23 | `expo-dev-menu` source, SDK 57 (npm `expo-dev-menu@57.0.18`) | https://github.com/expo/expo/tree/sdk-57/packages/expo-dev-menu | web stub, debug-only native module |
| S24 | Development builds introduction | https://docs.expo.dev/develop/development-builds/introduction/ | `npx expo run:ios`, dev builds |
| S25 | Environment variables in Expo | https://docs.expo.dev/guides/environment-variables/ | `EXPO_PUBLIC_*` rules |
| S26 | Tree shaking and code removal | https://docs.expo.dev/guides/tree-shaking/ | `__DEV__` removal in production |
| S27 | Expo CLI source, `adbReverse.js` (npm `@expo/cli@57.0.27`) | https://github.com/expo/expo/tree/sdk-57/packages/%40expo/cli/src/start/platforms/android | which ports Expo CLI reverses |
| S28 | Android emulator network address space | https://developer.android.com/studio/run/emulator-networking-address | `127.0.0.1` inside the emulator |
| S29 | Turborepo: using environment variables | https://turborepo.dev/docs/crafting-your-repository/using-environment-variables | `EXPO_PUBLIC_*` framework inference, `.env` inputs |
| L1 | Local check: `create-expo-app` run in `/private/tmp/claude-501/expo-research/` (default template, interactive prompts, inside a git repo, inside a pnpm 12.8.1 workspace with a catalog) | — | real generator output and behaviour |
| L2 | Local check: `expo export --platform web` and `expo serve` (SDK 57, `single` and `static`) | — | `dist` layout, asset paths, deep-link behaviour |

## Versions

Checked 2026-10-03 with `npm view` (S1) and the SDK table (S2).

| Item | Version | Source |
|---|---|---|
| Newest stable Expo SDK | 57 (`expo@57.0.26`, dist-tag `latest`, SDK 57.0.0 published 2026-06-30) | S1, S3 |
| React Native | 0.86 (`react-native@0.86.3` in SDK 57's `bundledNativeModules.json`) | S1, S2 |
| React / React DOM | 19.2.3 | S1, S2 |
| React Native Web | ~0.21.0 | S1, S2 |
| Expo Router | `expo-router@57.0.24` (`latest`, `sdk-57`) | S1 |
| expo-dev-client | `expo-dev-client@57.0.19` (`latest`, `sdk-57`) | S1 |
| expo-dev-menu | `expo-dev-menu@57.0.18` (dependency of expo-dev-client) | S1 |
| create-expo | `create-expo@5.0.3` (`latest`, `sdk-57`); `create-expo-app@5.0.0` is a "Compatibility wrapper for create-expo" | S1 |
| expo-doctor | 1.20.4 | S1 |
| Minimum Node for SDK 57 | 22.13.x (so Node 24 meets it) | S2 |
| Next SDK | 58 is in beta (`expo@next` = 58.0.2, beta announced 2026-09-15, React Native 0.88 RC). Stable is expected "shortly after" React Native 0.88 ships; the beta lasts three to four weeks. | S1, S4 |

New Architecture: "SDK 55 and later run entirely on the New Architecture." It cannot be disabled, and `newArchEnabled: false` is ignored (S7).

The default template on SDK 57 also pins `typescript ~6.0.3`, `react-native-reanimated 4.5.1`, `react-native-worklets 0.10.1`, `react-native-screens ~4.26.0`, and `react-native-safe-area-context ~5.7.0` (L1).

## Install command

- The generator installs Expo and Expo Router (see next section).
- expo-dev-client: `pnpm expo install expo-dev-client` from the app folder (S21). `expo install` picks the SDK-compatible version (S9). In a pnpm workspace it ran `pnpm` and wrote `"expo-dev-client": "~57.0.19"` into the app's `package.json`. It did not touch the catalog and did not add a config plugin (L1).
- A development build then needs a native build: `npx expo run:ios` or `npx expo run:android` (macOS and Xcode for iOS, Android Studio and Java for Android), or `eas build --profile development` (S9, S24).

## Generator command and its prompts

Command (spec 0001 step 2): `npx create-expo-app@latest` (S5).

Flags, from `--help` of `create-expo@5.0.3` (L1, S5):

| Flag | Effect |
|---|---|
| `<path>` | target folder, for example `apps/universal-app` (the monorepo guide uses `npx create-expo-app@latest apps/cool-app`, S8) |
| `-y, --yes` | use default options |
| `--no-install` | skip installing npm packages or CocoaPods |
| `--no-agents-md` | skip generating `AGENTS.md` and `.claude/settings.json` |
| `-t, --template [pkg]` | `default`, `blank`, `blank-typescript`, `tabs`, `bare-minimum`. Default: `default`. An SDK can be pinned, for example `--template default@57` |
| `-e, --example [name]` | an example from expo/examples |

Templates (S5):

| Template | Content |
|---|---|
| `default` | multi-screen app, Expo Router, TypeScript. On SDK 55 and later it has `src/app/`, `src/components/`, `src/constants/`, `src/hooks/` (S15, L1) |
| `blank` | minimum dependencies, no navigation |
| `blank-typescript` | `blank` with TypeScript |
| `tabs` | Expo Router and TypeScript with tabs |
| `bare-minimum` | `blank` with `android/` and `ios/` generated |

Only `default` gives Expo Router with routes in `src/app/` out of the box (S15, L1).

Interactive prompts (L1, captured through a pseudo-terminal):

1. `What is your app named?` (skipped when `<path>` is given)
2. `Choose a template:` Default, Blank, Blank (TypeScript), Navigation (TypeScript), Blank (Bare) (only when `--template` is given without a value)
3. `Select an Expo SDK version:` `Latest (SDK 57)` or `Other SDK version…`

What `default` writes (L1): `src/app/{_layout,index,explore}.tsx`, `src/components/…`, `src/global.css`, `scripts/reset-project.js`, `app.json`, `package.json` (`"main": "expo-router/entry"`), `tsconfig.json` (extends `expo/tsconfig.base`, `strict`, path `@/*` → `./src/*`), `.gitignore` (ignores `dist/`, `.expo/`, `expo-env.d.ts`, `/ios`, `/android`, `.env*.local`), `.vscode/`, `README.md`, `LICENSE` (MIT, Expo copyright), and, unless `--no-agents-md`, `AGENTS.md` and `.claude/settings.json`. Its `app.json` has `web.output: "static"`, the `expo-router` and `expo-splash-screen` plugins, and `experiments: { typedRoutes: true, reactCompiler: true }`. Its scripts are `start`, `reset-project`, `android`, `ios`, `web`, and `lint` (`expo lint`).

`npm run reset-project` asks `Do you want to move existing files to /example instead of deleting them? (Y/n)`, then replaces `src/` and `scripts/` with a blank `src/app/index.tsx` and a `src/app/_layout.tsx` that returns `<Stack />` (L1).

Suggested invocation for this repo, from the repo root (flags explained under Gotchas):

```sh
npx create-expo-app@latest apps/universal-app --template default@57 --no-install --no-agents-md
pnpm install
```

## Recommended configuration

### Routes (`apps/universal-app/src/app/`)

- Every file in `src/app` with a default export is a route; `_layout.tsx` files are navigators; the root `_layout.tsx` replaces `App.tsx`; non-route code lives outside `src/app` (S13).
- `sessions/[id].tsx` matches `/sessions/123`; read the param with `useLocalSearchParams` (S14).
- `(dev)/storybook.tsx` is a route group: its URL is `/storybook`, not `/(dev)/storybook` (S14). Typed routes accept both `/storybook` and `/(dev)/storybook` (L1, generated `.expo/types/router.d.ts`).
- With typed routes, a dynamic `Href` must be an object: `{ pathname: '/sessions/[id]', params: { id } }` (S16).
- Config files (`app.json`, `metro.config.js`, `tsconfig.json`, `package.json`) and `public/` stay at the app root, not in `src/` (S15).

### `app.json` (fragment)

```json
{
  "expo": {
    "web": { "output": "single" },
    "plugins": ["expo-router", "expo-dev-client"],
    "experiments": { "typedRoutes": true, "reactCompiler": true }
  }
}
```

- `web.output` is `single` (one `index.html`), `static` (one HTML file per route), or `server`; the documented default is `single`, but the default template sets `static` (S12, S20, L1). See Gotchas for the choice.
- `web.bundler` defaults to `metro` unless `@expo/webpack-config` is installed (S12).
- The `expo-dev-client` plugin is optional; it sets `launchMode` (`most-recent` or `launcher`) and `defaultLaunchURL` (S21).

### `metro.config.js`

`npx expo customize metro.config.js` writes the default (L1):

```js
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
module.exports = config;
```

No monorepo settings are needed (see next section). Uniwind wraps this config; its note owns that part.

### Dev menu item that opens Storybook

The API is `registerDevMenuItems(items: ExpoDevMenuItem[]): Promise<void>`, where `ExpoDevMenuItem` is `{ name: string; callback: () => void; shouldCollapse?: boolean }` (`shouldCollapse` defaults to `false`). It is documented on both `expo-dev-client` and `expo-dev-menu` (S21, S22); `expo-dev-client` re-exports everything from `expo-dev-menu` (S23), so import it from `expo-dev-client`, which the app depends on directly. Each call replaces all earlier entries (S22).

```tsx
// src/app/_layout.tsx (fragment)
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { router, Stack } from 'expo-router';
import { registerDevMenuItems } from 'expo-dev-client';

export default function RootLayout() {
  useEffect(() => {
    // The dev menu has no web implementation and no native module in release builds.
    if (!__DEV__ || Platform.OS === 'web') return;
    void registerDevMenuItems([
      { name: 'Open Storybook', callback: () => router.push('/storybook'), shouldCollapse: true },
    ]);
  }, []);
  return <Stack />;
}
```

Why the guard: on web the module's methods throw "`expo-dev-menu` isn't supported on Expo Web."; on iOS the native module is `debugOnly`, and on Android the release variant has no `addDevMenuCallbacks` (S23).

### A route that renders nothing in production

`__DEV__` and `process.env.NODE_ENV` are constant-folded, and the dead branch is removed from production bundles (S26).

```tsx
// src/app/(dev)/storybook.tsx
export default function StorybookRoute() {
  if (!__DEV__) return null;
  const Storybook = require('../../../.rnstorybook').default; // on-device Storybook note owns this import
  return <Storybook />;
}
```

Optional extra: `Stack.Protected guard={__DEV__}` in the root layout makes the screen unreachable by client-side navigation and redirects to the anchor route (S17). The screen `name` inside the guard was not checked here.

### Environment variables

- Put `EXPO_PUBLIC_ARGO_SERVER_URL=ws://127.0.0.1:7337` in `apps/universal-app/.env` (the project root, S25). Keep machine-specific values in `.env.local`, which the template ignores (S25, L1).
- Read it only as `process.env.EXPO_PUBLIC_ARGO_SERVER_URL`. Bracket access and destructuring are not inlined (S25).
- Values are inlined at bundle time and are visible in the app; never put secrets there (S25).
- `npx expo export` always forces `NODE_ENV=production` (S25).

### Web export

- `npx expo export --platform web` writes to `dist/` (`--output-dir` to change); `public/` is copied in (S9, S20).
- With `single`, `dist` holds `index.html`, `metadata.json`, `favicon.ico`, `_expo/static/{js,css}/…`, and `assets/…` (L2).
- With `static`, it also writes one HTML file per route, including `sessions/[id].html`, `storybook.html`, and `(dev)/storybook.html` (L2).
- All asset URLs are absolute from the root, for example `src="/_expo/static/js/web/entry-<hash>.js"` (L2). `experiments.baseUrl` prefixes them; a value without a leading `/` loads resources relative to the requesting code, which the docs warn "could lead to unexpected behavior" (S12). `baseUrl` is production-only and must be set before export (S9).
- `npx expo serve` hosts `dist` locally (S20).

### Android emulator

- Inside the emulator, `127.0.0.1` is the emulator itself; the host is `10.0.2.2` (S28).
- Expo CLI runs `adb reverse tcp:<metro port> tcp:<metro port>` for Metro only (8081 by default), and removes it on exit (S27, S9).
- So the Server port needs its own `adb reverse tcp:7337 tcp:7337` per device (spec 9). `adb reverse --list` shows active rules (local `adb --help`).

## pnpm and Turborepo monorepo specifics

- Expo detects workspaces from `pnpm-workspace.yaml` and configures Metro itself since SDK 52 when you use `expo/metro-config`. Remove any hand-set `watchFolders`, `resolver.nodeModulesPaths`, `extraNodeModules`, or `disableHierarchicalLookup`, then run `npx expo start --clear` once (S8).
- Isolated installs (pnpm's default `nodeLinker`) are supported from SDK 54. If a React Native library fails to build or resolve, set `nodeLinker: hoisted` in `pnpm-workspace.yaml` (S8). In a test workspace with pnpm 12.8.1 and the default linker, `expo export --platform web`, `expo install --check`, and `expo-doctor` all passed (L1, L2). Native builds were not tested.
- From SDK 55, `experiments.autolinkingModuleResolution` is on automatically for apps in a monorepo. It makes Metro resolve `react`, `react-dom`, `react-native`, and Expo modules to the autolinked versions (S8, S12).
- One React Native version per monorepo, and one React version per app. Check with `pnpm why --depth=10 react-native` (S8).
- Use `"workspace:*"` for workspace packages (S8). `EXPO_PUBLIC_*` was inlined into code from a `workspace:*` package (`packages/client/src`, symlinked) in a web export (L2). The docs say code inside `node_modules` is not inlined (S25).
- Catalogs: `expo install --check` (exit 0) and `expo-doctor` (21/21) both passed with `catalog:` versions for `expo`, `expo-router`, `react`, `react-dom`, `react-native`, and `react-native-web` (L1). `expo install <pkg>` writes a `~x.y.z` range into the app's `package.json` and never into the catalog; move it to the catalog by hand (L1).
- `CI=1 npx expo install --check` exits non-zero in CI when a version is wrong, which fits `pnpm quality` (S9). Exclude a package from the check with `expo.install.exclude` in `package.json` (S10).
- Run Expo Doctor with `pnpm dlx expo-doctor` from the app folder (S11). Configure it under `expo.doctor` in `package.json` (S10).
- Turborepo infers `EXPO_PUBLIC_*` as env inputs for Expo; add `.env*` files to the task's `inputs` for cache hashing, and keep `.env` files in the app package (S29). The web export task's output is `dist/**` (S9).
- Typed routes need generated `.expo/types` and `expo-env.d.ts` (both git-ignored). For `tsc` in CI without a dev server, run `npx expo customize tsconfig.json` first (S16). It generated `.expo/types/router.d.ts` in L1.

## Gotchas

1. **`npx` means npm install.** create-expo picks the package manager from `npm_config_user_agent`, so `npx` runs `npm install` (S6; help text: "based on how you invoke the CLI"). Pass `--no-install`, then run `pnpm install` at the root.
2. **The generator writes its own `AGENTS.md` and `.claude/settings.json`** (it enables the `expo@claude-plugins-official` plugin) unless you pass `--no-agents-md` (S5, L1). The repo already has both at the root. Ask the owner which to keep.
3. **No nested git repo.** Inside an existing git repo the generator did not run `git init`. Outside one, it made an "Initial commit" (L1).
4. **Template extras that may collide with this repo's choices:** an ESLint `lint` script (`expo lint`), while the repo uses Biome; `.vscode/`; `LICENSE` with Expo's copyright; example screens; extra packages (`@expo/ui`, `expo-glass-effect`, `expo-symbols`, …); React Compiler on (L1). Spec step 3 says keep generator config, so flag any removal to the owner.
5. **`web.output` choice for `app://`.** `static` writes `sessions/[id].html` and cannot serve `/sessions/abc` without a rewrite (S19). `single` needs every path rewritten to `index.html` (S20). `expo serve` returned 404 for `/sessions/abc` in both modes (L2). The Electron protocol handler therefore needs a fallback to `index.html`, and Playwright should start at `/` or the server needs a fallback. The spec does not choose a mode; ask the owner.
6. **Absolute asset paths.** The export references `/_expo/static/...` and `/assets/...` (L2). Under `app://`, these resolve only if the protocol serves `dist` at the root of the origin. That is an Electron-side setting (see the Electron note). A relative `baseUrl` is discouraged (S12).
7. **Dev menu on web and in release.** `registerDevMenuItems` throws on web and has no native method in release builds. Guard with `__DEV__ && Platform.OS !== 'web'` (S23). A second call wipes the first call's items (S22).
8. **`/assets` and other paths are reserved** by Metro and Expo Router; do not use them as routes or in `public/assets/` (S14, S20).
9. **`EXPO_PUBLIC_*` changes need a full reload** in the app. Only static dot access is inlined (S25). Web Storybook built with Vite does not inline `EXPO_PUBLIC_*` (Vite uses its own prefix, S29), so read the variable in the app and pass it into `AppProviders`.
10. **SDK 58 may go stable soon.** If it lands before scaffolding, the newest stable becomes SDK 58 with React Native 0.88. Web async routes (route chunks) become the default (`asyncRoutes: { web: false }` turns them off). The Expo Router navigation core was reworked. `expo-file-system` `File.write()` becomes async (S4). Re-run `npm view expo dist-tags` on scaffold day.
11. **`expo prebuild` cleans by default since SDK 57.** It deletes and regenerates `android/` and `ios/`; `--no-clean` keeps them (S3). The template git-ignores both folders (L1).
12. **pnpm peer warning seen:** `@react-native/metro-config` 0.87.1 was auto-installed, while `@react-native/community-cli-plugin@0.86.3` wants 0.86.3 (L1, `pnpm peers check`). It did not break web export. Watch it with sherif and native builds.
13. **expo-dev-client changes `expo start`.** With `expo-dev-client` installed, `npx expo start` targets the development build, not Expo Go (S9 `EXPO_NO_REDIRECT_PAGE`, S24). The iOS simulator needs `npx expo run:ios` once before `pnpm dev` can show the app.
