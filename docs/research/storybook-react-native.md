# Storybook for React Native on device

Research for spec 0001, step 1. Checked on 2026-10-03.

## Sources

| # | Title | URL | Used for |
|---|---|---|---|
| S1 | `@storybook/react-native` readme (v10) | https://github.com/storybookjs/react-native/blob/next/packages/react-native/readme.md | Install, `withStorybook` options, Expo Router route, addons, websockets |
| S2 | Getting started (RN Storybook docs) | https://storybookjs.github.io/react-native/docs/intro/getting-started/ | Generator command, entry-point swapping as the default, scripts |
| S3 | Expo Router setup | https://storybookjs.github.io/react-native/docs/intro/getting-started/expo-router | Route approach, which wrapper to use, protected route |
| S4 | Metro configuration | https://storybookjs.github.io/react-native/docs/intro/configuration/metro-configuration | The two wrappers, option defaults, composition, production |
| S5 | Environment variables | https://storybookjs.github.io/react-native/docs/intro/configuration/environment-variables | `STORYBOOK_ENABLED`, `STORYBOOK_WS_*`, `STORYBOOK_SERVER` |
| S6 | WebSocket configuration | https://storybookjs.github.io/react-native/docs/intro/configuration/websocket-configuration | Remote control, hosts per platform |
| S7 | Migrating to entry-point swapping | https://storybookjs.github.io/react-native/docs/intro/getting-started/migrating-to-entry-point-swapping | v10.4 change, Expo Router choice, `deviceAddons` |
| S8 | MIGRATION.md (v9 to v10) | https://github.com/storybookjs/react-native/blob/next/MIGRATION.md | `onDisabledRemoveStorybook` removed, route import is safe |
| S9 | Official `expo-router-example` | https://github.com/storybookjs/react-native/tree/next/examples/expo-router-example | Real config, stories from a sibling folder, pinned peer versions |
| S10 | Metro `withStorybook` source | https://github.com/storybookjs/react-native/blob/next/packages/react-native/src/metro/withStorybook.ts | What `enabled: false` really does |
| S11 | Bundler-agnostic `withStorybook` source | https://github.com/storybookjs/react-native/blob/next/packages/react-native/src/withStorybook.ts | Entry-point swap logic |
| S12 | `generate.js` (writes `storybook.requires.ts`) | https://github.com/storybookjs/react-native/blob/next/packages/react-native/scripts/generate.js | Stories normalisation, `require.context`, addon resolution |
| S13 | npm registry | https://www.npmjs.com/package/@storybook/react-native | Versions, peer deps (`npm view`) |
| S14 | `create-storybook` source | https://github.com/storybookjs/storybook/tree/next/code/lib/create-storybook/src | Prompts, React Native generator, agent mode |
| S15 | Uniwind Metro wrapper source | https://github.com/uni-stack/uniwind/blob/main/packages/uniwind/src/bundler/adapters/metro/metro.ts | Composition with `withStorybook` |
| S16 | Expo: monorepos | https://docs.expo.dev/guides/monorepos/ | Auto Metro config, isolated installs, native module duplication |
| S17 | pnpm peer dependency settings | https://pnpm.io/settings/peer-dependencies | `strictPeerDependencies`, `peerDependencyRules` |
| S18 | Expo CLI `exportApp.ts` | https://github.com/expo/expo/blob/main/packages/@expo/cli/src/export/exportApp.ts | `expo export` forces `NODE_ENV` |
| S19 | Expo CLI `exportEmbedAsync.ts` | https://github.com/expo/expo/blob/main/packages/@expo/cli/src/export/embed/exportEmbedAsync.ts | Native release bundles set `NODE_ENV=production` |
| S20 | `expo-dev-client` API | https://docs.expo.dev/versions/latest/sdk/dev-client/ | `registerDevMenuItems` |
| S21 | Expo Router protected routes | https://docs.expo.dev/router/advanced/protected/ | `Stack.Protected` behaviour |
| L1 | Local runs in `/private/tmp/claude-501/` | (not published) | `create-expo-app@latest` (SDK 57) + `create-storybook@10.6.1`, interactive and `--yes`; glob tests against `storybook@10.6.1` |

## Versions

Checked with `npm view` on 2026-10-03 (S13).

