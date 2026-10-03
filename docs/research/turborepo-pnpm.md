# Turborepo, pnpm workspaces with catalogs, and sherif

Research note for spec 0001, step 1. Checked on 2026-10-03 against primary sources only.

## Sources

| # | Title | URL | Used for |
|---|---|---|---|
| S1 | npm registry (`npm view pnpm\|turbo\|sherif\|create-turbo dist-tags` and `time`) | https://registry.npmjs.org/ | Current versions and release dates |
| S2 | pnpm: Installation | https://pnpm.io/installation | Install commands, Node support table, `self-update` |
| S3 | pnpm 11.0 release notes | https://pnpm.io/blog/releases/11.0 | Settings moved to `pnpm-workspace.yaml`, `allowBuilds`, `pmOnFail`, `minimumReleaseAge` default |
| S4 | pnpm 12.0 release notes | https://pnpm.io/blog/releases/12.0 | Unknown workspace keys are errors, `packageManager` meaning, global shims |
| S5 | pnpm: Catalogs | https://pnpm.io/catalogs | `catalog:` syntax, named catalogs, `catalogMode`, `catalogPrune` |
| S6 | pnpm: Settings (index) | https://pnpm.io/settings | Which settings live where |
| S7 | pnpm: Build settings | https://pnpm.io/settings/build | `allowBuilds`, `strictDepBuilds`, `dangerouslyAllowAllBuilds` |
| S8 | pnpm: Dependency resolution settings | https://pnpm.io/settings/dependency-resolution | `minimumReleaseAge`, `minimumReleaseAgeExclude` |
| S9 | pnpm: node_modules settings | https://pnpm.io/settings/node-modules | `nodeLinker`, `publicHoistPattern` |
| S10 | pnpm: CLI settings | https://pnpm.io/settings/cli | `pmOnFail`, `engineStrict` |
| S11 | pnpm: package.json | https://pnpm.io/package_json | `devEngines.packageManager`, `devEngines.runtime`, lockfile pin |
| S12 | pnpm: Other package managers | https://pnpm.io/package-managers | pnpm 12 pin rules |
| S13 | pnpm: Workspace | https://pnpm.io/workspaces | `workspace:` protocol, `linkWorkspacePackages` |
| S14 | pnpm: `pnpm add` | https://pnpm.io/cli/add | `--save-catalog`, `--allow-build` |
| S15 | pnpm: Continuous Integration | https://pnpm.io/continuous-integration | GitHub Actions with `pnpm/setup` |
| S16 | pnpm 9.x `.npmrc` docs (archived source) | https://github.com/pnpm/pnpm.io/blob/main/versioned_docs_archived/version-9.x/npmrc.md | pnpm 9 does not switch versions by default |
| S17 | `pnpm/setup` README | https://github.com/pnpm/setup | CI action reads `packageManager` and `.node-version` |
| S18 | Turborepo: Installation | https://turborepo.dev/docs/getting-started/installation | Install commands |
| S19 | Turborepo: `create-turbo` reference | https://turborepo.dev/docs/reference/create-turbo | Generator flags |
| S20 | `create-turbo` source (`cli.ts`, `prompts.ts`, `package-manager.ts`) | https://github.com/vercel/turborepo/tree/main/packages/create-turbo/src | Exact prompts and flag behaviour |
| S21 | Turborepo: Configuring `turbo.json` | https://turborepo.dev/docs/reference/configuration | Task keys, `persistent`, `with`, `envMode`, package-manager check |
| S22 | Turborepo: Coordinating development runtime dependencies | https://turborepo.dev/docs/guides/coordinating-runtime-dependencies | `with` plus a readiness probe in `dependsOn` |
| S23 | Turborepo: Using environment variables | https://turborepo.dev/docs/crafting-your-repository/using-environment-variables | Strict mode, framework inference, `.env` files |
| S24 | Turborepo: built-in pass-through env list (`turborepo-env/src/lib.rs`) | https://github.com/vercel/turborepo/blob/main/crates/turborepo-env/src/lib.rs | Variables that pass through without config |
| S25 | Turborepo: Managing dependencies | https://turborepo.dev/docs/crafting-your-repository/managing-dependencies | Names sherif and pnpm catalogs |
| S26 | Turborepo guides: TypeScript, Vitest, Biome | https://turborepo.dev/docs/guides/tools/typescript | `topo` transit task, Vitest projects as root task, Biome as root task (also `/guides/tools/vitest`, `/guides/tools/biome`) |
| S27 | Turborepo `examples/basic` and `examples/with-biome` | https://github.com/vercel/turborepo/tree/main/examples | What the generator writes |
| S28 | Turborepo repo root `package.json` and `pnpm-workspace.yaml` | https://github.com/vercel/turborepo | Turborepo itself runs on pnpm 12 |
| S29 | Turborepo issues #14096, #14211; PR #13879 | https://github.com/vercel/turborepo/issues/14096 | `turbo gen` on pnpm 12, pnpm 12 lockfile |
| S30 | sherif README and releases | https://github.com/QuiiBz/sherif | Usage, flags, rules, config |
| S31 | sherif source (`src/packages/mod.rs`, `src/collect.rs`) at `1eeac71` | https://github.com/QuiiBz/sherif/tree/main/src | How sherif treats `catalog:` |
| S32 | create-t3-turbo at `8f945b7` | https://github.com/t3-oss/create-t3-turbo/tree/8f945b7bb3bfb3ca8358d48b1ff0214079bc11ee | Reference layout |
| S33 | Expo: Work with monorepos | https://docs.expo.dev/guides/monorepos/ | Isolated installs, Metro, duplicate React |
| S34 | expo/expo PR #50626 | https://github.com/expo/expo/pull/50626 | `expo install --fix` overwrites `catalog:` |
| S35 | Node.js 24 Corepack docs and v25.0.0 release notes | https://nodejs.org/docs/latest-v24.x/api/corepack.html | Corepack status |
| S36 | Node.js release index | https://nodejs.org/dist/index.json | Newest Node 24 |
| S37 | Turborepo: GitHub Actions | https://turborepo.dev/docs/guides/ci-vendors/github-actions | Its pnpm example is out of date |

