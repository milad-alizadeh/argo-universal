# Storybook for React Native Web with Vite and the Vitest addon

Research for spec 0001, step 1. Checked on 2026-10-03.

## Sources

| # | Title | URL | Used for |
|---|---|---|---|
| S1 | Storybook for React Native Web (framework docs, v10.6) | https://storybook.js.org/docs/get-started/frameworks/react-native-web-vite | Requirements, `main.ts`, framework options, Reanimated and NativeWind notes |
| S2 | Install Storybook (v10.6) | https://storybook.js.org/docs/get-started/install | `npm create storybook@latest`, Node and pnpm requirements, prompts |
| S3 | CLI options (v10.6) | https://storybook.js.org/docs/api/cli-options | `--type`, `--features`, `--yes`, `--package-manager`, `--no-dev`, `--skip-install` |
| S4 | Vitest addon (v10.6) | https://storybook.js.org/docs/writing-tests/integrations/vitest-addon | Setup, `storybookTest` options, tags, CLI, CI notes |
| S5 | Interaction tests (v10.6) | https://storybook.js.org/docs/writing-tests/interaction-testing | `storybook/test` imports, play context, `fn()` |
| S6 | Play function (v10.6) | https://storybook.js.org/docs/writing-stories/play-function | `canvas` in the play context replaces `within(canvasElement)` |
| S7 | Mocking providers (v10.6) | https://storybook.js.org/docs/writing-stories/mocking-data-and-modules/mocking-providers | Decorator that reads `parameters` |
| S8 | `stories` field (v10.6) | https://storybook.js.org/docs/api/main-config/main-config-stories | Glob and specifier forms |
| S9 | Vite builder (v10.6) | https://storybook.js.org/docs/builders/vite | `viteFinal` with `mergeConfig`, automatic `vite.config` merge, `viteConfigPath` |
| S10 | Telemetry (v10.6) | https://storybook.js.org/docs/configure/telemetry | `core.disableTelemetry`, `STORYBOOK_DISABLE_TELEMETRY` |
| S11 | Framework source: `preset.ts`, `types.ts` | https://github.com/storybookjs/storybook/tree/main/code/frameworks/react-native-web-vite/src | What the framework adds to Vite; option types |
| S12 | Vitest plugin source | https://github.com/storybookjs/storybook/blob/main/code/addons/vitest/src/vitest-plugin/index.ts | Automatic preview annotations, `test.include` ignored, Vitest root |
| S13 | `create-storybook` source | https://github.com/storybookjs/storybook/tree/main/code/lib/create-storybook/src | Prompts, React Native variant prompt, React Native Web generator, agent mode |
| S14 | `vite-plugin-rnw` | https://github.com/dannyhw/vite-plugin-rnw | `react-native` alias, `.web.*` extensions, `__DEV__` and `EXPO_OS` defines |
| S15 | Uniwind: Vite | https://docs.uniwind.dev/vite | `uniwind/vite` plugin with `@tailwindcss/vite`, Storybook note, Vite 8 version support |
| S16 | Uniwind: Monorepos | https://docs.uniwind.dev/monorepos | `@source` for other workspace packages |
| S17 | Uniwind package (`dist/vite`, `dist/shared`) | https://www.npmjs.com/package/uniwind?activeTab=code | Plugin options; `cssEntryFile` and `dtsFile` resolve from `process.cwd()` |
| S18 | Vitest: Test projects (v5.0.3) | https://vitest.dev/guide/projects | Nested projects and their names, default names, `extends` |
| S19 | pnpm build settings | https://pnpm.io/settings/build | `strictDepBuilds` (default `true`), `allowBuilds` |
| S20 | npm registry | https://www.npmjs.com/package/storybook | Versions, peer dependencies, dist-tags (`npm view`, `npm pack`) |
| L1 | Local runs in `/private/tmp/claude-501/sbgen/` | (not published) | `create-storybook@10.6.1` in a pnpm workspace (pnpm 10.18.0 and 12.8.1); Uniwind spike with a story in a sibling package; root Vitest projects; `storybook build` |