| Package | `latest` | Notes |
|---|---|---|
| `@storybook/react-native` | 10.6.0 (2026-09-06) | `next` is 10.4.2-next.0, `canary` 10.6.0-canary |
| `storybook` (core) | 10.6.1 | `next` is 11.0.0-alpha.1 |
| `create-storybook` | 10.6.1 | what `npm create storybook@latest` runs |
| `@storybook/addon-ondevice-controls`, `-actions` | 10.6.0 | |
| `@storybook/react-native-ui`, `-ui-lite` | 10.6.0 | |

- `@storybook/react-native@10.6.0` peers on `storybook@^10.5.4`. Keep every Storybook package on the same major (S1, S13).
- Its other peers (S13): `react-native >=0.72.0`, `react-native-safe-area-context 5.8.0` (exact), `react-native-reanimated 4.5.1` (exact, optional), `react-native-gesture-handler >=2` (optional), `@gorhom/bottom-sheet >=4` (optional). `@storybook/react-native-ui` adds `react-native-svg >=14`.
- `@storybook/addon-ondevice-controls` peers on `@gorhom/bottom-sheet`, `@react-native-community/slider`, and `@react-native-community/datetimepicker` (S13).
- `create-expo-app@latest` today gives Expo SDK 57.0.26 with `react-native-safe-area-context ~5.7.0` and `react-native-reanimated 4.5.1` (L1). The safe-area pin does not match. See Gotchas.
- The official Expo Router example pins `react-native-safe-area-context 5.8.0`, `react-native-reanimated 4.5.1`, `react-native-worklets 0.10.1`, `react-native-svg 15.15.4`, `react-native-gesture-handler ~2.32.0` on Expo 57 (S9).

## Install command

Use the generator (S1, S2):

```sh
npm create storybook@latest
```

It installs these into the app (generator source S14, run L1). It adds a peer only if the app does not already have it:

- Peers: `react-native-safe-area-context`, `@react-native-async-storage/async-storage`, `@react-native-community/datetimepicker`, `@react-native-community/slider`, `react-native-reanimated`, `react-native-worklets`, `react-native-gesture-handler`, `@gorhom/bottom-sheet`, `react-native-svg`
- `cross-env`, but only when it adds platform scripts
- `@storybook/addon-ondevice-controls`, `@storybook/addon-ondevice-actions`, `@storybook/react-native`, `@storybook/react-native-ui-lite`, `storybook@^10.6.1`

It writes them as `"latest"`, not as pinned ranges (L1). For Expo projects, its `postInstall` step runs `fixExpoDependencyVersions` (S14).

## Generator command and its prompts

`npm create storybook@latest` runs `create-storybook` (S14). Useful flags from `--help` (L1): `--type react_native | react_native_web | react_native_and_rnw`, `--package-manager pnpm`, `--yes`, `--skip-install`, `--no-dev`, `--disable-telemetry`, `--features`, `--agent` / `--no-agent`.

Prompts on an Expo app (L1, S14):

1. **"We've detected a React Native project. Install:"**
   - React Native: Storybook on your device/simulator  ← pick this for `apps/universal-app`
   - React Native Web: Storybook on web for docs, test, and sharing
   - Both: Add both native and web Storybooks
2. **"New to Storybook?"**: "Yes: Help me with onboarding" or "No: Skip onboarding & don't ask again". If you answer No, it then asks **"What configuration should we install?"**: Recommended or Minimal.

Non-interactive behaviour (S14):

- `--yes` skips the variant prompt and keeps the detected type, `react_native`.
- **Agent mode.** The CLI detects AI agents from environment variables: `CLAUDECODE`/`CLAUDE_CODE` for Claude and `CODEX_SANDBOX`/`CODEX_THREAD_ID` for Codex, among others. In agent mode it sets `--yes` and prints "Proceeding with agentic installation flow". To keep the prompts, pass `--no-agent`. To be explicit, pass `--type react_native`.

What it generates in an Expo Router app (L1):

```
.rnstorybook/
  index.ts               registerRootComponent(view.getStorybookUI({ shouldPersistSelection, storage: AsyncStorage }))
  main.ts                stories: ['./stories/**/*.stories.?(ts|tsx|js|jsx)'], deviceAddons: [controls, actions]
  preview.tsx            parameters.controls.matchers
  storybook.requires.ts  generated; rewritten each time Metro loads the config
  stories/               Button, Header, Page examples
metro.config.js          created or edited: module.exports = withStorybook(<existing expression>)
package.json             "storybook:ios" / "storybook:android": "cross-env STORYBOOK_ENABLED=true expo start --ios|--android"
.gitignore               adds *storybook.log and storybook-static
```