## Versions

Checked 2026-10-03.

| Tool | Newest stable | Released | Notes |
|---|---|---|---|
| pnpm | **12.8.1** (`latest` tag) | 2026-09-28 | 12.8.2 (2026-09-30) and 12.9.0 (2026-10-02, tag `next-12`) are published but not tagged `latest` [S1]. pnpm 12 is "the current release line" [S2]. |
| turbo, create-turbo, @turbo/gen | **2.11.7** | 2026-10-02 | Same version for all three [S1]. |
| sherif | **1.13.0** | 2026-07-04 | [S1, S30] |
| Node.js 24 | **24.21.0** (LTS "Krypton") | 2026-09-07 | Matches the installed Node [S36]. |

On this machine, `pnpm -v` prints 9.15.4 (Homebrew). Corepack 0.36.0 is present.

## Install command

1. Install pnpm 12 globally. The docs list two ways for macOS [S2]:
   ```sh
   curl -fsSL https://get.pnpm.io/install.sh | sh -
   # or, needs Node 22.13+
   npx get-pnpm
   ```
   `pnpm self-update` works only from pnpm 11.10.0 or newer [S2], so the installed 9.15.4 cannot reach 12 by itself. The docs do not list Homebrew.
2. Pin pnpm in the root `package.json`: `"packageManager": "pnpm@12.8.1"` (spec section 2). pnpm 11+ reads this field and, by default (`pmOnFail: download`), downloads and runs the pinned version [S10]. Corepack is not needed. It is "Experimental" in Node 24, and Node 25 stopped shipping it [S35].
3. Add turbo and sherif to the root. The Turborepo docs give [S18]:
   ```sh
   pnpm add turbo --save-dev --ignore-workspace-root-check
   ```
   To write the version into the default catalog at the same time, add `--save-catalog` [S14]:
   ```sh
   pnpm add turbo sherif --save-dev --save-catalog --ignore-workspace-root-check
   ```
   Neither package has install scripts. They ship platform binaries as `optionalDependencies` [S1], so they need no `allowBuilds` entry.
