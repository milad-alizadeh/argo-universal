# Uniwind and React Native Reusables

Research note for spec 0001, step 1. Checked on 2026-10-03.

## Sources

| # | Title | URL | Used for |
|---|---|---|---|
| S1 | Uniwind Quickstart | https://docs.uniwind.dev/quickstart | Install command, `global.css`, Metro and Vite setup, outermost-wrapper rule, where to import CSS |
| S2 | Uniwind `metro.config.js` API | https://docs.uniwind.dev/api/metro-config | Every `withUniwindConfig` option |
| S3 | Uniwind Monorepos | https://docs.uniwind.dev/monorepos | `@source`, scan root, pnpm notes |
| S4 | Uniwind Vite | https://docs.uniwind.dev/vite | Vite plugin, Vite 7/8 support table, Storybook note |
| S5 | Uniwind Global CSS | https://docs.uniwind.dev/theming/global-css | `@theme`, light and dark variables, `@theme static` |
| S6 | Uniwind Theming Basics | https://docs.uniwind.dev/theming/basics | Default themes, `system`, `Uniwind.setTheme` |
| S7 | Uniwind `generate-artifacts` | https://docs.uniwind.dev/api/generate-artifacts | CLI for types in CI, where artifacts are written |
| S8 | Uniwind Troubleshooting | https://docs.uniwind.dev/faq | Expo Router CSS location, package exports, safe area, class merging |
| S9 | Uniwind Vite plugin source | https://github.com/uni-stack/uniwind/blob/main/packages/uniwind/src/bundler/adapters/vite/vite.ts | How the plugin makes `className` work on web |
| S10 | Uniwind theme artifact source | https://github.com/uni-stack/uniwind/blob/main/packages/uniwind/src/bundler/artifacts/css/themes.ts | Theme variables are found through `@import`; all themes need the same variables |
| S11 | Uniwind bundler config source | https://github.com/uni-stack/uniwind/blob/main/packages/uniwind/src/bundler/config.ts | `cssEntryFile` is joined to `process.cwd()` |
| S12 | Uniwind web `View` source | https://github.com/uni-stack/uniwind/blob/main/packages/uniwind/src/components/web/View.tsx | `className` becomes a React Native Web CSS class |
| S13 | Uniwind release v1.12.1 | https://github.com/uni-stack/uniwind/releases/tag/v1.12.1 | Latest fixes (Metro main fallback, atomic artifact write) |
| S14 | Uniwind release v1.12.0 | https://github.com/uni-stack/uniwind/releases/tag/v1.12.0 | pnpm symlink fix (#609) |
| S15 | Uniwind issue #595 | https://github.com/uni-stack/uniwind/issues/595 | Vite 8 + Storybook RNW broke in 1.10.0, fixed in 1.10.1 |
| S16 | Uniwind issue #259 | https://github.com/uni-stack/uniwind/issues/259 | Storybook `viteFinal` setup; Storybook 9 bug |
| S17 | Uniwind issue #619 | https://github.com/uni-stack/uniwind/issues/619 | pnpm isolated layout failure on Expo 57, `node-linker=hoisted` workaround |
| S18 | Uniwind issues #353 and #598, PR #570 | https://github.com/uni-stack/uniwind/issues/353 , https://github.com/uni-stack/uniwind/issues/598 , https://github.com/uni-stack/uniwind/pull/570 | Several `uniwind` copies and pnpm symlinks in Metro |
| S19 | Uniwind issue #669 | https://github.com/uni-stack/uniwind/issues/669 | Theme blocks must sit under `:root` |
| S20 | Uniwind Vite example | https://github.com/uni-stack/uniwind/tree/main/apps/vite-example | Working Vite config and CSS |
| S21 | React Native Reusables CLI docs | https://reactnativereusables.com/docs/cli (source: https://github.com/founded-labs/react-native-reusables/blob/main/apps/docs/content/docs/cli.mdx) | `init`, `add`, `doctor` flags |
| S22 | React Native Reusables Installation | https://reactnativereusables.com/docs/installation | `init` then `add`; manual setup steps, `cn` helper |
| S23 | React Native Reusables Changelog | https://reactnativereusables.com/docs/changelog | Uniwind support (December 2025), catalogs.dev (September 2026) |
| S24 | React Native Reusables CLI source | https://github.com/founded-labs/react-native-reusables/tree/main/apps/cli/src | Exact prompts, detection rules, shadcn call, required dependencies |
| S25 | `minimal-uniwind` template | https://github.com/founded-labs/react-native-reusables-templates/tree/main/minimal-uniwind | Generated files (commit `ecdc14b`, 2026-07-02) |
| S26 | React Native Reusables Uniwind registry | https://reactnativereusables.com/r/uniwind/text.json (also `button.json`, `card.json`) | Per-component dependencies |
| S27 | shadcn Monorepo docs | https://ui.shadcn.com/docs/monorepo | `add` runs `shadcn add`; workspace aliases in `components.json` |
| S28 | npm registry | `npm view <package>` | Versions, peer dependencies, exports |
| S29 | Local runs | `/private/tmp/claude-501/rnr-run`, `/private/tmp/claude-501/rnr-mono` | Ran `init -t minimal-uniwind`, `add text button card` in a pnpm workspace, and `uniwind generate-artifacts` |