- The generator imports the **bundler-agnostic** wrapper, `require('@storybook/react-native/withStorybook')`. That wrapper swaps the whole entry point; it does not render a route (L1, S4).
- When `metro.config.js` already exports `withUniwindConfig(config, {...})`, the generator rewrites it to `withStorybook(withUniwindConfig(config, {...}))`, which puts Storybook **outermost** (L1).
- It does not create an Expo Router route (L1).
- `storybook.requires.ts` can also be produced without Metro by running `sb-rn-get-stories`. That is the package's bin; it takes `-c/--config-path` (default `./.rnstorybook`), `-j/--use-js`, `-D/--no-doc-tools`, `-w/--host`, and `-p/--port` (S12, `scripts/handle-args.js`).

## Recommended configuration

### Which wrapper

The package has two Metro wrappers (S4):

| | Bundler-agnostic `@storybook/react-native/withStorybook` | Metro-specific `@storybook/react-native/metro/withStorybook` |
|---|---|---|
| Turned on by | `STORYBOOK_ENABLED=true` env (default off) | `enabled` option (default **true**) |
| What it does | Replaces the app entry with `.rnstorybook/index` | App stays the entry; you render Storybook where you want |
| Production | No-op when env is unset | `enabled: false` stubs Storybook out |

- Upstream's default since v10.4 is entry-point swapping (S2, S7). It calls the Expo Router route "fully supported but not the preferred setup" (S3).
- For a route, the docs say to use the **Metro-specific** wrapper. The bundler-agnostic one "replaces your entire app with Storybook" (S3, S7).
- ADR 0010 and spec 0001 §9 choose the route, so the generated wrapper import must change.

### `metro.config.js` (route approach, Uniwind outermost)

```js
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const { withStorybook } = require('@storybook/react-native/metro/withStorybook');
const { withUniwindConfig } = require('uniwind/metro');

const config = getDefaultConfig(__dirname);

// Metro-specific wrapper: the route approach keeps the app as the entry point (spec 0001 §9)
const storybookConfig = withStorybook(config, {
  enabled: process.env.NODE_ENV !== 'production',
  configPath: path.resolve(__dirname, '.rnstorybook'),
});

module.exports = withUniwindConfig(storybookConfig, { cssEntryFile: './global.css' });
```

Why this works:

- **Order.** Uniwind's `resolveRequest` calls the inner config's `resolveRequest` when one exists. It also spreads `config.transformer`, which keeps the `unstable_allowRequireContext: true` that Storybook sets (S15, S10). Storybook's resolver chains the same way (S10). Upstream says the wrappers compose and that "the order may matter" (S4).
- **`enabled`.**
  - The docs use an env flag: `process.env.STORYBOOK_ENABLED === 'true'` (S4).
  - `NODE_ENV !== 'production'` is my inference from Expo CLI source, not upstream guidance. `expo export` forces `NODE_ENV` to `production` before it loads config (S18), and native release bundling sets `production` when `dev` is false (S19).
  - Either way, `enabled: false` makes every `storybook*`/`@storybook*` import an empty module. It stubs `<configPath>/index.(ts|tsx|js|jsx)` with a component that shows the text "Storybook is disabled in the withStorybook metro wrapper.", and it empties every other file under `configPath` (S10).
- **`configPath` must be absolute.**
  - The code default is `path.resolve(process.cwd(), './.rnstorybook')`.
  - The stub check uses the regex `${configPath}/index\.(tsx?|jsx?)$` and `filePath.includes(configPath)` against absolute resolved paths (S10).
  - A relative `'./.rnstorybook'`, as the docs show (S4), would not match, so nothing would be stubbed when disabled. This comes from reading the source, not from a run.
- **Other options** (S1, S4, S10): `useJs` (false), `docTools` (true), `liteMode` (false), `websockets` (undefined, `'auto'` or `{ host, port, secured, key, cert, ca, passphrase }`), `experimental_mcp` (false). The bundler-agnostic `.d.ts` also lists `disableUI`.
- **`onDisabledRemoveStorybook` no longer exists.** It was a v9 option and was removed in v10, because `enabled: false` now removes Storybook by itself (S8).