4. Optional: install `turbo` globally with `curl -fsSL https://turborepo.dev/install | sh`. A global `turbo` defers to the repo's local version [S18].

## Generator command and its prompts

The official generator is `create-turbo` [S18, S19]:

```sh
pnpm dlx create-turbo@latest [project-directory] [options]
```

Flags [S19, S20]:

| Flag | Effect |
|---|---|
| `[project-directory]` | Skips the directory prompt |
| `-m, --package-manager <npm\|yarn\|pnpm\|bun\|nub\|aube>` | Skips the package-manager prompt, if that manager is installed |
| `-e, --example <name>\|<github-url>` | Starts from an example. The default is `basic` |
| `-p, --example-path <path>` | For a GitHub URL whose branch name contains `/` |
| `--skip-install` | Does not run install |
| `--skip-transforms` | Skips code transforms, including the package-manager switch |
| `--turbo-version <version>` | Uses a specific turbo version (default: latest) |
| `--no-git` | Does not run `git init` |

Prompts, from `prompts.ts` [S20]:

1. "Where would you like to create your Turborepo?" (default `./my-turborepo`)
2. "Which package manager do you want to use?" Managers that are not installed are shown as disabled.

If you pass both the directory and `-m pnpm`, neither prompt appears.

What it writes: the `basic` example has two Next.js apps (`apps/docs`, `apps/web`), the packages `ui`, `eslint-config` and `typescript-config`, Prettier, a `turbo.json`, `pnpm-workspace.yaml` (`apps/*`, `packages/*`), `"packageManager": "pnpm@11.25.0"` and `"engines": { "node": ">=24" }` [S27]. The `with-biome` example is the same shape, with Biome added next to Prettier and `"packageManager": "pnpm@12.3.4"` [S27]. The package-manager transform only runs when the example's manager name differs from the one you chose. It does not raise the pnpm version [S20].

Is it sensible here? Only for the root files. Next.js, ESLint and Prettier conflict with ADR 0001 (Expo for web, Biome for lint and format), and the app tree in spec section 3 is different. If you use the generator to follow spec section 0, run it in a scratch folder and keep only `turbo.json`, the root `package.json`, `pnpm-workspace.yaml` and `.gitignore`:

```sh
pnpm dlx create-turbo@latest /tmp/argo-turbo -m pnpm --example with-biome --skip-install --no-git
```

After that, update `packageManager`, the turbo version and `$schema` by hand. create-t3-turbo is a template repo, not a CLI. Use it as a layout reference [S32].

## Recommended configuration

### `pnpm-workspace.yaml`

pnpm 11+ reads only auth and registry settings from `.npmrc`. Every other setting goes in `pnpm-workspace.yaml` [S3, S6]. The `pnpm` field in `package.json` is no longer read [S3]. Settings that shape `node_modules` (`nodeLinker`, `hoistPattern`, `publicHoistPattern`, `shamefullyHoist`) can only be set in `pnpm-workspace.yaml` [S6].

```yaml
packages:
  - apps/*
  - packages/*
  - tooling/*

# Default catalog. Packages write "catalog:" (short for "catalog:default").
catalog:
  sherif: 1.13.0
  turbo: 2.11.7
  typescript: <version>
  zod: <version>

# Named catalogs. Packages write "catalog:<name>".
catalogs:
  react:
    react: <version>
    react-dom: <version>

# `pnpm add` fails if a version is outside the catalog range.
catalogMode: strict

# Dependency build scripts are denied unless listed (pnpm 11+).
allowBuilds:
  electron: true
  esbuild: true
```