## Versions

Checked with `npm view` on 2026-10-03 [S20].

| Package | Version | Note |
|---|---|---|
| `storybook`, `create-storybook` | 10.6.1 | `latest` tag. `next` is `11.0.0-alpha.1`. 10.6.0 shipped 2026-09-02. |
| `@storybook/react-native-web-vite` | 10.6.1 | Depends on `vite-plugin-rnw@^0.0.11`, `vite-tsconfig-paths@^6.1.1`, `@storybook/react-vite`. Peers: `vite` 5–8, `react-native >=0.74.5`, `react-native-web` 0.19–0.21. |
| `@storybook/addon-vitest` | 10.6.1 | Peers (optional): `vitest` 3–5, `@vitest/browser` 3–5, `@vitest/browser-playwright` 4–5. |
| `@storybook/addon-docs`, `@storybook/addon-a11y` | 10.6.1 | |
| `@chromatic-com/storybook` | 5.4.0 | Added by the generator (see Gotchas). |
| `vitest`, `@vitest/browser-playwright`, `@vitest/coverage-v8` | 5.0.3 | `vitest` peers `vite ^6.4 \|\| ^7 \|\| ^8`. |
| `playwright` | 1.63.0 | |
| `vite` | 8.3.2 | Engines: Node `^20.19.0 \|\| >=22.12.0`. |
| `react-native-web` | 0.21.3 | |
| `uniwind` | 1.12.1 | Uniwind docs recommend 1.10.1+ for Vite 8 [S15]. |
| `tailwindcss`, `@tailwindcss/vite` | 4.3.3 | |

Requirements in the docs: React Native ≥ 0.72, React Native Web ≥ 0.19, Vite ≥ 5 [S1]; Node 20+, pnpm 9+ [S2]; Vitest ≥ 3.0 and a Vite-based framework for the Vitest addon [S4]. Node 24.21.0 meets all of them.

## Install command

From the app folder (here `apps/storybook`) [S2][S3]:

```sh
npm create storybook@latest
```

Run as an AI agent, use flags so nothing is asked (see the next section). For an existing Storybook, the addon alone installs with `npx storybook add @storybook/addon-vitest` [S4].

## Generator command and its prompts

Flags (from `create-storybook@10.6.1 --help`, matches [S3]):

| Flag | Effect |
|---|---|
| `--type <type>` | Project type. Web Storybook for React Native is `react_native_web`. Others: `react_native` (on device), `react_native_and_rnw` (both). |
| `--features <list...>` | `docs`, `test`, `onboarding`, `a11y`, `ai`. `--no-features` turns all off. |
| `-y, --yes` | Answers yes to every prompt. With no `--features`, installs the Recommended set [S3][S13]. |
| `--package-manager <pm>` | `npm`, `yarn1`, `yarn2`, `pnpm`, `bun`. |
| `--no-dev` | Does not start the dev server at the end. |
| `-s, --skip-install` | Writes config only. |
| `--builder <b>` | `webpack5`, `vite`, `rsbuild`. The React Native Web generator forces Vite [S13]. |
| `--agent` / `--no-agent` | Agent mode is on by default when an AI agent is detected. It sets `--yes` and logs AI setup instructions [S13]. |
| `--disable-telemetry`, `--loglevel`, `--logfile` | |

Prompts in the interactive flow, in order [S13][S2]:

1. `Empty directory detected:` only when the folder has no project. Choose a framework or `Other`, which exits.
2. `We've detected a React Native project. Install:` with `React Native` (device), `React Native Web` (web), `Both`. It is skipped when `--type` is given. With `--yes` and no `--type` the generator keeps the detected type `react_native` (on device), not web [S13].
3. `We found a .storybook config directory ... force the initialization?` only if `.storybook` exists. Skipped with `--yes` or `--force`.
4. `New to Storybook?` Yes adds onboarding. No skips it and remembers.
5. `What configuration should we install?` `Recommended` (docs, a11y, test) or `Minimal`.
6. `Would you like to install AI features (MCP addon and prompt suggestions)?` when the framework supports it.
7. Playwright browser binaries are installed at the end (`press "c" to abort`).