## Versions

Checked with `npm view` on 2026-10-03 [S28].

| Package | Newest stable | Note |
|---|---|---|
| `uniwind` | 1.12.1 (2026-10-01) | Peers: `react >=19`, `react-native >=0.81`, `tailwindcss >=4`, `metro`, `metro-cache`, `metro-transform-worker`, `@expo/metro-config`. Pins `@tailwindcss/node` and `@tailwindcss/oxide` at exactly 4.3.3. Exports `uniwind/metro`, `uniwind/vite`, `uniwind/types`. |
| `tailwindcss` | 4.3.3 | Uniwind supports Tailwind 4 only [S1]. |
| `@tailwindcss/vite` | 4.3.3 | Needed for the Vite (Storybook) build [S4]. |
| `@react-native-reusables/cli` | 0.7.1 (2026-03-14) | Same version as `apps/cli/package.json` on `main` [S24]. |
| `shadcn` | 4.21.1 | `add` runs `shadcn@latest add` [S24]. |
| `@rn-primitives/slot` | 1.5.2 | Added by `add text` [S26]. |
| `@rn-primitives/portal` | 1.5.3 | Template pins `~1.4.0` [S25]. |
| `class-variance-authority` | 0.7.1 | |
| `clsx` | 2.1.1 | |
| `tailwind-merge` | 3.7.0 | |
| `tw-animate-css` | 1.4.0 | Imported by the template `global.css` [S25]. |
| `lucide-react-native` | 1.50.0 | Used by the `icon` component [S25]. |
| `react-native-svg` | 15.15.5 | |
| `vite` | 8.3.2 | Vite 8 needs Uniwind 1.8.0+; 1.10.1+ recommended [S4]. |
| `vite-plugin-rnw` | 0.0.12 | `@storybook/react-native-web-vite` already depends on `^0.0.11` [S28]. |
| `@storybook/react-native-web-vite` | 10.6.1 | Peer `vite ^5 \|\| ^6 \|\| ^7 \|\| ^8` [S28]. |
| `react-native-web` | 0.21.3 | |
| `expo` | 57.0.26 | The `minimal-uniwind` template still pins `expo ~56.0.13` and `react-native 0.85.3` [S25]. |

## Install command

Uniwind, as documented [S1]:

```bash
pnpm add uniwind tailwindcss
```

In Argo, add both to the pnpm catalog and refer to them as `catalog:` (spec section 2). The Storybook app also needs `@tailwindcss/vite` [S4].

React Native Reusables has no package to install. Its CLI copies source files and installs each component's own dependencies [S21, S24]. The other runtime packages come from the template's `package.json`: `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`, `@rn-primitives/portal`, `lucide-react-native`, `react-native-svg`, `react-native-reanimated`, `react-native-safe-area-context`, and `uniwind` [S25]. The CLI's `doctor` treats `expo`, `react-native-reanimated`, `react-native-safe-area-context`, `tailwindcss-animate`, `class-variance-authority`, `clsx`, `tailwind-merge`, and `uniwind` as required [S24].

## Generator command and its prompts

### `init`

```bash
npx @react-native-reusables/cli@latest init -t minimal-uniwind
```

