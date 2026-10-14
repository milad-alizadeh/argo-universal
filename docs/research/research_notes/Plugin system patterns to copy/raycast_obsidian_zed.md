# Plugin system patterns to copy: Raycast, Obsidian, Zed

Researched 2026-10-14 for Argo (Expo App on iOS/Android/web/macOS + local Node Server; plugins run on the Server in one shared plugin-host child process; plugin JSX → reconciler → JSON tree of Argo primitive names → rendered natively by the App).

Closest analogue to Argo: **Raycast** (Node child process + custom React reconciler + JSON render tree + native renderer). Obsidian is the counter-example (in-renderer, full DOM, no isolation). Zed is the reference for sandboxed, capability-gated, versioned host APIs.

Note on Raycast timeline: Raycast v1 (macOS, AppKit renderer) is what the 2022 architecture post describes. Raycast for Windows public beta Nov 2025; Raycast 2.0 (full rewrite, WebView frontend + one long-lived Node backend) public beta 14 May 2026, out of beta 21–25 Aug 2026. Some v1 mechanics may have changed in v2; flagged below.

## Manifest: file name, fields, static vs runtime contributions

### Takeaway
All three declare contributions statically in a manifest that the host reads without running plugin code: Raycast in `package.json` (commands, preferences, arguments, tools, platforms), Obsidian in a minimal `manifest.json` (identity + `minAppVersion` + `isDesktopOnly`; everything else registered at runtime in `onload()`), Zed in `extension.toml` (identity + declared languages/grammars/servers; Rust code only where needed). Raycast is the strongest model for Argo: the host can list commands, render settings forms and gate platforms before any plugin code loads.