- Catalog syntax: `catalog` (default) and `catalogs` (named) can both appear. References work in `dependencies`, `devDependencies`, `peerDependencies`, `optionalDependencies` and in `overrides` [S5]. Since 12.2.0 a catalog entry may hold `workspace:^` [S5]. Note that spec section 2 asks for `catalog:` on shared dependencies only.
- `catalogMode` values are `manual` (default), `prefer` and `strict`. It only affects `pnpm add` [S5].
- `catalogPrune: true` removes unused catalog entries on install (since 11.22.0; the old name `cleanupUnusedCatalogs` still works) [S5].
- `allowBuilds` replaces `onlyBuiltDependencies`, `neverBuiltDependencies`, `ignoredBuiltDependencies`, `onlyBuiltDependenciesFile` and `ignoreDepScripts`, which were removed in pnpm 11 [S3, S7]. `strictDepBuilds` defaults to `true`, so an unreviewed build script fails the install. pnpm then adds a placeholder entry to `pnpm-workspace.yaml` for you to set to `true` or `false` [S7]. `pnpm add --allow-build=<pkg>` writes the entry for you [S14]. Fill the list from what the install reports. Do not guess it.
- `nodeLinker`: leave it at the default `isolated`. Expo supports isolated installs from SDK 54 and configures Metro for monorepos automatically from SDK 52. The fallback, if needed, is `nodeLinker: hoisted` [S33]. create-t3-turbo runs Expo SDK 54 with no `nodeLinker` and no `.npmrc` [S32].
- `minimumReleaseAge` defaults to 1440 minutes (1 day) since pnpm 11 [S3, S8]. Set `minimumReleaseAgeExclude` for packages that must install the same day. Turborepo's own repo excludes `turbo` and `@turbo/*` [S28].
- `linkWorkspacePackages` defaults to `false`. Use `workspace:*` for `@repo/*` packages so pnpm never fetches them from the registry [S13].

### Root `package.json`

```json
{
  "name": "argo-universal",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@12.8.1",
  "engines": { "node": "24.x" },
  "scripts": {
    "postinstall": "sherif",
    "dev": "turbo run dev",
    "quality": "sherif && biome check && turbo run typecheck test"
  },
  "devDependencies": {
    "sherif": "catalog:",
    "turbo": "catalog:"
  }
}
```

- `packageManager` must be an exact version [S12]. pnpm 12 also accepts `devEngines.packageManager` with a range, and stores the resolved version in `pnpm-lock.yaml` under `packageManagerDependencies` [S11]. Spec section 2 asks for `packageManager`. Turborepo accepts either and fails without one, unless `dangerouslyDisablePackageManagerCheck` is set [S21].
- `engines.node`: pnpm always fails the install when the project's own `engines` does not match the running Node, whatever `engineStrict` says [S10]. Turborepo's repo uses `"node": "24.x"` [S28].
- `.node-version`: put `24.21.0` (or `24`) in it. `pnpm/setup` reads `.node-version` when `package.json` declares no runtime [S17]. pnpm also has `devEngines.runtime`, which pins and downloads Node through pnpm [S11]. The spec does not ask for it.
- `postinstall` runs sherif after every install, as create-t3-turbo does with `pnpm dlx sherif@latest` [S32]. The sherif README advises pinning a version, not `latest` [S30]. Installing it as a catalog devDependency does that.

### `turbo.json`

```jsonc
{
  "$schema": "https://turborepo.dev/schema.json",
  "ui": "tui",
  "tasks": {
    "topo": { "dependsOn": ["^topo"] },
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "typecheck": { "dependsOn": ["topo"] },
    "//#test": { "outputs": ["coverage/**"] },
    "dev": { "cache": false, "persistent": true },
    "dev:ready": { "cache": false }
  }
}
```

