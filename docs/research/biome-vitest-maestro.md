# Biome, Vitest, and Maestro

Research note for spec 0001, step 1. Checked on 2026-10-03 with Node 24.21.0 and pnpm 9.15.4. "Observed" means I ran it in a throwaway monorepo under `/private/tmp/claude-501/`.

## Sources

| # | Title | URL | Used for |
|---|---|---|---|
| B1 | Biome: Getting started | https://biomejs.dev/guides/getting-started/ | Install command, `-E` pinning, `biome init` |
| B2 | Biome: Big projects (monorepos) | https://biomejs.dev/guides/big-projects/ | Nested configs, `root: false`, `"//"`, extending from a package |
| B3 | Biome: Configuration reference | https://biomejs.dev/reference/configuration/ | `root`, `extends`, `files.includes`, `!!`, `vcs`, `linter.rules.preset`, `$schema` forms |
| B4 | Biome: CLI reference | https://biomejs.dev/reference/cli/ | `biome check` and `biome ci` |
| B5 | Biome: Continuous integration recipe | https://biomejs.dev/recipes/continuous-integration/ | `biome ci` on GitHub, `biomejs/setup-biome@v2` |
| B6 | Biome: Linter domains | https://biomejs.dev/linter/domains/ | React, test, and project domains, auto-enable from `package.json` |
| B7 | Biome CHANGELOG | https://github.com/biomejs/biome/blob/main/packages/%40biomejs/biome/CHANGELOG.md | `preset` (2.5.0), `!!` force-ignore (2.3.0), folder globs without `/**` (2.2.0), package export conditions |
| B8 | npm registry, `@biomejs/biome` | https://www.npmjs.com/package/@biomejs/biome | Version 2.5.15 (`npm view`) |
| B9 | Turborepo: Biome guide | https://turborepo.com/docs/guides/tools/biome | Biome as a root task |
| V1 | Vitest: Getting started | https://vitest.dev/guide/ | Install, Node and Vite minimums, `.vitest/` folder |
| V2 | Vitest: Test projects | https://vitest.dev/guide/projects (source: https://github.com/vitest-dev/vitest/blob/main/docs/guide/projects.md) | `test.projects`, names, `extends`, nested projects, `--project`, root-only options |
| V3 | Vitest: Migration guide (5.0) | https://vitest.dev/guide/migration | Vitest 5 breaking changes |
| V4 | Vitest v4.0.0 release notes | https://github.com/vitest-dev/vitest/releases/tag/v4.0.0 | Workspace removed, provider packages split |
| V5 | Vitest 3.2 blog post | https://vitest.dev/blog/vitest-3-2.html | Workspace deprecated in favour of `projects` |
| V6 | Vitest: Browser mode | https://vitest.dev/guide/browser/ | `npx vitest init browser`, `@vitest/browser-playwright`, `playwright()` provider |
| V7 | Vitest: Config | https://vitest.dev/config/ | `vitest.config.*` beats `vite.config.*` |
| V8 | npm registry, `vitest`, `@vitest/*`, `@storybook/addon-vitest` | https://www.npmjs.com/package/vitest | Versions, engines, peer dependencies (`npm view`) |
| V9 | Storybook: Vitest addon | https://storybook.js.org/docs/writing-tests/integrations/vitest-addon | Generated Storybook project config, `--project=storybook` script |
| V10 | Turborepo: Vitest guide | https://turborepo.com/docs/guides/tools/vitest | Root projects vs per-package tasks trade-off |
| M1 | Maestro: How to install Maestro CLI | https://docs.maestro.dev/maestro-cli/how-to-install-maestro-cli | curl and Homebrew install, Java 17+, Xcode |
| M2 | Maestro: Update the Maestro CLI | https://docs.maestro.dev/maestro-cli/how-to-install-maestro-cli/update-the-maestro-cli | Upgrade, `MAESTRO_VERSION` pinning, `maestro --version` |
| M3 | Maestro GitHub releases and CHANGELOG | https://github.com/mobile-dev-inc/maestro/releases , https://github.com/mobile-dev-inc/maestro/blob/main/CHANGELOG.md | Version 2.11.0, negation globs in `config.yaml` (2.9.0), no physical iOS devices (2.11.0) |
| M4 | Maestro: React Native | https://docs.maestro.dev/get-started/supported-platform/react-native | `testID` to `id`, Expo Go vs dev builds, nested touchables on iOS |
| M5 | Maestro: iOS | https://docs.maestro.dev/get-started/supported-platform/ios | Simulators only, Xcode command line tools |
| M6 | Maestro: Core selectors | https://docs.maestro.dev/reference/selectors/core-selectors | `text` and `id` are regex, `id` is `accessibilityIdentifier` on iOS |
| M7 | Maestro: `launchApp` | https://docs.maestro.dev/reference/commands-available/launchapp | `appId`, `clearState`, `stopApp` |
| M8 | Maestro: `assertVisible` | https://docs.maestro.dev/reference/commands-available/assertvisible | 7 second auto-wait |
| M9 | Maestro: `extendedWaitUntil` | https://docs.maestro.dev/reference/commands-available/extendedwaituntil | Longer waits |
| M10 | Maestro: `openLink` | https://docs.maestro.dev/reference/commands-available/openlink | Deep links, iOS "Open in" dialog |
| M11 | Maestro: CLI commands and options | https://docs.maestro.dev/maestro-cli/maestro-cli-commands-and-options | `maestro test` options, `--platform`, `--device`, no `init` command |
| M12 | Maestro: Test discovery and tags | https://docs.maestro.dev/maestro-flows/workspace-management/test-discovery-and-tags | Folder runs only top-level flows, `flows` globs, tags |
| M13 | Maestro: Project configuration | https://docs.maestro.dev/maestro-flows/workspace-management/project-configuration | `config.yaml` found in the folder root |
| M14 | Maestro: Parameters and constants | https://docs.maestro.dev/maestro-flows/flow-control-and-logic/parameters-and-constants | `${VAR}`, `-e`, `MAESTRO_*` shell variables |
| M15 | Maestro: How to use selectors | https://docs.maestro.dev/maestro-flows/flow-control-and-logic/how-to-use-selectors | Selector keys combine with AND |
| E1 | Expo: Development build tools, workflows and extensions | https://docs.expo.dev/develop/development-builds/development-workflows/ | Dev build launch URL forms and automation parameters |
| E2 | Expo: Run E2E tests on EAS Workflows with Maestro | https://docs.expo.dev/eas/workflows/examples/e2e-tests/ | Expo's own Maestro flow shape, local `maestro test` |
| E3 | npm registry, `expo` | https://www.npmjs.com/package/expo | `latest` is 57.0.26 (`npm view`) |