### `.rnstorybook/main.ts`

```ts
import type { StorybookConfig } from '@storybook/react-native';

const main: StorybookConfig = {
  // Relative to .rnstorybook/; extglob leaves out *.test.stories.tsx (ADR 0010)
  stories: [{ directory: '../../../packages/client/src', files: '**/!(*.test).stories.tsx' }],
  deviceAddons: ['@storybook/addon-ondevice-controls', '@storybook/addon-ondevice-actions'],
};

export default main;
```

- `stories` takes globs or `{ directory, files, titlePrefix }` specifiers (S1, S4). `generate.js` passes them through Storybook core's `normalizeStories` and `globToRegexp`. It then emits one `require.context(directory, recursive, regex)` per specifier (S12).
- **Negation entries do not work.** In a test against `storybook@10.6.1` (L1), `'!…/*.test.stories.tsx'` was treated as a second, positive specifier, which **adds** the test stories.
- **Extglob works.** `files: '**/!(*.test).stories.tsx'`, or the string `'../../../packages/client/src/**/!(*.test).stories.tsx'`, compiles to a regex that matches `./screens/ProjectsScreen.stories.tsx` and rejects `./screens/ProjectsScreen.test.stories.tsx` (L1). I checked the regex Metro receives. I did not run it inside Metro.
- **Paths in `main.ts` are relative to `.rnstorybook/`.** Spec §9 writes `../../packages/client/src/**`, which is relative to the app folder. From `.rnstorybook/` the path needs three `../` (L1). The generated `require.context` path was `'../../../packages/client/src'`.
- Use `deviceAddons`, not `addons`. `addons` is deprecated and prints a warning (S7, S12).

### `.rnstorybook/index.ts` for a route

The generated `index.ts` calls `registerRootComponent`, which is the entry-swap style (L1). A route needs a default export instead. That matches the Option 3 shape in the readme, `export { default } from '../.rnstorybook'` (S1, S8):

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { view } from './storybook.requires';

// Default export instead of registerRootComponent: rendered by the (dev)/storybook route (spec 0001 §9)
const StorybookUIRoot = view.getStorybookUI({
  shouldPersistSelection: true,
  storage: { getItem: AsyncStorage.getItem, setItem: AsyncStorage.setItem },
});

export default StorybookUIRoot;
```

Put `withTrpcMocks` and providers in `preview.tsx` as decorators (S1, "Decorators and Parameters").

### Route `src/app/(dev)/storybook.tsx`

```tsx
export { default } from '../../../.rnstorybook';
```

- Import the config **index**, not `storybook.requires`.
  - The S3 page imports `view` from `storybook.requires` directly.
  - With `enabled: false`, that file becomes an empty module, so `view` is `undefined` and `view.getStorybookUI` throws.
  - Only `index.*` is replaced with the stub component (S10).
- The stub shows a line of text, not nothing. Spec §9 says the route "renders nothing in a production build". Options:
  - Wrap the route: `__DEV__ ? <StorybookUI/> : null`.
  - Guard the screen with `Stack.Protected guard={__DEV__}`, as S3 shows. Protected screens redirect to the anchor route, but they stay in the bundle (S21).
- Hide the header on this route (S1, S3).
- Dev menu item: `registerDevMenuItems([{ name, callback }])` from `expo-dev-client` (S20). Call `router.push('/storybook')` in the callback. Group folders such as `(dev)` do not appear in the URL; that is Expo Router behaviour, so check it in the Expo note.

### Websockets and remote control

- With the Metro-specific wrapper, set `websockets` in `withStorybook` **and** pass `enableWebsockets: true, host, port` to `getStorybookUI`. The two must match (S6).
- `'auto'` detects the LAN IP (from v10.2) (S4, S6). Hosts by platform (S6):
  - Android emulator: `10.0.2.2`
  - Physical devices: the machine's IP
- The channel server listens on port 7007 by default. External clients send `SET_CURRENT_STORY`-style JSON over `ws://host:7007` to select stories, for example for screenshots (S6).
- `STORYBOOK_WS_HOST`, `STORYBOOK_WS_PORT`, `STORYBOOK_WS_SECURED`, and `STORYBOOK_SERVER` override options (S5).
- `experimental_mcp: true` adds an `/mcp` endpoint (S1, S4).
- Not needed for the scaffold.

## pnpm + Turborepo monorepo specifics