Flags: `-c, --cwd <cwd>` and `-t, --template <template>` [S21]. Templates: `minimal`, `minimal-uniwind`, `clerk-auth` [S21, S24].

What it does [S24, S29]:

1. If `package.json` exists in the working directory, it asks: "Initialize a new project here anyway", "Inspect project configuration", or "Cancel and exit".
2. Asks "What is the name of your project? (e.g. my-app)". The default is `my-app`.
3. Without `-t`, asks to pick a template: "Minimal (Nativewind)", "Minimal (Uniwind)", "Clerk auth (Nativewind)".
4. If the folder `<name>` exists, asks to cancel or overwrite.
5. Runs `git clone --depth=1 --branch main https://github.com/founded-labs/react-native-reusables-templates.git` and copies `minimal-uniwind/` into `<name>/`.
6. Asks "Would you like to install dependencies?". If yes, asks for a package manager (bun, pnpm, npm, yarn), runs `<pm> install`, then `npx expo install --fix`. With pnpm and no `.npmrc`, it writes `node-linker=hoisted` and `enable-pre-post-scripts=true`. The template already ships that `.npmrc`.
7. Asks "Would you like to initialize a Git repository?". If yes, it runs `git init`, `git add -A`, and commits.

`init` always creates a whole new Expo app in a new folder. It does not install into an existing package. I ran it with answers `argo-rnr`, no install, no git; the output was byte-identical to the template folder [S29].

Generated files [S25, S29]:

```
.gitignore  .npmrc  .prettierrc  README.md  app.json  babel.config.js
components.json  global.css  metro.config.js  package.json  tsconfig.json  uniwind-types.d.ts
app/_layout.tsx  app/index.tsx  app/+html.tsx  app/+not-found.tsx
components/ui/button.tsx  components/ui/icon.tsx  components/ui/text.tsx
lib/theme.ts  lib/utils.ts  assets/...
```

Key template content [S25]:

- `metro.config.js`: `withUniwindConfig(config, { cssEntryFile: './global.css', dtsFile: './uniwind-types.d.ts' })`.
- `global.css`: `@import "tailwindcss"; @import "uniwind"; @import "tw-animate-css";`, a `@theme` block with `--radius*` and `--spacing-hairline: hairlineWidth();`, then `@layer theme { :root { @variant light {…} @variant dark {…} } }` with the shadcn neutral colours in OKLCH (`--color-background`, `--color-primary`, `--color-chart-1`, `--color-sidebar-*`, and so on).
- `lib/utils.ts`: the `cn` helper, `twMerge(clsx(inputs))`.
- `lib/theme.ts`: `THEME` and `NAV_THEME` for React Navigation.
- `app/_layout.tsx`: `import '@/global.css'`, `useUniwind()` for the theme, `ThemeProvider value={NAV_THEME[theme]}`, and `<PortalHost />` as the last child.
- `components.json`: `style: "new-york"`, `tailwind.config: ""`, `tailwind.css: "global.css"`, `baseColor: "neutral"`, `iconLibrary: "lucide"`, aliases `@/components`, `@/lib/utils`, `@/components/ui`, `@/lib`, `@/hooks`.
- `tsconfig.json`: `paths: { "@/*": ["*"] }`.

### `add`

```bash
npx @react-native-reusables/cli@latest add text button card --styling-library uniwind -y
```

Flags [S21, S24]: `-c, --cwd`, `--styling-library nativewind|uniwind`, `-y, --yes`, `-o, --overwrite`, `-a, --all`, `-p, --path`. With no components named, it shows a multi-select list. The 30 components are: accordion, alert-dialog, alert, aspect-ratio, avatar, badge, button, card, checkbox, collapsible, context-menu, dialog, dropdown-menu, hover-card, input, label, menubar, popover, progress, radio-group, select, separator, skeleton, switch, tabs, text, textarea, toggle-group, toggle, tooltip [S24].

What it does [S24]:

1. Reads and validates `components.json` in the working directory. If it is missing or invalid, it offers to write one, asking for base colour, CSS file, and aliases.
2. Picks the styling library: the `--styling-library` flag, else `withUniwindConfig` found in `metro.config.{js,ts,cjs}` in the working directory, else NativeWind.
3. Runs `<runner> shadcn@latest add [--overwrite] [--yes] [--path p] https://reactnativereusables.com/r/uniwind/<name>.json`. The runner is `pnpm dlx` when pnpm is detected.
4. Runs `doctor --summary`.

Per-component dependencies [S26]: `text` adds `@rn-primitives/slot`. `button` and `card` add no packages but pull in `text`. Files have type `registry:ui`, so they land in the `ui` alias folder.

Local run in a pnpm workspace, from `packages/client` [S29]: it created `src/primitives/text.tsx`, `button.tsx`, and `card.tsx`. It rewrote imports to the configured aliases, for example `import { cn } from '@argo/client/lib/utils'` and `import { Text, TextClassContext } from '@argo/client/primitives/text'`. It added `"@rn-primitives/slot": "^1.5.2"` to `packages/client/package.json`. It did not add `class-variance-authority`, `clsx`, or `tailwind-merge`.

### `doctor`

```bash
npx @react-native-reusables/cli@latest doctor [-c <cwd>] [-s] [-y]
```

It checks dependencies, `metro.config` for `withUniwindConfig(`, the root layout (`app/_layout.tsx` or `src/app/_layout.tsx`) for a `.css` import and `<PortalHost`, `lib/utils.ts` for `function cn(`, `lib/theme.ts` for `NAV_THEME`, and `uniwind-types.d.ts` [S24].

## Recommended configuration

These snippets follow the documented setup [S1–S5] and fit it into the spec 0001 tree.

`apps/universal-app/metro.config.js` [S1, S2]:

```js
const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const config = getDefaultConfig(__dirname);

// Other wrappers go inside; withUniwindConfig must stay outermost.
module.exports = withUniwindConfig(config, {
  cssEntryFile: './global.css',
  dtsFile: './src/uniwind-types.d.ts',
});
```

Other options: `extraThemes: string[]` (names beyond light and dark), `polyfills: { rem: number }` (default 16), `isTV` (1.5.0+), `debug` (logs unsupported CSS; turn it off in production) [S2]. A `dtsFile` in `src/` or `app/` is picked up by TypeScript without changes. Any other location must be added to `tsconfig.json` `include` [S1, S2].

`apps/universal-app/global.css` [S1, S3, S5]:

```css
@import 'tailwindcss';
@import 'uniwind';
@import 'tw-animate-css';
@import '@argo/uniwind/theme.css';

@source '../../packages/client/src';
```

`tooling/uniwind/theme.css`, with tokens taken from the template `global.css` [S5, S25]:

```css
@theme {
  --radius: 10px;
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --spacing-hairline: hairlineWidth();
}

@layer theme {
  :root {
    @variant light {
      --color-background: oklch(1 0 0);
      --color-foreground: oklch(0.145 0 0);
      /* …rest of the template's light tokens */
    }
    @variant dark {
      --color-background: oklch(0.145 0 0);
      --color-foreground: oklch(0.985 0 0);
      /* …the same names, dark values */
    }
  }
}
```

`tooling/uniwind/package.json` needs `"exports": { "./theme.css": "./theme.css" }`, and every app that imports it lists `"@argo/uniwind": "workspace:*"`. I tested this locally: `uniwind generate-artifacts` followed the `@argo/uniwind/theme.css` import and found the light and dark variables [S10, S29].

Import the CSS in the root layout, not in the entry file that registers the root component. Importing it in the entry file turns every CSS edit into a full reload [S1, S8]. With the spec tree, `apps/universal-app/src/app/_layout.tsx` imports `'../../global.css'`.

Themes [S6]: `light`, `dark`, and `system` are built in. `system` follows the device, and `Uniwind.setTheme('light' | 'dark' | 'system')` switches theme. `useUniwind()` returns `{ theme, hasAdaptiveThemes }`. Light and dark need no Metro option. On web, the `dark` and `light` variants match a `.dark` or `.light` class, or else `prefers-color-scheme` [S10, S29].