---

## Biome

### Versions (checked 2026-10-03)

- `@biomejs/biome` `latest` is **2.5.15**, published 2026-09-30. 2.5.0 came out 2026-06-12. (B8)
- Engines: `node >=14.21.3`. It ships a native binary. (B8)

### Install command

```sh
pnpm add -D -E @biomejs/biome      # at the workspace root: add -w
```

`-E` pins the exact version, and Biome asks you to pin. (B1) In this repo the version goes in the pnpm catalog (spec section 2), so write `"@biomejs/biome": "catalog:"` and put `2.5.15` in the catalog.

### Generator command and its prompts

```sh
pnpm exec biome init --jsonc       # or: npx @biomejs/biome init --jsonc
```

- No prompts. `--jsonc` writes `biome.jsonc` in place of `biome.json`. (B1, `biome init --help`, observed)
- Output with 2.5.15 (observed):

```jsonc
{
	"$schema": "https://biomejs.dev/schemas/2.5.15/schema.json",
	"vcs": { "enabled": false, "clientKind": "git", "useIgnoreFile": false },
	"files": { "ignoreUnknown": false },
	"formatter": { "enabled": true, "indentStyle": "tab" },
	"linter": { "enabled": true, "rules": { "preset": "recommended" } },
	"javascript": { "formatter": { "quoteStyle": "double" } },
	"assist": { "enabled": true, "actions": { "source": { "organizeImports": "on" } } }
}
```