- **Story path.** Stories in `packages/client` are reached through `require.context` with a path outside the app (L1). The official example also loads stories from a sibling folder (`'../../expo-example/components/**'`) (S9).
- **Metro watch folders.** Expo's `getDefaultConfig` configures Metro for monorepos automatically from SDK 52. Do not add `watchFolders` (S16).
- **Run Metro from the app folder.** `generate.js` resolves `configPath`, `main.ts`, and addon `register`/`preview` files from `process.cwd()` (S12). Run Metro, and so the Turborepo task, from `apps/universal-app`.
- **Addon dependencies.** Addons that cannot be resolved from the app are skipped silently; their `register` import is simply left out (S12, seen in L1). Make `storybook`, `@storybook/react-native`, and every `deviceAddons` package direct dependencies of `apps/universal-app`.
- **Native peers belong to the app.** These are native modules: reanimated, worklets, gesture-handler, safe-area, svg, async-storage, slider, datetimepicker, and bottom-sheet's dependencies. Expo says a native module must never be duplicated (S16). Put them in `apps/universal-app/package.json`. Use the Expo SDK versions, through the pnpm catalog if that note recommends one.
- **Isolated installs.** Expo supports isolated (pnpm) installs from SDK 54. If they cause trouble, switch pnpm `nodeLinker` to `hoisted` (S16).
- **Peer mismatches under pnpm.** `strictPeerDependencies` defaults to `false`, so the safe-area mismatch is a warning, not a failure. `peerDependencyRules.allowedVersions` can silence it (S17).
- **Generator flags.** Run the generator with `--package-manager pnpm` inside `apps/universal-app`. Change its `"latest"` ranges to catalog entries afterwards (L1).
- **Committing the generated file.** `storybook.requires.ts` is written into `.rnstorybook/` whenever Metro loads the config (S10, S12), and the official example commits it (S9). `tsc` needs it, because `index.ts` imports it. Either commit it, or run `sb-rn-get-stories` before `typecheck` in Turborepo. Biome should ignore it, since its header says "do not change this file". That last point is my inference.

## Gotchas

1. **The generator output does not fit spec §9 as it stands.** It uses the entry-swap wrapper and puts `withStorybook` outermost, around Uniwind. Its `index.ts` registers a root component, and its example stories sit in `.rnstorybook/stories/` (L1). The fit step must:
   - switch to `@storybook/react-native/metro/withStorybook`
   - reorder the wrappers so Uniwind is outermost
   - export a default from `index.ts`
   - delete the example stories

   No ADR conflict: ADR 0010 already chooses the route, which upstream supports (S3).
2. **npm install fails on a fresh SDK 57 app.** npm stops with `ERESOLVE`: `@storybook/react-native@10.6.0` peers on `react-native-safe-area-context@"5.8.0"`, but the app has `~5.7.0` (L1). The generator reports "non-blocking errors" and finishes without installing. pnpm only warns (S17).
3. **`enabled` defaults to `true`** in the Metro-specific wrapper (S4, S10). Without an explicit flag, Storybook ships in production.
4. **Use an absolute `configPath`** (`path.resolve(__dirname, '.rnstorybook')`). Otherwise the disable stub may not match (S10).
5. **Do not import `storybook.requires` from app code**, including the route. Import `.rnstorybook` (the index) so the disabled build gets the stub, not a crash (S10).
6. **Exclusion syntax.** Use extglob `!(*.test).stories.tsx`. A `'!pattern'` entry adds stories instead of removing them (L1).
7. **Clear the Metro cache** after you change `withStorybook` options or story globs: `npx expo start --clear` (S4).
8. **Native rebuild.** `@react-native-community/slider` and `datetimepicker`, which controls needs (S13), are native modules. Adding them needs a new dev client build.
9. **`liteMode` is not wired up.** The generator installs `@storybook/react-native-ui-lite`, but the generated `index.ts` does not use `LiteUI` and Metro is not set to `liteMode` (L1, S14). The full `@storybook/react-native-ui` comes in as a dependency of `@storybook/react-native` (S13). Its peers are reanimated, gesture-handler, bottom-sheet, svg, and safe-area. To drop those, set `liteMode: true` and pass `CustomUIComponent: LiteUI`, as the official example does (S9).
10. **`addons` versus `deviceAddons`.** On-device addons listed under `addons` make Storybook core try to load them as presets, which fails (S7).