```jsonc
// apps/desktop/turbo.json
{
  "extends": ["//"],
  "tasks": {
    "dev": {
      "with": ["@repo/server#dev", "@repo/universal-app#dev"],
      "dependsOn": ["@repo/server#dev:ready", "@repo/universal-app#dev:ready"]
    }
  }
}
```

- The `$schema` URL is now `https://turborepo.dev/schema.json` [S21]. create-t3-turbo still uses the older `turborepo.com` URL [S32].
- `^task` waits for the same task in dependencies. A bare name waits for a task in the same package. `pkg#task` waits for one package's task [S21].
- `typecheck` follows the `topo` transit-task pattern from the TypeScript guide. Packages type-check in parallel, and a change in a dependency still invalidates the cache [S26]. With no `outputs`, only logs are cached [S21].
- Spec section 2 has one root `vitest.config.ts` with projects. Turborepo's Vitest guide says to run that as a root task (`//#test`). Any change anywhere misses the cache [S26].
- Biome: the guide recommends one root task (for example `//#check`) instead of a script in every package [S26].
- `persistent: true` marks long-running tasks. Nothing can depend on them, and they are interactive by default [S21]. `with` starts tasks alongside each other [S21].
- Desktop must wait for the Server and the Expo web URL (spec section 10). The documented pattern is `with` (start the service) plus `dependsOn` on a finite, uncached `dev:ready` probe that retries and then exits 0 or fails after a timeout. Do not put a persistent task in `dependsOn` [S22]. If you set `--concurrency`, it must cover every persistent task plus the probes [S22].
- Environment: `envMode` defaults to `strict`. Tasks see only variables in `env`, `globalEnv`, `passThroughEnv` or `globalPassThroughEnv`, plus a built-in list [S21, S23]. The built-in list includes `HOME`, `PATH`, `CI`, `DISPLAY`, `NODE_OPTIONS`, `TURBO_*`, `GITHUB_*` and `PNPM_HOME`. It does not include `NODE_ENV`, `ANDROID_HOME` or `JAVA_HOME` [S24]. Framework inference adds `EXPO_PUBLIC_*` for Expo packages automatically [S23]. Turborepo does not load `.env` files. Add them to `inputs` or `globalDependencies` if they matter for hashing [S23].

### CI (spec section 11)

pnpm's own CI page uses `pnpm/setup`. It installs pnpm (from `packageManager`) and Node in one step, then runs `pnpm install`. `cache: true` caches the store [S15]. The current major is `v3` (2026-09-20). It supports pnpm 11+ only, and reads `.node-version` [S17]:

```yaml
- uses: actions/checkout@v6
- uses: pnpm/setup@v3
  with:
    cache: true
```

The Turborepo GitHub Actions page still shows `pnpm/action-setup@v3` with pnpm 8 and Node 20 [S37]. Prefer the pnpm page.

## pnpm + Turborepo monorepo specifics