- `linter.rules.preset` (`"recommended"`, `"all"`, `"none"`) arrived in 2.5.0. It replaces `linter.rules.recommended: true`, which is deprecated. `biome migrate --write` rewrites the old form. (B3, B7)

### Recommended configuration

Run `biome init --jsonc` inside `tooling/biome/`, then fit it as below.

`tooling/biome/package.json`:

```json
{
  "name": "@repo/biome",
  "private": true,
  "type": "module",
  "exports": { "./biome.jsonc": "./biome.jsonc" }
}
```

A package must export the config file before another config can extend it by package name. (B2) Biome also accepts the export conditions `"biome"` and `"default"`. (B7)

`tooling/biome/biome.jsonc` (the generator output, plus `root: false` and the Tailwind parser flag):

```jsonc
{
	"$schema": "https://biomejs.dev/schemas/2.5.15/schema.json",
	// Biome finds this file inside the workspace, so it must not claim to be a second root.
	"root": false,
	"formatter": { "enabled": true, "indentStyle": "tab" },
	"linter": { "enabled": true, "rules": { "preset": "recommended" } },
	"javascript": { "formatter": { "quoteStyle": "double" } },
	// Uniwind's global.css and theme.css use Tailwind 4 directives such as @theme.
	"css": { "parser": { "tailwindDirectives": true } },
	"assist": { "enabled": true, "actions": { "source": { "organizeImports": "on" } } }
}
```

Root `biome.jsonc`:

```jsonc
{
	"$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
	"extends": ["@repo/biome/biome.jsonc"],
	"vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true, "defaultBranch": "main" },
	"files": {
		"includes": [
			"**",
			"!!**/dist",
			"!!**/.expo",
			"!**/drizzle",
			"!**/.rnstorybook/storybook.requires.ts"
		]
	}
}
```

Notes on that config:

- `extends` takes paths or package names, applied from least to most relevant. (B3) Both `"@repo/biome/biome.jsonc"` and `"./tooling/biome/biome.jsonc"` worked in the observed run.
- `$schema` can be the versioned URL or the local `./node_modules/@biomejs/biome/configuration_schema.json`. The local file always matches the installed version. (B3)
- `vcs.useIgnoreFile: true` makes Biome skip what `.gitignore` skips. `vcs.defaultBranch` is the base for `--changed`. (B3)
- `!` excludes a path from processing. `!!` force-ignores it: the scanner never indexes it, even when other files import it. Biome recommends `!!` for output folders such as `dist/`, and plain `!` for generated source so type information can still be read. (B3, B7, 2.3.0)
- Since 2.2.0, write folder globs without a trailing `/**` (`"!**/dist"`, not `"!**/dist/**"`). (B7)
- In the observed run, `dist/`, `.expo/`, `drizzle/meta/_journal.json`, and `.rnstorybook/storybook.requires.ts` were all skipped, and the Tailwind CSS file parsed.
- Linter domains (React, test, project) turn on when Biome sees `react` or `vitest` in `package.json`. (B6) The root `package.json` here will list neither. If the React rules do not fire in `packages/client`, set `"linter": { "domains": { "react": "recommended" } }` in `tooling/biome/biome.jsonc`. I did not test whether Biome reads the nearest `package.json` for this.

### `biome check` and `biome ci`