`packages/client/components.json` (tested in [S29]; alias pattern from [S27]):

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": { "config": "", "css": "../../tooling/uniwind/theme.css", "baseColor": "neutral", "cssVariables": true },
  "aliases": {
    "components": "@argo/client/components",
    "utils": "@argo/client/lib/utils",
    "ui": "@argo/client/primitives",
    "lib": "@argo/client/lib",
    "hooks": "@argo/client/hooks"
  },
  "iconLibrary": "lucide"
}
```

`packages/client/tsconfig.json` needs `"paths": { "@argo/client/*": ["./src/*"] }`, because the CLI resolves aliases through `tsconfig` paths [S24, S29]. `packages/client/package.json` needs `exports` for each aliased folder, for example `"./primitives/*": "./src/primitives/*.tsx"` and `"./lib/*": "./src/lib/*.ts"`, so other workspaces and Metro can resolve the same specifiers [S27]. Leave `tailwind.config` empty for Tailwind 4 [S27].

The `cn` helper: copy the template `lib/utils.ts` to the path behind the `utils` alias [S22, S25]. `add` never creates it [S24, S29]. The spec tree does not name a `lib/` folder in `packages/client`. Either add `src/lib/utils.ts` (tested), or point `utils` at `@argo/client/primitives/utils` and put it in `src/primitives/utils.ts`. Both work, because the alias is only a rewritten import string. This is a choice for the owner.

Command for the spec's primitives (run it in `packages/client`):

```bash
npx @react-native-reusables/cli@latest add text button card --styling-library uniwind -y
```

Web Storybook, `apps/storybook/.storybook/main.ts`. This follows [S4] and [S16]; I did not run it locally:

```ts
import tailwindcss from '@tailwindcss/vite';
import { uniwind } from 'uniwind/vite';

