# Runtime, security, performance and testing of a server-driven plugin UI system (Argo)

Research date: 2026-10-14. Scope: Node plugin runtime on a local Server, client-side validation of JSON UI trees, React Native render performance, plugin storage, testing. Primary sources where reachable; where a primary source was not reachable it is flagged.

## 1. Running plugin code on Node: worker_threads vs child process vs isolated-vm vs permission model vs WASM; how Raycast, VS Code, Claude Code and Shopify isolate

### Takeaway
No Node-native mechanism is a security boundary against malicious code: the permission model is explicitly a "seat belt", worker_threads only give heap caps and a kill switch, and isolated-vm's own README says it does not make untrusted code safe. The industry norm for first-party-ish extension ecosystems (Raycast, VS Code, Claude Code) is trust plus process/worker separation for stability, not hard sandboxing; only Shopify (untrusted third-party merchants' apps) runs plugin code in a real sandbox (Web Worker with no DOM/window, remote-dom bridge).

### Cited Findings
**Node permission model**
- Stable since v23.5.0 / v22.13.0 (added v20.0.0). Flags: `--permission`, `--allow-fs-read`, `--allow-fs-write`, `--allow-child-process`, `--allow-worker`, `--allow-addons`, `--allow-wasi`, `--allow-net`, plus `--permission-audit` mode that only publishes violations to `diagnostics_channel`. — [Node.js Permissions](https://nodejs.org/api/permissions.html)
- It is not a sandbox: "seat belt" approach; "It does not provide security guarantees in the presence of malicious code"; "Malicious code can bypass the permission model and execute arbitrary code." — [Node.js Permissions](https://nodejs.org/api/permissions.html)
- Documented holes: symlinks are followed outside granted paths; existing file descriptors via `node:fs` bypass it; `node:sqlite` can touch the filesystem without `node:fs` checks; `process._debugProcess(pid)` is not gated; flags like `--env-file` and V8 flags set via `v8.setFlagsFromString` bypass it. — [Node.js Permissions](https://nodejs.org/api/permissions.html)
- Runtime API `process.permission.has()` / `drop()`; dropping is irreversible. — [Node.js Permissions](https://nodejs.org/api/permissions.html)
- Interaction with workers: a Worker with default options inherits the parent's CLI flags, but an explicit `execArgv` (even `[]`) replaces them and "can drop the parent's `--permission` / `--allow-*` grants". — [Node.js worker_threads](https://nodejs.org/api/worker_threads.html)

**worker_threads**
- `resourceLimits`: `maxOldGenerationSizeMb`, `maxYoungGenerationSizeMb`, `codeRangeSizeMb`, `stackSizeMb` (default 4). "Reaching these limits leads to termination of the `Worker` instance." Limits "only affect the JS engine, and no external data, including no `ArrayBuffer`s"; the whole process may still abort on a global OOM. — [Node.js worker_threads](https://nodejs.org/api/worker_threads.html)
- `worker.terminate()` stops JS execution "as soon as possible", returns a promise resolved on `'exit'`; terminated workers exit with code 1. An uncaught exception emits `'error'` and terminates the worker. `process.exit()` in a worker ends only that thread. — [Node.js worker_threads](https://nodejs.org/api/worker_threads.html)
- `env` option: default is a copy of the parent's `process.env`; pass an explicit object to restrict what the worker sees (so secrets are not inherited). `SHARE_ENV` shares it. — [Node.js worker_threads](https://nodejs.org/api/worker_threads.html)
- Workers can share memory (`SharedArrayBuffer`); the docs say nothing about workers being a security boundary. — [Node.js worker_threads](https://nodejs.org/api/worker_threads.html)

**isolated-vm**
- Exposes V8 `Isolate`; `memoryLimit` default 128 MB, min 8 MB, but is "a guideline" (attacker could use 2-3x before termination); per-call `timeout` in ms (none by default). — [isolated-vm README](https://github.com/laverdet/isolated-vm)
- "Use of isolated-vm to run untrusted code does not automatically make your application safe"; recommends running instances in a separate process and being "prepared for crashes, hangs". — [isolated-vm README](https://github.com/laverdet/isolated-vm)
- In maintenance mode; Node 20+ requires `--no-node-snapshot`; Node 24 needs isolated-vm 6.x/5.x, Node 26 needs 7.x; odd Node versions unsupported. — [isolated-vm README](https://github.com/laverdet/isolated-vm)
- No Node APIs inside the isolate (it is bare V8), so plugins would have no fs/net/npm unless the host proxies them.

**Raycast**
- One child Node.js process; each extension in its own V8 isolate (worker thread) with its own event loop and "limited heap memory"; the stated aim is isolation between extensions for future concurrent background execution. Communication through standard file handles and a thin RPC protocol exposing "a defined set of APIs". Extensions are not further sandboxed for file I/O or network. Raycast downloads and verifies the Node binary. — [Raycast Security](https://developers.raycast.com/information/security)
- Extensions are open source and human-reviewed before publishing to the Store; CI checks manifest/assets/types. — [Raycast Security](https://developers.raycast.com/information/security)
- Earlier design: JavaScriptCore engines hosted out-of-process via XPC so a supervising component could load, unload and recover from crashes without taking down the main app. — summarised from [Raycast blog: How the Raycast API and extensions work](https://raycast.com/blog/how-raycast-api-extensions-work) (reached only via search snippet, not fetched in full)
- Raycast changelog v2.6: each extension process uses ~30% less memory at startup; a memory leak fixed. — [Raycast changelog](https://www.raycast.com/changelog/macos-beta/2-6) (search snippet only)

**VS Code**
- Extension Host is a separate process type: local Node.js host on the same machine, web host in a WebWorker, or remote Node host. Designed so misbehaving extensions don't affect UI startup or responsiveness; extensions load lazily via activation events. — [VS Code Extension Host](https://code.visualstudio.com/api/advanced-topics/extension-host)
- The page does not describe sandboxing, crash/restart behavior. (Not found in this source.)

**Claude Code plugins**
- Plugins are declarative bundles (skills, commands, agents, hooks, MCP servers, LSP servers, monitors, mods); code they run executes as separate processes (hook commands, MCP `stdio` servers, LSP servers, monitors) launched by Claude Code with `${CLAUDE_PLUGIN_ROOT}`/`${CLAUDE_PLUGIN_DATA}`. LSP servers have `startupTimeout`, `shutdownTimeout`, `requestTimeout` (default 60000 ms), `restartOnCrash` (default true) and `maxRestarts`. — [Plugin manifest reference](https://code.claude.com/docs/en/plugins-reference)
- Secrets: `userConfig` fields marked `sensitive: true` are masked and stored in "the platform's secure credential store" not `settings.json`; exported to hook processes as `CLAUDE_PLUGIN_OPTION_<KEY>`; deliberately rejected inside shell-form commands because "the field's value is passed to a shell that would re-parse the substituted value". — [Plugin manifest reference](https://code.claude.com/docs/en/plugins-reference)
- Plugin state belongs in `${CLAUDE_PLUGIN_DATA}` (`~/.claude/plugins/data/<id>/`), kept across updates; the install root changes on update so "don't write state there". — [Plugin manifest reference](https://code.claude.com/docs/en/plugins-reference)
- Note: the user's premise "Claude Code mods (in-process)" was not verified; the mod reference (`/docs/en/plugins/mods/reference`) was not fetched.

**Shopify**
- UI extensions "run in an isolated sandbox, separate from the checkout page and other UI extensions", with "limited access to global web APIs"; they run inside a Web Worker with no `window`/DOM; network access is an opt-in capability (`network_access`); rate limits apply to extensions that make too many changes ("can't make further changes during the buyer's session"); batching with `Promise.all` recommended. — [Shopify Checkout UI extensions](https://shopify.dev/docs/api/checkout-ui-extensions/latest)
- Rendering via remote-dom, which "mirrors real DOM nodes from the sandbox to the host". — [Shopify Engineering](https://shopify.engineering/upgrading-checkout-blocks-app-to-polaris-web-components)

### Inferences
- For Argo (local Server on the user's own Mac, plugins installed by the user) the Raycast/VS Code model fits: out-of-main-process execution for stability, not for adversarial isolation. Practical stack: one supervisor Node process per Server, one `worker_threads` Worker per plugin with `resourceLimits`, explicit `env: {}` allowlist, `terminate()` on timeout; or a child process per plugin if OS-level kill/crash containment (native crash, true OOM) matters more, since a worker's global OOM can still abort the process.
- Combining a child process with `node --permission --allow-fs-read=<plugin dir> --allow-fs-write=<plugin data dir>` gives a cheap accident guard (seat belt) but must not be marketed as a sandbox; do not pass `--allow-child-process` / `--allow-net` unless the plugin declares them (Shopify's `network_access` capability is a good manifest analogue).
- isolated-vm is a poor fit if plugins need Node APIs/npm packages; it only makes sense if plugins are pure functions over host-provided data, and it is in maintenance mode with Node-version coupling.
- True untrusted-code isolation would need WASM/QuickJS or OS sandboxing (macOS sandbox-exec / separate user) — not researched here (see Gaps).
- Secrets: keep tokens in the Server (Keychain) and hand plugins only what they declare; never pass the Server's `process.env` to a plugin. Claude Code's sensitive `userConfig` + env injection and Raycast's per-extension encrypted store are the reference patterns.

### Gaps
- No source found for QuickJS/WASM sandbox performance or security for Node plugin hosts (e.g. quickjs-emscripten, Extism, Javy); not researched within the call budget.
- Raycast's exact heap cap and crash/restart policy are not documented publicly in anything found.
- VS Code's crash/restart policy (extension host unresponsive/crash handling, auto-restart limits) not found in the pages fetched.
- Claude Code mods' execution model (in-process vs subprocess) not verified.
- Shopify's exact Web Worker/remote-dom transport (postMessage batching) not confirmed in fetched pages.

## 2. Validation and security of UI trees on the client (Zod, limits, URL allow-lists, no expressions, unknown nodes)

### Takeaway
Zod 4 supports exactly the needed shape: `z.discriminatedUnion` keyed on a `type` literal for O(1) dispatch, recursion through getters, `z.strictObject` to reject unknown keys, `.max()` on arrays/strings, and `z.httpUrl()`. Zod has no built-in depth or total-node budget, so those must be enforced by a separate pre-walk (or a counting wrapper) before/alongside parsing.

### Cited Findings
- Discriminated unions pick the matching option via a shared key "instead of checking each option in order", which "is faster for large unions"; discriminators must be `z.enum()`, `z.literal()`, `z.null()` or `z.undefined()`. — [Zod API](https://zod.dev/api)
- Recursive schemas use a getter on the key (example: `Category` whose `subcategories` getter returns `z.array(Category)`); an explicit return type annotation fixes "implicit any" errors; complex cases can hit TypeScript circularity errors. — [Zod API](https://zod.dev/api)
- `z.object()` strips unknown keys by default; `z.strictObject()` throws on unknown keys; `z.looseObject()` passes them through. — [Zod API](https://zod.dev/api)
- `z.url()` is permissive (any WHATWG URL via `new URL()`), constrain `protocol`/`hostname` with regexes; `z.httpUrl()` restricts to http/https. — [Zod API](https://zod.dev/api)
- `.max(n)` works on strings (counted in Unicode code points) and arrays. — [Zod API](https://zod.dev/api)
- Zod docs "Nesting discriminated unions" section had no body in the fetched page; Zod docs list no depth/recursion-limit option. — [Zod API](https://zod.dev/api)
- Precedent for reject-vs-drop: Claude Code's plugin manifest strips unknown top-level keys (warning) but treats unknown keys inside strict objects (`userConfig`, `channels`, `lspServers`, `monitors`) as errors that stop the plugin loading. — [Plugin manifest reference](https://code.claude.com/docs/en/plugins-reference)
- Precedent for a validator CLI with a `--strict` mode that turns warnings into failures in CI. — [Plugin manifest reference](https://code.claude.com/docs/en/plugins-reference)
- Mosaic SDUI project (small third-party repo, not an authority): JSON Schema is the single source of truth, bindings are generated, CI "drift check" regenerates and fails if stale, conformance tests validate builder output and every definition file against the schema; node tree deliberately "open, with props as an untyped bag". — [mosaic-media/contracts on pkg.go.dev](https://pkg.go.dev/github.com/mosaic-media/contracts@v0.59.0)
- Airbnb Ghost Platform: server sends "sections" (data for a group of UI components, already localised/formatted, each client maps to its own UI), "screens" (layout + placements, presentation as popover/modal/full-screen) and actions; strongly typed via GraphQL (Viaduct). — [Airbnb engineering (Medium)](https://medium.com/p/842244c5f5) (truncated search copy), [InfoQ](https://www.infoq.com/news/2021/07/airbnb-server-driven-ui/)

### Inferences
- Recommended schema shape: `Node = discriminatedUnion("type", [Text, Stack, Image, List, Button, ...])`, each variant a `strictObject`, children via getter on container variants, plus a global pre-pass computing max depth (e.g. 32), total node count (e.g. few thousand), per-string byte caps, per-array caps and payload bytes, rejecting the whole tree if exceeded. Depth must be checked before Zod recursion on untrusted input to avoid stack exhaustion.
- Unknown node type: for a plugin UI, replace the offending node with an inline "unsupported component" placeholder (drop-and-report) so older Apps survive newer plugins, but reject the tree for malformed *known* nodes (strict) — mirrors Claude Code's strip-top-level/strict-nested split. Needs a protocol/version field so the App can tell "unknown because newer" from "malformed".
- Actions should be a closed set of typed intents (`{type:"call", handler:"id", args}` referencing handler ids registered on the Server, `{type:"openUrl", url}`), never expressions/scripts; URLs validated with `z.httpUrl()` plus scheme allow-list (https only, optionally a per-plugin host allow-list declared in the manifest) and images restricted to `https:` or Server-proxied/`data:` URIs with size caps; deep links only to Argo-owned routes.
- Plugin-supplied styling should be semantic tokens/enums (e.g. `tone: "danger"`), not free-form style objects.

### Gaps
- Zod-specific benchmarks for deep trees / recursion cost were not found.
- No primary source found for the Zod recursion-depth behaviour; the above depth-limit advice is an engineering inference.
- Hyperview's handling of unknown elements: the fetched Hyperview behaviors page did not address it (custom-elements page not fetched). DivKit's unknown-component handling not researched.
- Airbnb original article only reachable as truncated copy; its versioning/compat strategy for unknown sections was not retrieved.

## 3. Performance on mobile React Native (large JSON trees, keys, memoisation, virtualised lists, payload/diff cost, Hermes parse, SDUI lessons)

### Takeaway
There is no credible published benchmark for SDUI render cost on RN (DivKit's performance claims are qualitative only). The robust levers are structural: cap tree size, virtualise any plugin list (FlashList v2 / LegendList), give nodes stable ids as keys, memoise per node, and send patches rather than full trees. Shopify's 64 KB gzip bundle budget shows platforms treat extension payload size as a first-class limit.

### Cited Findings
- Hermes precompiles the app's JS bundle to bytecode at build time, which helps startup but not `JSON.parse` of data fetched at runtime; large payloads build a full JS object tree on the heap. A third-party post (HackerNoon) reports a ~250 MB file crashing `JSON.parse` on Android and suggests native parsing only for ~100-200 MB+; this is far beyond UI-tree sizes (KB to low MB), so treat as an upper-bound warning, not a UI-tree measurement. — [HackerNoon: Why We Stopped Using JSON.parse in React Native](https://hackernoon.com/lite/why-we-stopped-using-jsonparse-in-react-native) (search summary only; timing table not seen)
- FlashList v2: requires the New Architecture; recycles views, so local `useState` in items may carry over — use `useRecyclingState` with a deps array; use `getItemType` for heterogeneous lists (separate recycling pools); don't put changing `key`s on item internals (defeats recycling); provide `keyExtractor`; memoise props passed to the list; test in release mode. — summarised from mirrors of the [FlashList docs](https://www.mintlify.com/shopify/flash-list/fundamentals/usage) and [GitHub repo](https://github.com/shopify/flash-list); the official shopify.github.io page returned 404, so wording is unverified against the original.
- LegendList is positioned as a fix for blank-space on fast scroll; claims lower CPU/memory than FlashList are self-reported by the authors (Flashlight profiler); independent head-to-head benchmarks not found, secondary sources disagree. — [Legend List v2 docs](https://mail.legendapp.com/open-source/list/v2/getting-started) and search summary of [pkgpulse](https://www.pkgpulse.com/guides/flashlist-vs-flatlist-vs-legendlist-react-native-lists-2026)
- Shopify: since API 2025-10 UI extension bundles are capped at 64 KB compressed (128 KB for full-page customer account extensions), enforced at deploy. — [Shopify Checkout UI extensions](https://shopify.dev/docs/api/checkout-ui-extensions/latest)
- Shopify case study: five extensions started at 300-356 KB raw (~100-112 KB gzip); dropping `react-reconciler` (React to Preact) saved ~89 KB; transferred bundle sizes fell 40-85%, but Extension Load Time improved only ~8% at P50 and ~7% at P90 — bundle size is not the whole of load time. — [Shopify Engineering](https://shopify.engineering/upgrading-checkout-blocks-app-to-polaris-web-components)
- Community pushback: a 2 MB to 64 KB limit change is hard for apps with large dependencies (e.g. one error-tracker ~130 KB gzip). — [Shopify community thread](https://community.shopify.dev/t/reconsider-recent-ui-extensions-file-size-limit-changes/32608) (search snippet via a secondary summary)
- Shopify rate-limits extensions that make too many UI mutations and recommends batching. — [Shopify Checkout UI extensions](https://shopify.dev/docs/api/checkout-ui-extensions/latest)
- DivKit: open-sourced 2022 by Yandex; client libs for Android, iOS, web; DSLs in Kotlin/TypeScript/Python. The only performance statements found are qualitative ("quick and fluid", "strict performance requirements"); no measurements published. A competitor (Nativeblocks) says DivKit doesn't let you use your own components (biased source). — [Nativeblocks comparison](https://nativeblocks.io/blog/nativeblocks-vs-divkit/) and search summaries of Habr/Infostart; not independently verified
- Hyperview: page fetched documents `debounce`, `once` and a `visible` trigger (load when scrolled into view) as controls limiting behavior frequency; no performance numbers. — [Hyperview behavior attributes](https://hyperview.org/docs/reference_behavior_attributes)

### Inferences
- Render a plugin tree with one memoised component per node type, props = the node's own subtree reference; because the Server sends immutable-ish JSON, structural sharing on patch application (replace only the changed path) lets `React.memo` skip untouched subtrees. Key by plugin-supplied stable `id` (required field in the schema) rather than array index.
- Any node of type `List` should be virtualised (FlashList v2 with `getItemType` mapped from child node type, or LegendList), with `keyExtractor` = node id; non-list containers can render eagerly under the tree-size cap. Avoid per-item local state or reset via recycling-aware state.
- Prefer patch/diff messages (e.g. JSON Patch-like ops keyed by node id) over resending whole trees once trees pass tens of KB; Shopify's per-mutation rate limit hints that high-frequency updates are a real DoS/jank vector, so Argo should coalesce updates per frame/Server tick and rate-limit per plugin.
- Hermes `JSON.parse` of typical UI trees (KB to ~1 MB) is unlikely to be the bottleneck compared with reconciliation and layout; a payload cap (e.g. 256 KB-1 MB per tree) is a cheap guard. This is judgment, not measured: benchmark on a low-end Android release build.
- tRPC over WebSocket already gives push; messages can be sent as parsed JSON without extra encoding.

### Gaps
- No primary-source benchmark for RN rendering of SDUI trees, nor for Hermes `JSON.parse` throughput at 100 KB-1 MB sizes; Hyperview and DivKit performance claims not found beyond qualitative.
- Airbnb/Lyft/Shopify-Shop-app RN SDUI performance write-ups not located within the call budget.
- Official FlashList and LegendList v3 docs not read directly (official FlashList URL 404'd; only mirrors/search summaries).
- Diff-application cost (JSON patch libraries in Hermes) not researched.

## 4. Plugin storage: per-plugin KV/tables in SQLite, migrations, quotas

### Takeaway
All reference platforms give each plugin a private namespaced key-value store (plus a file directory for large data) and push "large data" to files; none of the fetched pages publish hard numeric quotas, so Argo must pick its own. A separate secrets API that is not synced and uses OS-level encryption is standard.

### Cited Findings
- VS Code: `workspaceState` (per workspace KV), `globalState` (all workspaces KV, with `setKeysForSync` to opt specific keys into Settings Sync), `storageUri`/`globalStorageUri` (local directories for large files), `secrets` (encrypted, not synced; Electron `safeStorage` on desktop). No quotas or size limits are stated on the page. — [VS Code common capabilities](https://code.visualstudio.com/api/extension-capabilities/common-capabilities)
- Raycast `LocalStorage`: `getItem`, `setItem`, `removeItem`, `allItems`, `clear`; values `string | number | boolean`; stored in "local encrypted database", shared across the extension's commands, not accessible to other extensions; "not meant to store large amounts of data" (use Node file APIs / support directory instead); no numeric limit given. — [Raycast Storage API](https://developers.raycast.com/api-reference/storage)
- Raycast: "password" preferences and local storage are stored in the local encrypted database, accessible only by the owning extension; Keychain holds app-level secure data. — [Raycast Security](https://developers.raycast.com/information/security)
- Claude Code: non-sensitive plugin config in `settings.json` `pluginConfigs`, sensitive values in the platform credential store; persistent plugin data directory `${CLAUDE_PLUGIN_DATA}` survives updates and is deleted on uninstall unless `--keep-data`. — [Plugin manifest reference](https://code.claude.com/docs/en/plugins-reference)
- Shopify: a checkout UI extensions storage API page was not found (URL 404). Not confirmed.

### Inferences
- Suggested Argo design: one SQLite table `plugin_kv(plugin_id, key, value_json, updated_at, PRIMARY KEY(plugin_id,key))` with per-plugin quota (row count and total bytes enforced in the Server write path, e.g. a few MB), a per-value size cap, and a separate `plugin_secrets` path backed by Keychain rather than SQLite. Cascade-delete on uninstall with an opt-out like Claude Code's `--keep-data`.
- Offering plugins raw tables raises migration and isolation risk; a KV API first (Memento/LocalStorage-shaped), with optional per-plugin schema + versioned migrations later (separate SQLite file or attached database per plugin is easier to quota, wipe and back up than shared tables).
- Memento-style `get(key, default)`/`update(key, value)` plus `keys()` and a `schemaVersion` field per plugin makes data migrations a plugin concern that the Server only gates.
- Large or binary data goes to a per-plugin data directory (as VS Code `globalStorageUri`, Raycast support dir, Claude `${CLAUDE_PLUGIN_DATA}`), also subject to a disk quota.

### Gaps
- No published numeric quotas found for VS Code `globalState`, Raycast `LocalStorage`/`Cache` (Cache API page not retrieved), or Shopify storage.
- Raycast `Cache` API (LRU capacity) not retrieved.
- No source found on per-plugin SQLite migration patterns in any of these platforms.

## 5. Testing: SDUI fixtures, contract tests, schema compatibility, visual regression, Storybook, plugin test harnesses

### Takeaway
No SDUI team write-up on testing was retrievable at primary-source level; what exists are (a) Airbnb's mock-driven snapshot approach for GraphQL-backed UI, (b) small open-source SDUI repos using a single JSON Schema with CI drift checks and fixture conformance tests, and (c) plugin-harness precedents (VS Code `@vscode/test-electron`, Claude Code `plugin validate`/`plugin eval`). Note: there is no `claude plugin test` command; the relevant commands are `claude plugin validate` (static) and `claude plugin eval` (behavioural).

### Cited Findings
- Airbnb: GraphQL code generator "Niobe" produces a JSON mock file per `@generateMock` directive and helper functions for loading it from demo apps, snapshot tests and unit tests, so client engineers can build UI before the server implements the schema; engineers may edit generated JSON and edits are preserved. — [Airbnb: GraphQL Data Mocking at Scale with LLMs and @generateMock](https://airbnb.tech/?p=568) (via search summary)
- Airbnb Android: state-simulation framework extended with screenshot library and Happo integration to capture, upload and compare UI snapshots in CI; deterministic rendering from simulated state replaced flaky Espresso tests. — secondary summary only; no primary article fetched. No Airbnb source found tying Ghost Platform specifically to this testing.
- Mosaic SDUI contracts (small third-party project): single JSON Schema as source of truth, generated bindings, CI drift check (`check-generated.sh`), conformance tests validating builders' output and every definition file against the schema. — [mosaic-media/contracts](https://pkg.go.dev/github.com/mosaic-media/contracts@v0.59.0)
- VS Code: `@vscode/test-electron` downloads/unzips VS Code, launches it with `extensionDevelopmentPath`/`extensionTestsPath`; tests run inside an Extension Development Host with full API access; `@vscode/test-cli` provides `vscode-test` reading `.vscode-test.js` (files, version, workspaceFolder, mocha options; labelled configs); Mocha under the hood; a CLI run fails if another VS Code instance is running. — [VS Code testing extensions](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- Claude Code `claude plugin validate [dir]` checks manifest/schema/paths, `--strict` turns warnings into failures for CI; it also validates MCP server entries (v2.1.281+). — [Plugin manifest reference](https://code.claude.com/docs/en/plugins-reference)
- Claude Code `claude plugin eval` runs each case in "a fresh, isolated non-interactive session with only your plugin loaded"; 3 runs per case by default; grader types `regex`, `tool_used`, `tool_order`, `file_exists` (free, computed from transcript/files) and `llm`, `baseline` (judge-model calls); "There are no custom-code graders"; case passes when score meets `--threshold` (default 1.0); compares against a no-plugin baseline arm (`--ablation none` to skip); can mock MCP servers; real model calls cost money; recommends deterministic `regex` graders over `llm` graders for long output. — [Test plugins with evals](https://code.claude.com/docs/en/plugin-evals)
- Snapshot/golden-test guidance from a generic skill doc (low authority): exclude volatile fields (timestamps, random ids), require review for intentional snapshot updates, block merges on unexpected diffs, test deserialisation of historical format versions. — [skills.sh test-snapshot](https://skills.sh/shotaiuchi/dotclaude/test-snapshot)

### Inferences
- Suggested Argo test pyramid: (1) schema unit tests with valid/invalid/oversize/too-deep fixtures; (2) contract tests where the same fixture directory is consumed by the Server (SDK `emit()` output must validate against the schema) and by the App (each fixture renders without throwing and unknown nodes degrade to placeholder); (3) compatibility tests: keep frozen fixtures per protocol version and assert the current App schema still parses all earlier ones (backward) and that newer-than-supported fixtures degrade gracefully (forward); (4) Storybook stories generated from the fixture directory (one story per fixture feeding the registry renderer) giving visual review and optional screenshot regression; (5) a plugin test harness shipped with the SDK that runs a plugin in the real worker/child runtime with a fake host, asserts emitted trees validate, and exercises timeout/OOM/crash paths — analogous to `@vscode/test-electron` running inside the real host.
- A `argo plugin validate` command (manifest + schema + fixture check with `--strict`) is the cheapest high-value analogue of `claude plugin validate`. An eval-like command is only relevant if plugins involve LLM behaviour.
- Generate TypeScript types and JSON Schema from the Zod schema (single source of truth) and add a CI drift check, as the Mosaic repo does.

### Gaps
- No primary engineering posts located on SDUI contract/compat testing from Airbnb, Lyft, DoorDash or Nubank (search returned none; Airbnb Ghost Platform article only as truncated copy).
- Storybook RN rendering of JSON fixtures: no external source consulted (project-specific docs live in `docs/agents/storybook.md` in the repo and were not part of this task).
- Visual regression tooling for React Native (e.g. Maestro, Storybook screenshot runners) not researched.
- Raycast's extension test tooling (`ray lint`, `ray build`) not researched.