| | `biome check` | `biome ci` |
|---|---|---|
| Runs | formatter, linter, and assist (import sorting) | the same, read-only |
| Writes files | with `--write` (alias `--fix`), `--unsafe` for unsafe fixes | never |
| `--staged` | yes | no |
| `--changed`, `--since=REF` | yes | yes |
| Reporters | `--reporter=github`, `junit`, `sarif`, and more | same |

Sources: B4 and `biome check --help` / `biome ci --help` with 2.5.15 (observed). On GitHub Actions, `biome ci` prints diagnostics as GitHub annotations. (B5) Both exit non-zero on errors, so `biome check .` in `pnpm quality` (spec section 10) is enough; `pnpm biome check --write .` is the local fix command.

### pnpm and Turborepo specifics

- Turborepo recommends Biome as one root task, not a script per package, because it is fast. Register it in `turbo.json` as `"//#<script>"`. A root task misses the cache for every package when Biome or its config changes. (B9)
- Biome 2 discovers nested `biome.json(c)` files. A nested file must set `"root": false`, or use `"extends": "//"` which implies it. (B2)
- A file that is extended cannot extend another file. So `tooling/biome/biome.jsonc` must be self-contained. (B2)
- In CI, install dependencies before running Biome, so that `extends` can resolve `@repo/biome` from `node_modules`. (B5)

### Gotchas

- **Nested root error.** Without `"root": false` in `tooling/biome/biome.jsonc`, `biome check` fails with "Found a nested root configuration, but there's already a root configuration." (observed) The generator output does not set it.
- **Tailwind CSS.** Without `css.parser.tailwindDirectives: true`, a CSS file with `@theme` fails with "Tailwind-specific syntax is disabled" and is not formatted. (observed; option in the schema since 2.3.0, B7)
- **`files.includes` is not `ignore`.** Biome 2 has only `includes` with `!` and `!!` negations. The old `files.ignore` was removed. (B3, B7)
- The generator writes `vcs.enabled: false`. Turn it on, or `.gitignore`d folders such as `ios/`, `android/`, and `node_modules` caches get checked. (observed generator output, B3)
- `biome init` formats with tabs and double quotes. Keep that unless an ADR says otherwise (spec step 3).

---

## Vitest

### Versions (checked 2026-10-03)

| Package | `latest` | Notes |
|---|---|---|
| `vitest` | **5.0.3** (2026-09-30) | 5.0.0 came out 2026-09-03. `V4` tag is 4.1.11. Engines `^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0`. Peer `vite` `^6.4.0 \|\| ^7.0.0 \|\| ^8.0.0`. (V8) |
| `@vitest/browser-playwright` | 5.0.3 | Depends on `@vitest/browser` 5.0.3. Peer `playwright: *`. (V8) |
| `@vitest/browser` | 5.0.3 | Pulled in by the provider package. (V8) |
| `@vitest/coverage-v8` | 5.0.3 | (V8) |
| `@storybook/addon-vitest` | 10.6.1 | Peers: `vitest ^3 \|\| ^4 \|\| ^5`, `@vitest/browser-playwright ^4 \|\| ^5`, `storybook ^10.6.1`. (V8) |
| `vite` | 8.3.2 | Installed with Vitest 5.0.3. (observed) |
| `playwright` | 1.63.0 | (V8) |

Node 24.21.0 meets Vitest 5. The docs state "Vite >=v6.4.0 and Node >=v22.12.0". (V1)

### Install command

```sh
pnpm add -D -w vitest        # root; version from the catalog
```

(V1) The Storybook generator installs `@storybook/addon-vitest`, `@vitest/browser-playwright`, and `playwright` itself (V9); that belongs to the Storybook note.

### Generator command and its prompts

- Vitest has no generator for a plain config. The getting-started guide has you write `vitest.config.ts` by hand. (V1) The spec allows that ("Write a file by hand only when no generator makes it").
- `npx vitest init browser` exists, but only sets up browser mode: it installs a provider such as `@vitest/browser-playwright` and writes a config. (V6) Do not use it here; `npm create storybook@latest` sets up the browser project for `apps/storybook`. (V9)