// inside the StorybookConfig object; the framework already adds vite-plugin-rnw
viteFinal: async (config) => {
  config.plugins = [
    ...(config.plugins ?? []),
    tailwindcss(),
    uniwind({ cssEntryFile: './global.css', dtsFile: './uniwind-types.d.ts' }),
  ];
  return config;
},
```

`apps/storybook/global.css` has the same four imports as the app and `@source '../../packages/client/src'`. `preview.tsx` imports it.

How classes reach the DOM in Vite [S9, S12]: the `uniwind` plugin (`enforce: 'pre'`) aliases `react-native` to Uniwind's web components. It makes Vite use Lightning CSS with Uniwind's visitor, keeps `uniwind` and `react-native` out of dependency pre-bundling, pre-bundles `react-native-web` on Vite 8, and writes the theme artifact at build start. Each web component turns `className` into a React Native Web CSS class with `toRNWClassName`. That only paints if the Tailwind-generated CSS is loaded, which is why `preview.tsx` must import the entry CSS. Uniwind's docs say to use the same `uniwind/vite` plugin in Storybook's Vite config [S4].

Types in CI. Metro or Vite writes `uniwind-types.d.ts` only while running [S1]. To run `tsc` first, use:

```bash
uniwind generate-artifacts --css ./global.css --dts ./src/uniwind-types.d.ts
```

This is available in 1.8.0+ [S7]. The template instead commits the generated file [S25].

## pnpm and Turborepo monorepo specifics

- Scan root and `@source`. Tailwind scans from the folder that holds the CSS entry, skips `.gitignore`d files, and needs `@source` for anything outside that folder. That covers symlinked pnpm workspace packages [S3]. A `@source` path is relative to the CSS file [S3].
- Working directory. `cssEntryFile` must be a relative string, not `path.resolve(...)` [S1, S2]. The code joins it to `process.cwd()` [S11], so run Metro and Vite from the app folder. `pnpm --filter` and Turborepo tasks already do this.
- Imported theme files. Uniwind follows relative and package `@import`s to collect `@variant` theme variables [S10]. A shared `tooling/uniwind/theme.css` therefore works (tested, [S29]).
- One artifact per installed copy. `uniwind.css` is written inside the installed `uniwind` package [S7, S9]. pnpm keys the install folder by peer set. The path I saw included the Metro peers (`uniwind@1.12.1_metro-cache@…_metro@…_react-native@…`) [S29]. So the Expo app and Storybook can each get their own copy, and each writes its own artifact. Keep the themes the same in both entry files.
- Several copies of `uniwind` in one Metro graph used to recurse forever. This was fixed for duplicate copies in 1.9.0 (PR #570) and for pnpm symlink paths in 1.12.0 (#598, #609) [S14, S18]. If `packages/client` lists `uniwind` (it needs `uniwind/types` for `className` on React Native props, and `withUniwind` in `icon.tsx`), use 1.12.1 everywhere. One catalog entry plus `sherif` keeps the versions equal.
- Isolated vs hoisted `node_modules`. The React Native Reusables template and `init` set `node-linker=hoisted` for pnpm [S24, S25]. Uniwind issue #619 (uniwind 1.10.0, Expo 57) reported `Unable to resolve module ./node_modules/expo-router/entry` with pnpm's default isolated layout, and `node-linker=hoisted` worked around it. The issue was closed for process reasons, not with a fix [S17]. 1.12.1 adds a Metro `main`/`react-native` fallback for the root entry (#683) [S13]. Whether the isolated layout now works is unverified. Test it in the spike, and keep hoisted as the fallback.
- `add` in a library package. `packages/client` has no `metro.config.js`, so without `--styling-library uniwind` the CLI fetches the NativeWind registry [S24]. The changelog says detection uses `uniwind-types.d.ts` [S23], but the 0.7.1 code reads `metro.config` [S24].
- `add` writes caret ranges, such as `"@rn-primitives/slot": "^1.5.2"`, into the `package.json` in its working directory [S29]. Move them to the catalog and switch them to `catalog:`, as spec section 2 requires.
- `doctor` run in `packages/client` reports false problems: no Metro config, so it assumes NativeWind and asks for `tailwindcss@^3.4.14` and `tailwindcss-animate` [S24, S29]. Run it in `apps/universal-app`, or ignore it for the library.

## Gotchas

1. `withUniwindConfig` must be the outermost Metro wrapper [S1].
2. Don't disable `resolver.unstable_enablePackageExports`. Uniwind and `culori` need it [S8].
3. Write theme blocks as `@layer theme { :root { @variant <name> { … } } }`. With Tailwind 4.3.3, blocks without `:root` are dropped silently on native [S19].
4. Every theme must define the same variable names, or Uniwind logs "All themes must have the same variables" [S10].
5. Variables in `@theme` only feed utility classes. An unstyled `<Text>` does not pick up `--text-base` [S5]. Use `@theme static` for values read only from JS [S5].
6. Uniwind does not deduplicate conflicting classes, especially on web. Merge them with `cn` (`clsx` + `tailwind-merge`) [S8].
7. Keep `tailwindcss` at 4.3.3. Uniwind 1.12.1 pins `@tailwindcss/node` 4.3.3 exactly [S28], and 4.3.3 changed theme selectors that Uniwind had to catch up with [S14, S19]. Matching versions is my inference, not a documented rule.
8. Vite 8 needs Uniwind 1.10.1+. 1.10.0 broke Storybook RNW on Vite 8 with an `@react-native/normalize-colors` default-export error [S4, S15]. The Storybook 9 `path.resolve(undefined)` bug did not occur on Storybook 10 [S16].
9. `init` makes a whole new Expo app, so it cannot "point output" into `packages/client`. Run it in a temp folder, then harvest: `components/ui/*` goes to `packages/client/src/primitives/`, `lib/utils.ts` to the `utils` alias path, the `global.css` tokens to `tooling/uniwind/theme.css`, `PortalHost` and `NAV_THEME` to the root layout or `AppProviders`, and `metro.config.js` to `apps/universal-app` [S24, S25]. The template also brings its own Expo app (SDK 56), which overlaps with `create-expo-app` (SDK 57) in spec step 2. Use only the files that the Expo generator does not produce.
10. Portal-based primitives (dialog, dropdown-menu, popover, tooltip, select) need `<PortalHost />` as the last child of the root providers [S22, S24]. Text, button, and card do not.
11. Safe-area classes (`pt-safe` and so on) need `react-native-safe-area-context` and `Uniwind.updateInsets(insets)` from a root `SafeAreaListener` (free version, 1.2.0+) [S8].
12. Switching from `system` to `light` or `dark` turns off following the device until `setTheme('system')` is called again [S6].
13. Restart Metro after changing `@source`, themes, or the Metro config. Clear the cache with `npx expo start --clear` [S2, S3].