- Turborepo itself runs on pnpm 12.0.0, with `allowBuilds`, `minimumReleaseAge: 2880` and Node `24.x` [S28]. The PR that moved it to pnpm 12 notes the pnpm 12 "multi-document lockfile" [S29].
- With a pinned pnpm, pnpm 12 writes the pin into `pnpm-lock.yaml` as a leading "env lockfile" document [S11].
- `turbo gen` failed on pnpm 12 (#14096) and on pnpm 10+ with `ERR_PNPM_IGNORED_BUILDS` (#14211). Both are closed [S29].
- The Turborepo docs name sherif, syncpack and manypkg for keeping versions equal, and pnpm catalogs as the package-manager way to do it [S25].
- create-t3-turbo layout [S32]:
  - Workspaces `apps/*`, `packages/*`, `tooling/*`.
  - One default catalog plus a named `react19` catalog.
  - `tooling/typescript` (`@acme/tsconfig`, with `base.json` and `compiled-package.json`), plus `tooling/eslint`, `tooling/prettier`, `tooling/tailwind` and `tooling/github` (a composite setup action).
  - `turbo.json` with `topo`, `^build` in `lint` and `typecheck`, `"ui": "tui"`, and `globalPassThroughEnv` including `NODE_ENV` and `CI`.
  - `apps/expo/turbo.json` extends `//` and makes `dev` `persistent` and `interactive`.
  - Its pnpm settings (`onlyBuiltDependencies`) are pnpm 10 syntax. Do not copy them.
- sherif usage [S30]:
  - Run `sherif` at the root. It exits 1 on errors.
  - `--fix` / `-f` fixes issues, `--select highest|lowest` picks a version, `--no-install` skips the install, `--fail-on-warnings` exits 1 on warnings too.
  - `-r <rule>` ignores a rule, `-p <name|path>` ignores a package, `-i <dep>` or `-i <dep@version>` ignores a dependency (globs like `@next/*` work).
  - The same options can go in a `"sherif"` field in the root `package.json`, in camelCase. CLI flags win.
  - Autofix is disabled when `$CI` is set.
  - Rules: `empty-dependencies`, `multiple-dependency-versions`, `unsync-similar-dependencies`, `root-package-manager-field` (accepts `packageManager` or `devEngines.packageManager`), `root-package-private-field`, `types-in-dependencies`, `unordered-dependencies` (errors); `non-existant-packages`, `packages-without-package-json`, `root-package-dependencies` (warnings).
  - There is a GitHub Action, `QuiiBz/sherif@v1`.

## Gotchas

1. **The local pnpm is 9.15.4.** pnpm 9 does not switch to the pinned version unless `manage-package-manager-versions` is on (default `false`) [S16]. It would ignore pnpm 11+ settings in `pnpm-workspace.yaml`. Install pnpm 12 before you generate anything [S2].
2. **pnpm 12 rejects unknown keys in `pnpm-workspace.yaml`** when pnpm is pinned (a warning otherwise) [S4]. Copying `onlyBuiltDependencies` from create-t3-turbo or older guides breaks the install [S3, S32].
3. **`minimumReleaseAge` is 1 day by default** [S8]. turbo 2.11.7 was published 2026-10-02 14:58 UTC [S1], so for about a day pnpm installs an older turbo (or refuses an exact pin). This clashes with "newest stable on the day" in the spec. Use `minimumReleaseAgeExclude`, or wait.
4. **sherif does not see `catalog:` references.** It parses each version as semver and drops anything that does not parse, such as `catalog:` or `workspace:*` [S31]. It only compares `dependencies` and `devDependencies` [S31]. So one package that bypasses the catalog with a literal version is not reported. sherif only reports two packages with different literal versions. `catalogMode: strict` covers `pnpm add` only [S5].
5. **`expo install --fix` writes literal versions over `catalog:`** in the app's `package.json`. A fix is still an open PR (expo/expo#50626) [S34]. Given gotcha 4, sherif will not catch this. Check `git diff` after any `expo install`.
6. **Duplicate React or React Native in one app breaks at runtime**, and Expo does not support duplicate React Native versions in one monorepo [S33]. Keep `react`, `react-dom` and `react-native` in the catalog.
7. **Strict env mode hides variables** that Expo, Android or Electron tooling may need (`ANDROID_HOME`, `JAVA_HOME`, `NODE_ENV`). Add them to `passThroughEnv` on the tasks that need them [S23, S24].
8. **Never put a persistent task in `dependsOn`.** turbo errors [S21]. Use `with` plus a readiness probe [S22].
9. **Corepack is not the path for Node 25+**, which no longer ships it [S35]. pnpm's own `packageManager` handling replaces it [S10].
10. **`.npmrc` is for auth and registry only** from pnpm 11. Settings left there are ignored. Environment variables use the `pnpm_config_*` prefix [S3].