Command used in L1, which ran without a prompt:

```sh
cd apps/storybook
npm create storybook@latest -- --type react_native_web --features docs test --package-manager pnpm --no-dev --yes
```

Files it wrote in L1 (TypeScript project; with no `typescript` dependency it writes `.js`/`.jsx` instead) [L1][S13]:

- `.storybook/main.ts`: `stories: ['../stories/**/*.mdx', '../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)']`, `addons: ['@chromatic-com/storybook', '@storybook/addon-vitest', '@storybook/addon-docs']` (plus `@storybook/addon-a11y` when `a11y` is selected), `framework: '@storybook/react-native-web-vite'`.
- `.storybook/preview.tsx`: `controls.matchers` only (plus `a11y: { test: 'todo' }` with `a11y`).
- `vitest.config.ts`: one inline project named `storybook` with `storybookTest({ configDir })` and Playwright Chromium, headless.
- `vitest.shims.d.ts`: `/// <reference types="@vitest/browser-playwright" />`.
- `stories/` example components, stories, `Configure.mdx`, assets.
- `package.json` scripts `storybook` (`storybook dev -p 6006`) and `build-storybook` (`storybook build`), and devDependencies.
- No `.storybook/vitest.setup.ts`. Since Storybook 10.3 the Vitest plugin applies the preview annotations itself, and it logs that a setup file with `setProjectAnnotations` can be removed [S12].

## Recommended configuration

These snippets passed in L1: a play function in a `*.test.stories.tsx` file in a sibling package ran in Chromium, and `bg-red-500 p-4 text-white` gave `oklch(0.637 0.237 25.331)`, `16px`, and `rgb(255, 255, 255)`.

### `.storybook/main.ts`

```ts
import type { StorybookConfig } from '@storybook/react-native-web-vite';

const config: StorybookConfig = {
  // Relative to this .storybook folder: three levels up reaches the repo root
  stories: ['../../../packages/client/src/**/*.stories.tsx'],
  addons: ['@chromatic-com/storybook', '@storybook/addon-vitest', '@storybook/addon-docs'],
  framework: '@storybook/react-native-web-vite',
  async viteFinal(config) {
    const { mergeConfig } = await import('vite');
    const { default: tailwindcss } = await import('@tailwindcss/vite');
    const { uniwind } = await import('uniwind/vite');
    return mergeConfig(config, {
      plugins: [
        tailwindcss(),
        // Uniwind resolves these from process.cwd(), so make them absolute
        uniwind({
          cssEntryFile: `${import.meta.dirname}/../global.css`,
          dtsFile: `${import.meta.dirname}/../uniwind-types.d.ts`,
        }),
      ],
    });
  },
};
export default config;
```

- The framework already adds `vite-plugin-rnw` (with `@vitejs/plugin-react`) and `vite-tsconfig-paths` [S11]. Do not add `rnw()` again. The Uniwind Vite guide lists `rnw()` only for a plain Vite app [S15].
- `vite-plugin-rnw` aliases `react-native` to `react-native-web`, prefers `.web.*` files, and defines `__DEV__`, `process.env.NODE_ENV`, and `process.env.EXPO_OS = "web"` [S14].
- Both `@tailwindcss/vite` and `uniwind/vite` are needed. With Uniwind alone the classes gave no style. With Tailwind alone the story file failed to import [L1]. Uniwind's docs say to use the `uniwind/vite` plugin in Storybook's Vite config [S15].
- `viteFinal` with `mergeConfig` is the documented hook [S9]. The Vitest plugin calls the same `viteFinal`, so the plugins apply to tests too [S12][L1].
- Framework options [S1][S11]: `modulesToTranspile: string[]` (it always adds `react-native`, `@react-native`, `expo`, `@expo`), `pluginReactOptions` (the `@vitejs/plugin-react` options: `jsxRuntime`, `jsxImportSource`, `babel.plugins`, `babel.presets`, `include`, `exclude`), and `builder`. `pluginBabelOptions` is deprecated and ignored. The framework sets `babel.babelrc: false` and `babel.configFile: false`, so a `babel.config.js` in the project is not read [S11]. NativeWind needs `jsxImportSource: 'nativewind'` [S1]; Uniwind needs no Babel preset [S15].
- Telemetry: set `core: { disableTelemetry: true }` or `STORYBOOK_DISABLE_TELEMETRY=1` [S10]. The Vitest plugin reads the same `core.disableTelemetry` [S12].