### Recommended configuration

Root `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "packages/*",
      "apps/server",
      // The Storybook generator's config declares its own nested "storybook" project.
      "apps/storybook/vitest.config.ts",
    ],
  },
});
```

How Vitest reads it:

- `vitest.config.*` wins over `vite.config.*`. (V7)
- The root config is not itself a project. It only sets global options such as `reporters` and `coverage`. (V2)
- Every folder matched by a glob is a project, even without a config file. Its name is the `name` in the nearest `package.json`, else the folder name. (V2) Observed: `packages/a` with no config ran as `@repo/a`.
- An entry that points at a file must be named `vitest.config.*`, `vite.config.*`, `vitest.<name>.config.*`, or `vite.<name>.config.*`. (V2)
- Project names must be unique, or Vitest throws. (V2)
- Options only the root may set: `coverage`, `reporters`, `resolveSnapshotPath`, `attachmentsDir`. (V2)
- The default environment is Node. Observed: `typeof window` was `"undefined"` in a project with no config.
- Default `include` is `**/*.{test,spec}.?(c|m)[jt]s?(x)` and default `exclude` is `**/node_modules/**, **/.git/**`. (observed, printed by Vitest 5.0.3) So `ProjectsScreen.test.stories.tsx` is not picked up by the `packages/client` project, and only the Storybook project runs it.

A package config, when a package needs one:

```ts
import { defineProject } from "vitest/config";

export default defineProject({
  test: { environment: "node" },
});
```

Use `defineProject` in project files for type safety. Config-file projects do **not** inherit from the root config; share options through a `vitest.shared.ts` and `mergeConfig`. (V2)

The Storybook project. The Storybook generator writes `apps/storybook/vitest.config.ts` roughly like this (V9):

```ts
import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        plugins: [storybookTest({ configDir: path.join(dirname, ".storybook") })],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            provider: playwright({}),
            headless: true,
            instances: [{ browser: "chromium" }],
          },
          setupFiles: ["./.storybook/vitest.setup.ts"],
        },
      },
    ],
  },
});
```