### Cited Findings
**Raycast (`package.json`)**
- Top-level required fields: `name`, `title`, `description`, `icon`, `author`, `platforms`, `categories`. Optional: `commands`, `tools`, `ai`, `owner`, `access`, `contributors`, `pastContributors`, `keywords`, `preferences`, `external` — [Raycast Manifest](https://developers.raycast.com/information/manifest)
- `platforms` accepts `"macOS"` and `"Windows"`; `access` is `"public"` or `"private"`; `owner` marks organisation extensions (private unless `access` set); `external` lists packages excluded from the build but imported at runtime — [Raycast Manifest](https://developers.raycast.com/information/manifest)
- Command fields: required `name`, `title`, `description`, `mode`; optional `subtitle`, `icon`, `interval`, `keywords`, `arguments`, `preferences`, `disabledByDefault` — [Raycast Manifest](https://developers.raycast.com/information/manifest)
- `mode`: `"view"` (shows a main view), `"no-view"` (runs without UI, e.g. open URL), `"menu-bar"` (returns a Menu Bar Extra) — [Raycast Manifest](https://developers.raycast.com/information/manifest)
- `interval` runs `no-view`/`menu-bar` commands in the background (`90s`, `1m`, `12h`, `1d`; minimum `1m`) — [Raycast Manifest](https://developers.raycast.com/information/manifest)
- `disabledByDefault` only applies at install time or when a new command is added — [Raycast Manifest](https://developers.raycast.com/information/manifest)
- Command `arguments`: required `name`, `type`, `placeholder`; optional `required` (default false); types `"text"`, `"password"` (masked), `"dropdown"` (needs `data: [{title, value}]`) — [Raycast Manifest](https://developers.raycast.com/information/manifest)
- `tools` (AI tools): required `name`, `title`, `description`; `name` maps to a file in `src/tools/` — [Raycast Manifest](https://developers.raycast.com/information/manifest)
- `ai` (in `ai.yaml` or under `ai` in package.json): `skills` (each in `skills/<name>` with `SKILL.md`), `mcp` (one MCP server: HTTP `url`/`type`/`headers` or stdio `command`/`args`/`env`; `oauth` `{type:"dynamic"}` or static `clientId`/`clientSecret`/`scopes`), `modelProvider` (`models` → `src/models.ts`, Pro only), `instructions` (system message), `evals` — [Raycast Manifest](https://developers.raycast.com/information/manifest)
- Preferences (extension-level or per-command): required `name`, `title`, `description`, `type`, `required`; optional `placeholder`, `default`. Types: `"textfield"`, `"password"`, `"checkbox"` (needs `label`), `"dropdown"` (needs `data`), `"appPicker"`, `"file"`, `"directory"`. `default` may be per-platform: `{ "macOS": ..., "Windows": ... }` — [Raycast Manifest](https://developers.raycast.com/information/manifest)

**Obsidian (`manifest.json`)**
- Shared (plugins + themes): `author` (req), `minAppVersion` (req), `name` (req), `version` (req, semver `x.y.z`), `authorUrl` (opt), `fundingUrl` (opt, string or object of labelled URLs) — [Obsidian Manifest](https://docs.obsidian.md/Reference/Manifest)
- Plugin-only: `description` (req), `id` (req), `isDesktopOnly` (req boolean: true if it uses Node.js or Electron APIs) — [Obsidian Manifest](https://docs.obsidian.md/Reference/Manifest)
- `id` rules: lowercase letters and hyphens only; cannot end with "plugin"; cannot contain "obsidian"; should match the plugin folder name, else methods like `onExternalSettingsChange` are not called — [Obsidian Manifest](https://docs.obsidian.md/Reference/Manifest)
- Commands, ribbon icons, settings tabs, views are registered at runtime in `onload()` (e.g. `this.addRibbonIcon(...)`, `this.addSettingTab(...)`) — [Build a plugin](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin); [Settings](https://docs.obsidian.md/Plugins/User+interface/Settings)

**Zed (`extension.toml`)**
- Basic fields: `id`, `name`, `version`, `schema_version`, `authors`, `description`, `repository` — [Zed Developing Extensions](https://zed.dev/docs/extensions/developing-extensions)
- Rust code (compiled to Wasm) needed only for language server, context server (MCP) and debugger extensions; themes, icon themes, snippets and grammar/query-only languages need no code — [Zed Developing Extensions](https://zed.dev/docs/extensions/developing-extensions)
- Extension kinds: languages, debuggers, themes, icon themes, snippets, MCP servers; one extension can appear in several Extensions-page categories — [Zed Developing Extensions](https://zed.dev/docs/extensions/developing-extensions)
- At build time a compiled `extension.toml` gains compile-time data, including the extension API version it was built against; the registry `manifest.json` carries `wasm_api_version` (example "0.0.6") and `schema_version` — [Life of a Zed Extension](https://zed.dev/blog/zed-decoded-extensions)

### Inferences
- Argo should copy Raycast's static split: a manifest the Server can read without starting the plugin host, listing commands/views (with `mode`), preferences, platforms, and minimum host version. Obsidian's runtime-only registration means the host knows nothing until code runs, which costs startup and blocks UI like settings forms.
- Raycast's per-platform `default` in preferences and `platforms` field are a direct template for Argo's iOS/Android/web/macOS split (though in Argo the plugin runs on the Server, so "platform" mostly matters for which App primitives are available, not where code runs).
- Zed records the API version the extension was compiled against inside the artifact; Argo can stamp the `@argo/plugin-api` version into the built bundle the same way.

### Gaps
- Zed docs page fetched did not list `[language_servers.*]`, `[grammars.*]`, `[context_servers.*]` table fields; see https://zed.dev/docs/extensions/languages for those.
- Raycast's `help.md` (setup help shown next to required-preference form) is documented under Preferences, below.

## Process / runtime model and crash isolation

### Takeaway
Raycast v1: one managed Node child process; each extension in its own worker thread (V8 isolate, capped heap); a custom React reconciler serialises a JSON render tree, diffs it with JSON Patch, ships patches over JSON-RPC on stdio to Swift, which maps them to AppKit via a view-model layer. Raycast v2 (2026) keeps a single long-lived Node backend owning the extension runtime but moved the frontend to system WebViews. Obsidian runs plugins in the Electron renderer with full DOM and Node — no isolation. Zed runs Rust-compiled Wasm components in wasmtime, one task per extension, with no UI.

### Cited Findings
**Raycast v1 (the model Argo is closest to)**
- Native app is main process; a managed Node runtime runs as a separate child process, downloaded and integrity-checked by Raycast; Node can crash "without crashing Raycast itself (most of the time)" — [How the Raycast API and extensions work](https://www.raycast.com/blog/how-raycast-api-extensions-work)
- Each extension runs in a Node worker thread = separate V8 isolate with its own engine instance and run loop; workers created/destroyed on demand; a worker crash or OOM shows an error screen for that extension only — [Raycast blog](https://www.raycast.com/blog/how-raycast-api-extensions-work)
- Per-extension heap limits; "extensions that get too greedy will be stopped without a heads-up" (no numbers given) — [Raycast blog](https://www.raycast.com/blog/how-raycast-api-extensions-work)
- Security doc: single child Node process, each extension in its own isolate "with its own event loop, JavaScript engine, Node instance, and capped heap memory" — [Raycast Security](https://developers.raycast.com/information/security)
- Custom React reconciler turns pending changes into a serialisable "render tree"; each component is JSON — [Raycast blog](https://www.raycast.com/blog/how-raycast-api-extensions-work)
- After each render pass the full JSON tree is diffed against the previous with JSON Patch; no patches → native does nothing; above a size threshold, gzip is applied because it saves more than it costs; patches become bitset types on the Swift side — [Raycast blog](https://www.raycast.com/blog/how-raycast-api-extensions-work)
- Transport: JSON-RPC over standard file-descriptor streams, read in Swift via DispatchIO; extensions can only send registered messages (e.g. "render", "setClipboard"); temporary session IDs per extension instance generated on load; serial queues + buffered streams keep ordering; hop to main queue for UI — [Raycast blog](https://www.raycast.com/blog/how-raycast-api-extensions-work)
- A lightweight Swift view-model layer sits between the render tree and AppKit, shielding native UI from render-tree format changes; AppKit chosen over SwiftUI over crash/perf concerns — [Raycast blog](https://www.raycast.com/blog/how-raycast-api-extensions-work)
- Path extension → worker → Node parent → Raycast over RPC is "surprisingly fast" (no benchmarks) — [Raycast blog](https://www.raycast.com/blog/how-raycast-api-extensions-work)
- Extensions talk to Raycast through a thin RPC layer exposing only a defined set of APIs; they are "not further sandboxed" for file I/O, network, other Node features — [Raycast Security](https://developers.raycast.com/information/security)
- UI components: `List`, `Grid`, `Detail`, `Form`, each with an `ActionPanel` of `Action`s, each action bindable to a keyboard shortcut — [Raycast User Interface](https://developers.raycast.com/api-reference/user-interface); `menu-bar` mode returns a Menu Bar Extra — [Raycast Manifest](https://developers.raycast.com/information/manifest)

**Raycast v2 (2026)**
- Rewrite announced 14 May 2026: "A single long-lived Node process owns the app's business logic, such as database access, the extension runtime, other long-lived services"; layers talk via "platform message handlers and stdio transport" with interfaces declared once and typed clients generated per side — [A Technical Deep Dive Into the New Raycast](https://www.raycast.com/blog/a-technical-deep-dive-into-the-new-raycast)
- v1 extensions described UI "declaratively and rendered by the native app"; v2 frontend is React/TypeScript in system WebViews with native host apps; "The API was also designed to be portable"; Node is now bundled (no separate download) — [Raycast deep dive](https://www.raycast.com/blog/a-technical-deep-dive-into-the-new-raycast)
- Memory: v2 ~350–450 MB vs v1 200–300 MB; Node backend ~150–200 MB, WebView ~120–200 MB; bare Node ~12 MB — [Raycast deep dive](https://www.raycast.com/blog/a-technical-deep-dive-into-the-new-raycast)
- Flutter, Qt, React Native for Desktop, Swift-everywhere were considered and rejected — [Raycast deep dive](https://www.raycast.com/blog/a-technical-deep-dive-into-the-new-raycast) (via excerpts in search results)
- Out of beta 21 Aug 2026 (Windows changelog) — [Raycast Windows changelog v2.0](https://www.raycast.com/changelog/windows/2-0); macOS changelog dated 25 Aug 2026 — [Raycast macOS changelog v2.0](https://raycast.com//changelog/macos/2-0)

**Obsidian**
- Plugins ship as `main.js` + `manifest.json` in the vault folder and are loaded into the app — [Build a plugin](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- No sandbox: plugins inherit Obsidian's access (files, network, shell via Node/Electron on desktop); forum analysis says plugins load into the same process/memory space as the Electron app — [Obsidian forum: Security of the plugins](https://forum.obsidian.md/t/security-of-the-plugins/7544?page=3) (community discussion, not official docs)
- "Restricted mode" disables all community plugins; new vaults start in it — reported via search summary of [Obsidian forum](https://forum.obsidian.md/t/how-can-i-check-if-the-community-plugin-is-safe/15258) (not verified against official help page this session)

**Zed**
- Extensions are Rust compiled to `wasm32-wasip2`, run as WebAssembly components in wasmtime; `wasm_host.rs` compiles `extension.wasm` into a `wasmtime::Component`, creates a `Store`, instantiates, calls `init-extension` — [Life of a Zed Extension](https://zed.dev/blog/zed-decoded-extensions); [Zed Developing Extensions](https://zed.dev/docs/extensions/developing-extensions)
- API defined in WIT files (e.g. `wit/since_v0.2.0/extension.wit`) with records like `command`, a `worktree` resource, exports like `language-server-command`; extension side uses `wit_bindgen::generate!`, host uses `wasmtime::component::bindgen!` with `async: true` so blocking calls (downloads) don't stall the editor — [Life of a Zed Extension](https://zed.dev/blog/zed-decoded-extensions)
- Each extension runs on its own task processing calls from a channel, keeping calls sequential — [Life of a Zed Extension](https://zed.dev/blog/zed-decoded-extensions)
- No UI: "no support for modifying the UI to create new panels"; the Discord presence extension works around this by running a language server — [Life of a Zed Extension](https://zed.dev/blog/zed-decoded-extensions)
- Users restrict host calls with `granted_extension_capabilities`: `process:exec` (`command`, `args`), `download_file` (`host`, `path`), `npm:install` (`package`); globs `*`/`**`; a denied capability makes the API call fail; `[]` removes all — [Zed Extension Capabilities](https://zed.dev/docs/extensions/capabilities)

### Inferences
- Argo's planned shape (one shared plugin-host child, reconciler → JSON tree → native) is Raycast v1 almost exactly. Patterns worth copying verbatim: per-plugin worker thread with `resourceLimits` heap cap inside the shared host; JSON Patch diffs instead of full trees; an allowlist of RPC message types; per-instance session IDs; a view-model layer in the App between tree format and primitives so the wire format can evolve.
- Raycast v2 doubled the memory budget to ~350–450 MB with one shared Node; Argo's single plugin host should set an explicit heap budget per plugin from day one.
- Zed's capability grants (`process:exec`, `download_file`, `npm:install` with globbed args/hosts) are a concrete template if Argo ever wants to restrict plugin host calls, since Raycast and Obsidian both leave Node unrestricted.
- Obsidian demonstrates the cost of in-process plugins: one bad plugin can break the app and there is no permission story; avoid.

### Gaps
- Raycast v2: not confirmed whether the reconciler/JSON Patch pipeline survives, whether extension UI now renders in the WebView, or whether per-extension worker isolates remain. The deep-dive does not say.
- Raycast heap limit values: not published.
- Zed: no source found on what happens when an extension traps/panics or hangs (crash isolation behaviour).
- "No custom styling" in Raycast is widely known but no fetched page states it explicitly; the UI page only lists fixed components.

## API surface and versioning

### Takeaway
Raycast keeps the API runtime inside the app, not the extension: extensions just bump `@raycast/api`, the app checks compatibility and prompts users to update if too old; within a major version the API stays backward-compatible with deprecations. Obsidian ships typings (`obsidian` npm / obsidian-api repo) and relies on `minAppVersion`. Zed versions its WIT interface per release (`since_v0.x.0` folders) and the host keeps bindings for every past API version, picking the right one at load.

### Cited Findings
- Raycast: no API version in the manifest; to use new features "just update your `@raycast/api` npm dependency" and submit an update; the app "contains the API runtime and also manages the Node version"; Raycast checks compatibility and prompts the user to update if their app is too old — [Raycast Versioning](https://developers.raycast.com/information/versioning)
- Raycast: within a major version APIs stay backward-compatible; deprecated APIs are marked; a future major would come with notice and "a transition period for migrating extensions"; the store has one implicit latest version and users auto-update — [Raycast Versioning](https://developers.raycast.com/information/versioning)
- Raycast: the API "was also designed to be portable" across the v2 rewrite; "most extensions work on both Mac and Windows out of the box" — [Raycast deep dive](https://www.raycast.com/blog/a-technical-deep-dive-into-the-new-raycast); [Raycast for Windows, 20 Nov 2025](https://raycast.com/blog/raycast-for-windows)
- Obsidian: `minAppVersion` is a required manifest field for the minimum Obsidian version — [Obsidian Manifest](https://docs.obsidian.md/Reference/Manifest); new APIs are version-gated, e.g. declarative settings `getSettingDefinitions()` requires Obsidian 1.13.0+ — [Obsidian Settings](https://docs.obsidian.md/Plugins/User+interface/Settings)
- Zed: `Extension::instantiate_async` picks bindings matching the extension's API version; Dev and Nightly may use the latest API, Stable/Preview don't — [Life of a Zed Extension](https://zed.dev/blog/zed-decoded-extensions)
- Zed: `zed_extension_api` crate README carries a compatibility table (e.g. Zed 0.192.x supports API 0.0.1–0.6.0; 0.186.x → 0.0.1–0.5.0; 0.184.x → 0.0.1–0.4.0); a later host change widened the range to accept 0.7.0 — [compat table commit #10279](https://git.secluded.site/zed/commit/134decb75ee23520cfca9043a0a9fbfbc9f8513a); [v0.6.0 release #32945](https://git.secluded.site/zed/commit/3e8a07f496de79a3ed53b6a221ede554762611bc); [range to v0.7.0 #38529](https://git.secluded.site/zed/commit/de75e2d9f6142b6e667dff357de0444ff56e326b) (mirror of zed-industries/zed)
- Zed docs: use the latest `zed_extension_api` on crates.io that is compatible with the Zed versions you target; `Cargo.toml` `[lib] crate-type = ["cdylib"]` — [Zed Developing Extensions](https://zed.dev/docs/extensions/developing-extensions)

### Inferences
- For Argo, Raycast's model fits: the Server owns the plugin API runtime (and the JSON primitive vocabulary), plugins depend on a typed `@argo/...` package only for types/build, and the Server refuses or warns when a plugin needs a newer API. Zed's "host keeps every old interface version" is the stricter fallback if Argo ever breaks the API.
- Because Argo's App renders primitives, the primitive vocabulary itself needs versioning (App ↔ Server), not just the plugin ↔ host API; Raycast's Swift view-model layer is how they kept those decoupled.

### Gaps
- Raycast: whether `@raycast/api` code is bundled into the extension or injected at runtime is not stated explicitly beyond "the app contains the API runtime"; migration tooling (`npx ray migrate` / `@raycast/migration`) not verified this session.
- Exact Zed release that first accepted API 0.7.0 not found.

## Settings / preferences

### Takeaway
Raycast is declarative: preferences live in the manifest, Raycast renders the form, and required ones block the command until filled (with an optional `help.md` shown beside the form). Obsidian was imperative (`PluginSettingTab` with `Setting` rows) and in 1.13.0 added a declarative `getSettingDefinitions()` API with auto-save. Zed extensions have no settings UI of their own; users configure via Zed settings (e.g. capability grants).

### Cited Findings
- Raycast: "Required preferences need to be set by the user before a command opens"; optional `help.md` next to `package.json` is shown beside the setup form and replaces the README link — [Raycast Preferences](https://developers.raycast.com/api-reference/preferences)
- Raycast: `getPreferenceValues()` returns name→value; defaults are fallbacks; `textfield`/`password`/`dropdown`/`file`/`directory` → string, `checkbox` → boolean, `appPicker` → `Application` — [Raycast Preferences](https://developers.raycast.com/api-reference/preferences)
- Raycast: `openExtensionPreferences()` / `openCommandPreferences()`; types auto-generated into `raycast-env.d.ts` under a global `Preferences` namespace (e.g. `Preferences.ShowTodos`) — [Raycast Preferences](https://developers.raycast.com/api-reference/preferences)
- Raycast: password preferences and LocalStorage are written to Raycast's local encrypted database, readable only by the owning extension; Raycast also uses the system Keychain for secure data (the doc does not say extension secrets go to Keychain) — [Raycast Security](https://developers.raycast.com/information/security)
- Obsidian (imperative): class extends `PluginSettingTab`, registered with `this.addSettingTab(...)`; override `display()`, `containerEl.empty()`, build rows with `new Setting(containerEl)` + `setName/setDesc/setHeading`, `addText/addToggle/addButton/addSearch/addExtraButton/...`; each `onChange` must call `saveSettings()` — [Obsidian Settings](https://docs.obsidian.md/Plugins/User+interface/Settings)
- Obsidian (declarative, 1.13.0+): override `getSettingDefinitions()` returning definitions; a `control` with `key` binds to `this.plugin.settings[key]` with automatic read/write/save; control types `toggle`, `text`, `textarea`, `number`, `slider`, `dropdown`, `file`, `folder`, `color`; supports `visible`/`disabled` predicates, groups, lists, sub-pages, `render` callbacks (no auto-save); `getControlValue`/`setControlValue` overrides for external storage; must stay cheap as it runs often — [Obsidian Settings](https://docs.obsidian.md/Plugins/User+interface/Settings)
- Zed: user-level `granted_extension_capabilities` setting restricts extension capabilities — [Zed Capabilities](https://zed.dev/docs/extensions/capabilities)

### Inferences
- Obsidian moving from imperative to declarative settings in 1.13 is direct evidence for Argo: declare settings as data (manifest or a definitions function) and let the App render them with its own Settings primitives (fits Argo's "Settings rows: label + footer" and FieldGroup/ListItem conventions). This also makes settings render natively on phones without plugin UI.
- Copy Raycast's "required preference blocks first run + help.md" flow for API keys.
- Obsidian's `visible`/`disabled` predicates show declarative settings eventually need conditional logic; a manifest-only schema (Raycast) can't express that, a runtime definitions function (Obsidian 1.13) can.

### Gaps
- Raycast: exact Keychain vs encrypted-DB placement of password prefs is ambiguous in docs.
- Zed: no per-extension settings schema found (extensions read LSP settings via the worktree, not verified this session).

## Storage

### Takeaway
Raycast: per-extension encrypted key/value `LocalStorage` (string/number/boolean), `Cache`, a per-extension support directory for files, and OAuth `TokenSet` storage with automatic logout preference. Obsidian: one `data.json` per plugin via `loadData()`/`saveData()`. Zed: no storage API found; extensions write within their own working directory.

### Cited Findings
- Raycast `LocalStorage`: `getItem`, `setItem`, `removeItem`, `allItems`, `clear`; values string/number/boolean; typed via generics; stored in Raycast's local encrypted database; shared across an extension's commands; not readable by other extensions; "not meant to store large amounts of data" — use Node file APIs in the support directory — [Raycast Storage](https://developers.raycast.com/api-reference/storage)
- Raycast OAuth: PKCE only (extensions are public clients); `OAuth.PKCEClient` with `RedirectMethod` `Web` (`https://raycast.com/redirect?packageName=...`), `App` (`raycast://oauth?package_name=...`), `AppURI` (`com.raycast:/oauth?package_name=...`), `ClientIdMetadataDocument`; `authorizationRequest()` (S256), `authorize()` shows overlay; `setTokens/getTokens/removeTokens`; Raycast auto-adds a logout preference once tokens are saved; `TokenSet` fields `accessToken`, `updatedAt`, `expiresIn`, `refreshToken`, `idToken`, `scope`, `isExpired()`; PKCE proxy at oauth.raycast.com for providers without PKCE — [Raycast OAuth](https://developers.raycast.com/api-reference/oauth)
- `@raycast/utils`: `OAuthService` with built-in providers (e.g. `OAuthService.github`, `OAuthService.linear`) needing only scopes; `withAccessToken(provider)(Component)` and `getAccessToken()` — [Raycast utils OAuth](https://developers.raycast.com/utilities/oauth)
- Raycast 2.0 adds "loopback OAuth redirects for MCP providers such as Atlassian" — [This Week in Raycast, Aug 2026](https://buttondown.com/thisweekinraycast/archive/this-week-in-raycast-august-17-august-23-2026/)
- Obsidian `loadData`: "Load settings data from disk. Data is stored in `data.json` in the plugin folder." — [Obsidian loadData](https://docs.obsidian.md/Reference/TypeScript+API/Plugin/loadData); pattern `Object.assign({}, DEFAULT_SETTINGS, await this.loadData())`, `saveData(this.settings)` — [Obsidian Settings](https://docs.obsidian.md/Plugins/User+interface/Settings)

### Inferences
- Argo's Server-side plugin host can copy Raycast's trio: small encrypted KV per plugin, a per-plugin data directory, and a host-owned OAuth/token store that automatically surfaces a "Sign out" setting. Since Argo's App and Server are separate, OAuth redirects need a scheme handled by the App and forwarded to the Server (Raycast's `App`/`AppURI` redirect methods are the template).
- Obsidian's single `data.json` + `onExternalSettingsChange` hook (called when the file changes on disk, e.g. via sync) is a simple model for synced plugin settings.

### Gaps
- `environment.supportPath` and `Cache` API pages not fetched; their existence is from Raycast docs links, details unverified.
- Full list of `OAuthService` built-in providers not fetched.
- Zed: no extension storage API documented in pages fetched.

## Install / load / dev loop

### Takeaway
Raycast: open-source store repo (raycast/extensions), CI + human review, built archive uploaded, auto-update; `npm run dev` gives hot reload and error reporting. Obsidian: `.obsidian/plugins/<id>/` per vault, enable under Community plugins, Hot-Reload community plugin for dev. Zed: `zed-industries/extensions` repo is source of truth, CI compiles to Wasm and uploads archives, "Install Dev Extension" overrides the published one.

### Cited Findings
- Raycast: all extensions open source, reviewed by staff and community; CI checks manifest schema, assets, author, build and type errors; built extension archived and uploaded to the Store, downloaded and unpacked on install/update; extensions auto-update — [Raycast Security](https://developers.raycast.com/information/security)
- Raycast: `npm install && npm run dev` runs dev mode "with hot reloading and error reporting"; the dev extension appears at the top of root search and stays installed after Ctrl+C — [Raycast: Create your first extension](https://developers.raycast.com/basics/create-your-first-extension)
- Raycast `disabledByDefault` lets commands ship off by default — [Raycast Manifest](https://developers.raycast.com/information/manifest)
- Obsidian: plugin folder is `<vault>/.obsidian/plugins/<id>/` with `main.js` and `manifest.json`; enable via Settings → Community plugins → "Turn on community plugins" → toggle; reload via disable/enable or "Reload app without saving"; restart after changing `manifest.json`; Hot-Reload plugin recommended — [Build a plugin](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- Zed: `zed-industries/extensions` repo is source of truth; CI compiles with `extensions_cli`, uploads to S3; zed.dev polls `manifest.json` every few minutes; archive contains `extension.wasm`, `grammars/*.wasm`, `.scm` queries; the post says the repo model "doesn't scale" — [Life of a Zed Extension](https://zed.dev/blog/zed-decoded-extensions)
- Zed dev loop: Extensions page → "Install Dev Extension" (or `zed: install dev extension`), pick directory; published version is uninstalled and shown as "Overridden by dev extension"; logs via `zed: open log`, `zed --foreground` for INFO and `println!`/`dbg!` — [Zed Developing Extensions](https://zed.dev/docs/extensions/developing-extensions)

### Inferences
- Argo dev loop to copy: a CLI `dev` command that registers a local plugin folder with the Server and hot-reloads the plugin's worker on change (Raycast), plus "dev plugin overrides published one" semantics (Zed).
- Raycast and Zed both centralise publishing in one GitHub repo with CI; Zed's own team says it does not scale, a pitfall to note before choosing a monorepo store.

### Gaps
- `ray develop`/`ray lint`/`ray build`/`npm run publish` details not fetched (CLI page).

## Testing approach

### Takeaway
None of the three publishes a strong testing story for plugins in the pages fetched; all lean on dev-mode hot reload, logs and store review CI.

### Cited Findings
- Raycast: dev mode with hot reload and error reporting; store CI checks schema, build and type errors — [Raycast first extension](https://developers.raycast.com/basics/create-your-first-extension); [Raycast Security](https://developers.raycast.com/information/security)
- Raycast AI extensions declare `evals` in `ai.yaml` — [Raycast Manifest](https://developers.raycast.com/information/manifest)
- Obsidian: mobile emulation via `this.app.emulateMobile(true)` in DevTools; device debugging via `chrome://inspect` (Android) or Web Inspector (iOS 16.4+) — [Obsidian Mobile development](https://docs.obsidian.md/Plugins/Getting+started/Mobile+development)
- Zed: logs and `--foreground` output — [Zed Developing Extensions](https://zed.dev/docs/extensions/developing-extensions)

### Inferences
- Argo has an advantage: because plugin UI is a JSON tree of primitive names, plugin views can be tested by rendering the reconciler output in Node and asserting on the tree (no device needed). None of the three offers this explicitly.

### Gaps
- No official unit-testing guidance found for Raycast, Obsidian or Zed plugins.

## Mobile: Obsidian mobile plugins, Raycast for iOS

### Takeaway
Obsidian runs the same plugin bundle on iOS/Android inside its mobile app; Node/Electron APIs are absent, so plugins set `isDesktopOnly: true` or branch on `Platform`. Raycast for iOS (April 2025) is a companion app (AI chat, quicklinks, snippets, sync); there is no evidence that third-party extensions run on iOS.

### Cited Findings
- Obsidian: set `isDesktopOnly: true` if the plugin uses Node.js or Electron so mobile users can't install it; those APIs don't exist on mobile and calls (including in dependencies) can crash the plugin — [Obsidian Mobile development](https://docs.obsidian.md/Plugins/Getting+started/Mobile+development)
- Obsidian: `Platform` from `'obsidian'` exposes `Platform.isIosApp`, `Platform.isAndroidApp` (others like `isMobile` not on that page) — [Obsidian Mobile development](https://docs.obsidian.md/Plugins/Getting+started/Mobile+development)
- Obsidian: regex lookbehind only on iOS 16.4+, need fallbacks — [Obsidian Mobile development](https://docs.obsidian.md/Plugins/Getting+started/Mobile+development)
- Raycast for iOS shipped 30 Apr 2025 (v1.97.0) with AI chat, Quicklinks, snippets, sync — [Raycast changelog 1.97.0](https://www.raycast.com/changelog/macos/1-97-0); "AI Extensions" on iOS per secondary report — [AlternativeTo](https://alternativeto.net/news/2025/4/raycast-for-ios-is-here-with-core-mac-features-ai-chat-notes-cloud-sync-and-more)
- Raycast's `platforms` field only accepts `"macOS"` and `"Windows"` (no iOS) — [Raycast Manifest](https://developers.raycast.com/information/manifest)

### Inferences
- Raycast's manifest having no iOS platform is strong evidence that store extensions do not run on iOS; their Node runtime model can't run on iOS. Argo sidesteps this by keeping plugin code on the Server and sending only JSON trees to phones — something neither Raycast nor Obsidian does.
- Obsidian's `isDesktopOnly` maps to an Argo concern in reverse: Argo plugins always run on a Mac Server, so a per-plugin flag should instead say which App surfaces (desktop-only primitives vs phone) a view supports, and the App should degrade unknown primitives.

### Gaps
- No official Raycast doc found stating whether third-party extensions run on iOS; secondary sources conflict/are vague.

## Moving first-party features into extensions

### Takeaway
Obsidian ships "core plugins" built into the app and toggleable in Settings → Core plugins, separate from community plugins; the Obsidian team also maintains some official plugins in the community store (Importer, Maps). Zed started an extensibility project in early 2024 focused on languages (Tree-sitter grammars as Wasm), with 67 community language extensions by April 2024. Raycast says building internal features and extensions "feel almost identical" in v2.

### Cited Findings
- Obsidian core plugins are "officially built and supported by the Obsidian team, and are included within the application"; some are off by default; toggled under Settings → Core plugins; team-maintained open-source plugins like Importer and Maps ship through the community store — [Obsidian Help: Plugins](https://obsidian.md/help/plugins)
- Zed: "Extensible Language Support in Zed – Part 1" (Max Brunsfeld, 18 Apr 2024): extensibility project started ~2 months earlier, first milestone Tree-sitter grammars distributed and run as Wasm via a new `WasmStore` in Tree-sitter; 67 community language extensions by then — [plushcap summary of Zed blog](https://www.plushcap.com/content/zed/blog/extensible-language-support-in-zed-part-1) (aggregator; original on zed.dev/blog)
- Zed language support = metadata/config, grammar, queries, language servers; `ExtensionLspAdapter` wraps extension-provided `language_server_command` — [Zed Languages docs](https://zed.dev/docs/extensions/languages); [Life of a Zed Extension](https://zed.dev/blog/zed-decoded-extensions)
- Raycast v2: building internal features and extensions "feel almost identical" since both use React, TypeScript and Node — [Raycast deep dive](https://www.raycast.com/blog/a-technical-deep-dive-into-the-new-raycast)

### Inferences
- Obsidian's two-tier model (bundled, toggleable core plugins + store plugins + team-maintained store plugins) is the cleanest pattern for Argo moving first-party features (e.g. GitHub PRs) into plugins: ship them bundled and toggleable first, built on the same public API.
- Zed's approach shows the payoff of moving first-party features out: the community quickly filled language coverage once the API existed.

### Gaps
- Could not fetch a primary Zed post about extracting specific built-in languages (e.g. moving languages out of the core binary) or published lessons/pitfalls; only the Part 1 summary and the "doesn't scale" repo comment.
- No source found on Raycast's own built-in commands being implemented as extensions.

## Multi-provider integrations

### Takeaway
Raycast's ecosystem is one extension per service (GitHub, Linear, Jira, etc.), with shared building blocks (`OAuthService` providers in `@raycast/utils`) rather than one extension spanning providers. No first-party example of a multi-provider extension was found.

### Cited Findings
- `@raycast/utils` ships per-provider `OAuthService` presets (e.g. `OAuthService.github`, `OAuthService.linear`) so each service extension needs only scopes — [Raycast utils OAuth](https://developers.raycast.com/utilities/oauth)
- Raycast `ai.mcp` allows one MCP server per extension — [Raycast Manifest](https://developers.raycast.com/information/manifest)

### Inferences
- For Argo (e.g. PR/CI providers), the Raycast pattern suggests one plugin per provider sharing a host-provided auth helper and a common contribution contract (e.g. "PR provider" interface), rather than one plugin with many providers.

### Gaps
- No search done that found a Raycast extension supporting multiple providers; the Store repo (https://github.com/raycast/extensions) would need browsing.