### `global.css` (CSS entry for this app)

```css
@import 'tailwindcss';
@import 'uniwind';
@import '@repo/uniwind/theme.css';
@source '../../packages/client/src';
```

`@source` paths are relative to the CSS file. Files outside the folder of the CSS entry need `@source` [S16]. The first three lines follow the spec's `global.css` for the universal app.

### `.storybook/preview.tsx`

```tsx
import type { Preview } from '@storybook/react-native-web-vite';
import { withTrpcMocks } from '@repo/client/mocks';
import '../global.css';

const preview: Preview = {
  decorators: [withTrpcMocks],
};
export default preview;
```

The mocking-providers pattern: a decorator in `preview` wraps every story, and reads per-story values from its second argument, `context.parameters` [S7]:

```tsx
const withProvider: Decorator = (Story, { parameters }) => (
  <Provider value={parameters.trpc}>
    <Story />
  </Provider>
);
// In a story: parameters: { trpc: { 'system.info': fixture } }
```

### A test story with a play function

```tsx
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { Hello } from './Hello';

const meta = { component: Hello, args: { onPress: fn() } } satisfies Meta<typeof Hello>;
export default meta;

export const Presses: StoryObj<typeof meta> = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole('button'));
    await expect(args.onPress).toHaveBeenCalledTimes(1);
  },
};
```

- Import test helpers from `storybook/test`: `expect`, `fn`, `userEvent`, `within`, `waitFor`, `screen` [S5][S6][L1]. `expect` combines Vitest's `expect` with `@testing-library/jest-dom` matchers [S5].
- The play context gives `canvas` (queries scoped to the story), `userEvent`, `args`, `step`, `mount`, and `canvasElement` [S5][S6][L1]. `within(canvasElement)` is no longer needed [S6].
- Stories run as tests only if they have the `test` tag, which is the default `tags.include` [S4].

### `apps/storybook/vitest.config.ts`

The generator wraps the project in `test.projects` [L1]. For one root `vitest.config.ts`, a flat project is simpler (see the monorepo section):

```ts
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { defineProject } from 'vitest/config';

export default defineProject({
  plugins: [storybookTest({ configDir: `${import.meta.dirname}/.storybook` })],
  test: {
    name: 'storybook',
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({}),
      instances: [{ browser: 'chromium' }],
    },
  },
});
```

`storybookTest` options [S4]: `configDir` (default `.storybook`), `storybookScript`, `storybookUrl` (default `http://localhost:6006`, used for debug links), `tags.include` (default `['test']`), `tags.exclude`, `tags.skip`, `disableAddonDocs` (default `true`), `initialGlobals`. Do not set `test.include`; the plugin empties it and takes test files from the `stories` field [S12].

Run: `vitest --project=storybook` [S4].

## pnpm + Turborepo monorepo specifics