(The real file also merges the app's Vite config and computes `dirname`; keep the generated file as is.)

- Since Vitest 5, a referenced config file may declare its own `projects`. It runs no tests itself, and inline projects inside it extend **that** file, not the root. (V2, V3) So the root can list `apps/storybook/vitest.config.ts` unchanged.
- The provider is a function from its own package: `import { playwright } from "@vitest/browser-playwright"`, `provider: playwright()`. `instances` needs at least one browser. (V6)

Filtering:

```sh
vitest run                                  # all projects
vitest run --project @repo/server           # one project
vitest run --project "@repo/storybook*"     # the nested Storybook project
vitest run --project '!@repo/storybook*'    # everything except Storybook
DEBUG=vitest:projects vitest                # print how projects resolved
```

`--project` takes wildcards and `!` negation, and can repeat. (V2)

Add `.vitest/` to `.gitignore`. Vitest 5 writes attachments, reports, and screenshots there. (V1, V3)

### Vitest 3, 4, and 5 differences that matter here

- 3.2 deprecated the separate `vitest.workspace` file in favour of `test.projects` in the root config. (V5)
- 4.0 removed the `workspace` option, split browser providers into packages (`@vitest/browser-playwright`), removed `environmentMatchGlobs` and `poolMatchGlobs`, dropped Vite 5 and Node 18. (V4)
- 5.0 (V3):
  - needs Vite >= 6.4.0 and Node >= 22.12.0;
  - inline projects inherit the root config by default (`extends: true`) and share its Vite server (`sharedViteServer: true`);
  - referenced config files can define nested `projects`;
  - `clearMocks` defaults to `true`;
  - `vi.mock()`, `vi.unmock()`, `vi.hoisted()` must be at module top level;
  - un-awaited async assertions now fail;
  - browser locators are strict by default (`browser.locators.exact: false` restores the old behaviour);
  - `toHaveTextContent` is strict equality, use `toMatchTextContent` for partial or regex matches;
  - JSON and JUnit reporters write to files by default;
  - the `.vitest/` folder holds artifacts.

### pnpm and Turborepo specifics

- Turborepo's guide names two options: per-package `test` scripts that Turborepo caches, or Vitest projects run from the root, which give one run and merged coverage but no per-package cache. (V10) The spec picks the root config, so run it as a root task (`"//#test"`) or from `pnpm quality` directly.
- Turborepo warns that a project config cannot extend the root config when the root defines `projects`, because it would inherit `projects`. Use a `vitest.shared.ts`. (V10, V2)
- `process.cwd()` inside every project's tests is the folder where Vitest started, not the project root. (V2)

### Gotchas

- **Nested Storybook project name.** Referenced from the root, the Storybook project is named `@repo/storybook (storybook)`: nested names get the declaring config's name as a prefix, and that config takes its name from `apps/storybook/package.json`. (V2, observed) The generator's script `vitest --project=storybook` (V9) then matches nothing from the root ("No projects were found"). It still works when run inside `apps/storybook`. From the root, use `--project "@repo/storybook*"`.
- **A project with no tests** passes inside a full run, but `vitest run --project <it>` alone exits 1 with "No test files found" (observed). Use `--passWithNoTests` for single-project scripts.
- The Storybook addon's peer range still lists `@vitest/browser`; with Vitest 5 it comes in through `@vitest/browser-playwright`. (V8) If `sherif` or pnpm complains, add it to the catalog at the same version as `vitest`.
- Keep every `vitest` and `@vitest/*` package on the same exact version. Their peer dependencies pin each other (`@vitest/browser-playwright` 5.0.3 needs `vitest` 5.0.3). (V8)

---

## Maestro

### Versions (checked 2026-10-03)

- Newest release: **CLI 2.11.0**, 2026-09-29. Earlier: 2.10.0 (2026-08-31), 2.9.0 (2026-08-26). (M3)
- This machine has 2.3.0 in `~/.maestro/bin` and Java 21 (Android Studio's runtime). Upgrade before running the flow.
- Requires Java 17 or newer, with `JAVA_HOME` set, and on macOS the newest Xcode and its command line tools. (M1)
- iOS runs only on Simulators. 2.11.0 fails early on a physical iPhone with "Physical iOS devices are not yet supported". (M3, M5)

### Install command

```sh
curl -fsSL "https://get.maestro.mobile.dev" | bash
# or
brew tap mobile-dev-inc/tap
brew trust --formula mobile-dev-inc/tap/maestro
brew install mobile-dev-inc/tap/maestro
```

(M1) Upgrade by running the curl script again, or `brew upgrade mobile-dev-inc/tap/maestro`. Pin a version with `export MAESTRO_VERSION=2.11.0; curl -Ls "https://get.maestro.mobile.dev" | bash`. Check with `maestro --version`. (M2)

Maestro is not an npm package; it does not go in the pnpm catalog. Record the version in a README line instead.

### Generator command and its prompts

None. The CLI has no `init` command. Its subcommands are `test`, `record`, `start-device`, `list-devices`, `download-samples`, `cloud`, `mcp`, and others. (M11) Write the flow by hand.

### Recommended configuration

Flow file format: a config block, `---`, then a list of commands. (M7, M12, E2)

`apps/universal-app/maestro/projects-shows-server-version.yaml`:

```yaml
appId: <ios.bundleIdentifier from app.json>
tags:
  - smoke
---
- launchApp:
    clearState: true
# Point the dev build at Metro; the launcher handles this URL form (Expo SDK 57).
- openLink: "<scheme>://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081&disableOnboarding=1"
- extendedWaitUntil:
    visible:
      id: "projects-server-version"
    timeout: 60000
- assertVisible:
    id: "projects-server-version"
    text: '.*\d+\.\d+\.\d+.*'
```

Run it:

```sh
maestro test apps/universal-app/maestro/
maestro --platform=ios test apps/universal-app/maestro/   # if an Android emulator is also running
```

Why each line:

- `appId` is the iOS bundle ID (or Android package name). `launchApp` with no argument launches it. It stops a running app first (`stopApp` defaults to `true`); `clearState: true` wipes app data. (M7)
- Expo's own Maestro example uses exactly `appId:` + `- launchApp` + `- assertVisible:`. (E2)
- A development build opens the dev launcher, not the app. Expo's launch URL loads a project into it: SDK 57 and earlier use `{scheme}://expo-development-client/?url={manifestUrl}`; SDK 58 adds `{scheme}://?__expo_url={manifestUrl}`. The legacy form keeps working in 58. `scheme` defaults to `exp+{slug}`. The URL must be URL-encoded. (E1) Expo `latest` on npm is 57.0.26 (E3), so use the legacy form.
- For automation, Expo says to add `disableOnboarding`, and optionally `disableFab` and `disableAutoLaunch` (SDK 58: `__expo_disable_onboarding=1` and so on). Setting `EXPO_NO_DEV_MENU=1` when starting Expo CLI adds them to every launch URL; Expo CLI does this by default without a TTY. (E1)
- `testID` in React Native becomes `id` in Maestro; on iOS that is `accessibilityIdentifier`. (M4, M6) Give the version `Text` in `ProjectsScreen` a `testID`.
- `text` and `id` are regular expressions, and a plain string must match the whole text ("Login" matches exactly "Login"). Escape `$` and `[`. (M6)
- Selector keys in one block are ANDed. (M15)
- `assertVisible` retries for up to 7 seconds. Use `extendedWaitUntil` with `timeout` in milliseconds for anything slower, such as the first Metro bundle. (M8, M9)
- Pointing `maestro test` at a folder runs only the flow files at its top level. A `config.yaml` in that folder is read automatically and can widen discovery with `flows:` globs; negation globs need 2.9.0 or newer. (M12, M13, M3)
- `${VAR}` reads values from `-e VAR=value` or from shell variables named `MAESTRO_*`. (M14) That can carry the Metro URL or the app ID if they differ between machines.

### pnpm and Turborepo specifics

- Maestro tests the built `.app`; it needs no npm packages in the app. (M4)
- ADR 0011: Maestro runs only on the developer machine. No CI job and no Turborepo task are needed. A root script like `"test:maestro": "maestro test apps/universal-app/maestro/"` is optional; spec section 10 does not list one.
- Build and install the dev build first (`npx expo run:ios`, see the Expo note), and have Metro running (`pnpm dev`).

### Gotchas

- **Expo Go is different.** `launchApp` with your `appId` does not work in Expo Go; use `openLink: exp://...`. (M4) The spec uses a development build, so use the bundle ID.
- **App-specific deep links need the project already open.** Cold-launching a dev build with `myscheme://path` is not supported, and `expo-development-client` is a reserved path. (E1) The launcher URL above is the supported way in; I did not run it on a Simulator.
- **iOS "Open in" dialog.** The first deep link into an app on a Simulator can show a confirmation. Handle it with a conditional `runFlow` that taps `Open` when it is visible. Accepting is permanent for that Simulator and survives `clearState`. (M10)
- **Nested touchables on iOS** can swallow taps and hide inner elements; set `accessible={false}` on the outer and `accessible={true}` on the inner. (M4) This matters if the version `Text` sits inside a pressable card.
- A regex `text` must match the whole label. `"Server"` does not match `"Server 0.1.0"`; use `'Server .*'` or the `id`. (M6)
- Maestro Studio does not read `config.yaml`; the CLI does. (M13)