- Run the generator inside `apps/storybook`. With pnpm it installs from the workspace root (`Scope: all 2 workspace projects`) [L1].
- `stories` globs resolve from the `.storybook` folder. From `apps/storybook/.storybook`, `../../packages/client/src/**` finds nothing (`No test files found`); `../../../packages/client/src/**` works [L1]. The spec's section 9 writes `../../packages/client/src/**/*.stories.tsx`, which is right only if read from `apps/storybook`.
- `packages/client` must declare what its story files import: `react`, `react-native`, `storybook`, and `@storybook/react-native-web-vite` (as dev or peer dependencies). Without them, Vite's dependency scan fails with `storybook/test ... could not be resolved` under pnpm's isolated layout. The test still passed, but pre-bundling was skipped [L1].
- pnpm 10.3+ defaults `strictDepBuilds` to `true`, so an install that meets an unreviewed build script fails with `ERR_PNPM_IGNORED_BUILDS` [S19]. With pnpm 12.8.1 the generator's install failed on `esbuild` and only reported "non-blocking errors" [L1]. Fix in `pnpm-workspace.yaml` [S19]:

  ```yaml
  allowBuilds:
    esbuild: true
  ```

- The generator writes `"latest"` for `vite`, `vitest`, `@vitest/browser-playwright`, `@vitest/coverage-v8`, `playwright`, and `@chromatic-com/storybook`, and `^10.6.1` for Storybook packages [L1]. Move each one to the pnpm catalog and use `catalog:`.
- Root `vitest.config.ts` with projects: Vitest supports nested projects. A nested project's name is prefixed with the name of the config that declares it [S18]. A folder project's default name is the `name` in its `package.json` [S18]. So with the generated config and root `projects: ['apps/*']`, the project is `@repo/storybook (storybook)`, and `vitest --project=storybook` from the root fails with `No projects were found` [L1]. With the flat `defineProject` above, `vitest --run --project=storybook` works from the root and from `apps/storybook` [L1]. The root needs `vitest` installed.
- Vitest 5 projects inherit the root config by default (`extends` is on since 5.0) [S18].
- Uniwind's Vite plugin resolves `cssEntryFile` and `dtsFile` from `process.cwd()` [S17]. Running Vitest from the repo root with relative paths wrote `uniwind-types.d.ts` into the repo root, and a missing CSS file is read as empty without an error [S17][L1]. Use absolute paths, as in `main.ts` above.
- Turborepo: `storybook build` writes `storybook-static/` [S1]; give the build task that output. `storybook dev` is a long-running task; mark it `persistent` and uncached in `turbo.json`. Storybook's cache is `apps/storybook/node_modules/.cache/storybook/` [L1].
- CI needs the Playwright Chromium binary; the generator installs it only on the machine that ran it [L1]. For CI resource errors the Vitest addon docs suggest `isolate: false` or `--shard` [S4].

## Gotchas

- Always pass `--type react_native_web`. In a folder that has `react-native`, `--yes` (and agent mode, which sets `--yes`) picks on-device `react_native` [S13].
- Agent mode turns on by itself when an AI agent runs the command. Pass `--no-agent` to get the plain flow, or expect AI setup instructions in the log [S13].
- The spec's section 3 lists `.storybook/vitest.setup.ts`. Storybook 10.6 does not generate it and does not need it; the plugin adds the preview annotations [S12][L1]. Add a setup file only for custom code, and do not call `setProjectAnnotations` in it, or the plugin stops adding annotations itself [S12].
- `test` in `--features` also adds `@chromatic-com/storybook` [L1]. The spec does not mention it.
- Under pnpm the generator printed `Could not resolve the postinstall hook of @chromatic-com/storybook` and the same for `@storybook/addon-docs`. Both addons were still registered in `main.ts`, and Storybook built and tested [L1].
- On Vite 8, the generated `vitest.config.ts` warns that `__dirname` is not supported by `configLoader: 'native'`; use `import.meta.dirname` [L1]. Vite 8 also warns that `vite-tsconfig-paths` (added by the framework) can be replaced by `resolve.tsconfigPaths` [L1][S11]. Both are warnings only.
- The Storybook Vite builder also merges a `vite.config.*` from the project root, if one exists [S9]. Keep the Uniwind plugins in one place (`viteFinal`) so they are not added twice.
- MDX is stubbed during Vitest runs (`disableAddonDocs: true`) [S4].
- The Vitest addon does not support snapshot tests [S4].
