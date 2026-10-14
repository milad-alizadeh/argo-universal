# VS Code extension system: patterns to copy

Researched 2026-10-14 against code.visualstudio.com/api and `microsoft/vscode` `main` (raw files read directly). Paths below are repo paths in `microsoft/vscode` unless another repo is named.

## 1. Manifest: `package.json`, activation, and static vs runtime UI

### Takeaway
An extension is an npm `package.json` with a few extra fields. Everything the workbench must draw *before* the extension runs (commands, menus, views, settings, keybindings, walkthroughs) is declared statically in `contributes`; code then fills those slots at runtime (tree data, webview content, command handlers). Since 1.74, contributing a command/view/language implies its activation event, so most extensions no longer list them.

### Cited Findings
- Required fields: `name` (lowercase, no spaces), `version` (SemVer), `publisher`, `engines` (object that must contain `vscode`). Optional: `main` (Node entry), `browser` (web-extension entry), `contributes`, `activationEvents`, `extensionDependencies`, `extensionPack`, `extensionKind`, `capabilities` (`untrustedWorkspaces`, `virtualWorkspaces`), `scripts` (incl. VS Code hooks `vscode:prepublish`, `vscode:uninstall`), `icon`, `categories`, etc. — [Extension Manifest](https://code.visualstudio.com/api/references/extension-manifest)
- `engines.vscode` gives compatible VS Code versions, "Cannot be `*`"; a caret range like `^0.10.5` means minimum version 0.10.5. — [Extension Manifest](https://code.visualstudio.com/api/references/extension-manifest)
- Real example: GitHub Pull Requests extension declares `"engines": {"node": ">=20", "vscode": "^1.141.0"}`, `extensionDependencies: ["vscode.github-authentication"]`, and `activationEvents` `onStartupFinished`, `onOpenExternalUri:http(s)`, `onFileSystem:pr`, `onWebviewPanel:PullRequestOverview`, etc. — [vscode-pull-request-github/package.json](https://github.com/microsoft/vscode-pull-request-github/blob/main/package.json)
- Activation events (full current list): `onAuthenticationRequest:<providerId>`, `onChatParticipant:<id>`, `onCommand:<id>`, `onCustomEditor:<viewType>`, `onDebug` (+ `onDebugAdapterProtocolTracker`, `onDebugDynamicConfigurations`, `onDebugInitialConfigurations`, `onDebugResolve:<type>`), `onEditSession:<scheme>`, `onFileSystem:<scheme>`, `onIssueReporterOpened`, `onLanguage:<languageId>`, `onLanguageModelTool:<name>`, `onNotebook:<type>`, `onOpenExternalUri`, `onRenderer:<id>`, `onSearch:<scheme>`, `onStartupFinished`, `onTaskType:<type>`, `onTerminal:<shellType>` (+ `onTerminalProfile`, `onTerminalShellIntegration`), `onUri`, `onView:<id>`, `onWalkthrough:<id>`, `onWebviewPanel:<viewType>`, `workspaceContains:<glob>`, `*`. — [Activation Events](https://code.visualstudio.com/api/references/activation-events)
- Implicit activation since 1.74.0: contributed commands, views and languages "do not require a corresponding `onCommand` / `onView` / `onLanguage` activation event declaration"; custom editors and auth providers likewise; tasks since 1.76.0. — [Activation Events](https://code.visualstudio.com/api/references/activation-events)
- `*` should be used "only when no other activation events combination works"; `onStartupFinished` fires after startup and "will not slow down VS Code startup". — [Activation Events](https://code.visualstudio.com/api/references/activation-events)
- Even the built-in Git extension uses `*` (plus `onEditSession:file`, `onFileSystem:git`, `onFileSystem:git-show`), `main: ./out/main`. — [extensions/git/package.json](https://github.com/microsoft/vscode/blob/main/extensions/git/package.json)
- VS Code "loads them lazily" based on activation events, e.g. Markdown "should only be loaded when a user opens a Markdown file". — [Extension Host](https://code.visualstudio.com/api/advanced-topics/extension-host)
- 38 top-level contribution points today: authentication, breakpoints, chatAgents, chatInstructions, chatPromptFiles, chatSkills, colors, commands, configuration, configurationDefaults, customEditors, debuggers, grammars, icons, iconThemes, jsonValidation, keybindings, languages, languageModelChatProviders, languageModelTools, menus, problemMatchers, problemPatterns, productIconThemes, resourceLabelFormatters, semanticTokenModifiers, semanticTokenScopes, semanticTokenTypes, snippets, submenus, taskDefinitions, terminal, themes, typescriptServerPlugins, views, viewsContainers, viewsWelcome, walkthroughs. — [Contribution Points](https://code.visualstudio.com/api/references/contribution-points)
- `viewsContainers`: `id`, `title`, `icon`; locations `activitybar` and `panel`. `views`: `id`, `name`, `when`, `icon`, `contextualTitle`, placed in `explorer`, `scm`, `debug`, `test` or a custom container. `viewsWelcome`: `view`, `contents`, `when`; order is core first, then built-in extensions, then other extensions. — [Contribution Points](https://code.visualstudio.com/api/references/contribution-points)
- Menu locations are fixed IDs: `commandPalette`, `view/title`, `view/item/context`, `editor/title`, `editor/context`, `explorer/context`, `scm/title`, `scm/resourceState/context`, `webview/context`, `timeline/item/context`, etc., plus any contributed `submenus`. — [Contribution Points](https://code.visualstudio.com/api/references/contribution-points)
- GHPR's `contributes` keys: `chatContext`, `configuration` (75 settings), `yamlValidation`, `viewsContainers` (two activity-bar containers `github-pull-requests` and `github-pull-request` with `$(github)` / `$(git-pull-request)` codicons), `views`, `commands`, `viewsWelcome`, `keybindings`, `menus`, `colors`, `resourceLabelFormatters`, `chatSkills`, `languageModelTools`. — [vscode-pull-request-github/package.json](https://github.com/microsoft/vscode-pull-request-github/blob/main/package.json)
- Runtime side: `vscode.commands` registers/executes commands; Command Palette visibility comes from `contributes.commands`. — [Common Capabilities](https://code.visualstudio.com/api/extension-capabilities/common-capabilities)

### Inferences
- The static/runtime split is what lets the workbench draw the activity bar icon, view title, menu items and "welcome" placeholder for an extension that has not started yet; the first interaction (open the view, run the command) is itself the activation event. Argo can copy this exactly: manifest `contributes` drawn by the App from Server-sent metadata, plugin code only started on first use.
- Codicon references in strings (`"$(github)"`) are VS Code's way of letting a manifest name an icon without shipping assets; Argo could reference its own icon set by name the same way.
- 1.74's implicit activation is a lesson in itself: requiring authors to repeat `onCommand:x` for every contributed command was redundant; derive activation from `contributes`.

### Gaps
- Exact 1.74 release-note wording not fetched; the date comes from the activation-events page only.

## 2. Extension host: processes, RPC, crash and hang handling, bisect

### Takeaway
All extensions of one kind share one extension host process per window (local Node, web worker, or remote Node), talking to the renderer over a typed RPC protocol of paired `MainThread*` / `ExtHost*` proxies. Crashes are survived: the host auto-restarts up to 3 times in 5 minutes, then asks the user; hangs are detected after 3 s of unanswered RPC and profiled to blame an extension.

### Cited Findings
- Three host kinds: **local** ("A Node.js extension host running locally, on the same machine as the user interface"), **web** (browser WebWorker), **remote** (Node.js in a container/SSH/WSL/Codespace). Desktop has local + web; remote windows have local + web + remote; vscode.dev has web only. — [Extension Host](https://code.visualstudio.com/api/advanced-topics/extension-host)
- `extensionKind`: `["ui"]`, `["workspace"]`, `["ui","workspace"]`, `["workspace","ui"]`; order is preference; single-string form deprecated (pre-1.40). Node `main` vs `browser` entry decides which host can load it. — [Extension Host](https://code.visualstudio.com/api/advanced-topics/extension-host)
- The extension host exists so extensions cannot impact startup performance, slow UI operations, or modify the UI. — [Extension Host](https://code.visualstudio.com/api/advanced-topics/extension-host); "Extensions run in a separate Extension Host process" which keeps VS Code stable and lets the team change the DOM without breaking extensions. — [Extension Capabilities overview](https://code.visualstudio.com/api/extension-capabilities/overview)
- RPC layout: `src/vs/workbench/api/common/extHost.protocol.ts` defines `export const MainContext = { MainThreadAuthentication: createProxyIdentifier<MainThreadAuthenticationShape>('MainThreadAuthentication'), MainThreadCommands: ..., MainThreadConfiguration: ..., ... }` and a matching `ExtHostContext`; `createProxyIdentifier` lives in `src/vs/workbench/services/extensions/common/proxyIdentifier.ts`. — [extHost.protocol.ts](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/api/common/extHost.protocol.ts)
- Folder split: `src/vs/workbench/api/common/` (ext-host side, any runtime: `extHost.api.impl.ts` builds the `vscode` namespace; `extHostCommands.ts`, `extHostConfiguration.ts`, `extHostTreeViews.ts`, `extHostStorage.ts`, `extHostSecrets.ts`, `extHostExtensionService.ts`, `extensionHostMain.ts`, `extHostRpcService.ts`), `api/browser/` (renderer side: `mainThreadCommands.ts`, `mainThreadTreeViews.ts`, `mainThreadStorage.ts`, `mainThreadSecretState.ts`, `mainThreadConfiguration.ts`, `extensionHost.contribution.ts`), `api/node/` (Node-only: `extensionHostProcess.ts`, `extHostTerminalService.ts`, `extHostTask.ts`, `extHostSearch.ts`...), `api/worker/` (web host). — [src/vs/workbench/api](https://github.com/microsoft/vscode/tree/main/src/vs/workbench/api)
- Responsiveness: `rpcProtocol.ts` has `ResponsiveState { Responsive, Unresponsive }` and `UNRESPONSIVE_TIME = 3 * 1000; // 3s`, checked every 1000 ms. — [rpcProtocol.ts](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/services/extensions/common/rpcProtocol.ts)
- On unresponsive, `extensionsAutoProfiler.ts` logs "UNRESPONSIVE extension host: starting to profile NOW", takes a ~5 s CPU profile, attributes samples to extensions by location, and writes `exthost-<rand>.cpuprofile` to tmp. — [extensionsAutoProfiler.ts](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/contrib/extensions/electron-browser/extensionsAutoProfiler.ts)
- Crash handling: `ExtensionHostCrashTracker` with `_TIME_LIMIT = 5 * 60 * 1000` and `_CRASH_LIMIT = 3`. Under the limit: status "The extension host terminated unexpectedly. Restarting..." (auto-restart). Over it: error prompt "Extension host terminated unexpectedly 3 times within the last 5 minutes." with actions **Start Extension Bisect**, **Open Developer Tools**, **Restart Extension Host**, **Learn More**. Logs list "The following extensions were running: ..." — [abstractExtensionService.ts](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/services/extensions/common/abstractExtensionService.ts), [nativeExtensionService.ts](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/services/extensions/electron-browser/nativeExtensionService.ts)
- Extension bisect shipped in 1.52 (Nov 2020); binary-searches installed extensions by disabling halves and reloading; blog post by Johannes Rieken, 2021-02-16, notes users commonly have 50+ extensions. — [VS Code blog: extension bisect](https://code.visualstudio.com/blogs/2021/02/16/extension-bisect), [InfoWorld](https://www.infoworld.com/article/3601469/visual-studio-code-adds-extension-troubleshooting.html)
- Enablement service consults `extensionBisectService.isDisabledByBisect(extension)` — bisect is implemented as a temporary enablement state, not a separate mechanism. — [extensionEnablementService.ts](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/services/extensionManagement/browser/extensionEnablementService.ts)

### Inferences
- Argo's "one shared plugin-host child process" matches VS Code's local host exactly; VS Code accepts that one bad extension can take down the others in the same host, and compensates with auto-restart + crash budget + bisect + profiling rather than per-extension processes.
- The `MainThread*`/`ExtHost*` pairing (one proxy per API area, both shapes declared in one protocol file) is a direct template for a Server <-> plugin-host protocol: one typed file, one proxy id per area, implementations on each side.
- Record which plugins were activated at crash time and log them; that is cheap and is what VS Code's crash message relies on.

### Gaps
- No official doc states "one extension host process per window" in so many words; the docs say only that "multiple extension hosts" run depending on configuration. Per-window behaviour is from training knowledge, not verified here.
- I did not find a published "Extension Host isolation" blog post; I cannot confirm one exists.

## 3. API surface, versioning, proposed API

### Takeaway
One hand-written `vscode.d.ts` is the whole stable API, published as `@types/vscode`; new API lives in separate `vscode.proposed.<name>.d.ts` files that an extension must opt into via `enabledApiProposals`, and only Insiders/dev mode or a product.json allowlist may actually use them. Rule one of the API guidelines: never break API.

### Cited Findings
- Proposed API steps: add `"enabledApiProposals": ["<proposalName>"]`; copy `vscode.proposed.<proposalName>.d.ts` (or run `npx @vscode/dts dev`); proposals are Insiders-only, "subject to change", and you "should not publish extensions using the proposed API on the Marketplace"; enable with `code-insiders . --enable-proposed-api=<EXTENSION-ID>` or `enable-proposed-api` in `argv.json`. — [Using Proposed API](https://code.visualstudio.com/api/advanced-topics/using-proposed-api)
- Proposal registry is generated: `src/vs/platform/extensions/common/extensionsApiProposals.ts` ("THIS IS A GENERATED FILE") maps each name to `src/vscode-dts/vscode.proposed.<name>.d.ts`. — [extensionsApiProposals.ts](https://github.com/microsoft/vscode/blob/main/src/vs/platform/extensions/common/extensionsApiProposals.ts)
- Gate logic (`extensionsProposedApi.ts`): proposals allowed for all when running from sources (`!isBuilt`) or in extension-development mode on non-stable quality; otherwise allowed per extension via `product.json#extensionEnabledApiProposals` (product wins over package.json if they differ) or the CLI flag. Built-in extensions are exempt (`if (!extension.isBuiltin && ...) error "CANNOT USE these API proposals"`). Unknown proposals log "Likely, the proposal has been finalized (check 'vscode.d.ts') or was abandoned." — [extensionsProposedApi.ts](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/services/extensions/common/extensionsProposedApi.ts)
- First-party use is heavy: built-in Git lists ~35 proposals (`scmHistoryProvider`, `scmActionButton`, `quickDiffProvider`, `timeline`, ...); Marketplace-shipped GHPR lists 33 (`chatSessionsProvider`, `treeItemMarkdownLabel`, `treeViewMarkdownMessage`, `shareProvider`, ...). The OSS `product.json` has no `extensionEnabledApiProposals` entries, so GHPR's allowlist must come from the closed Microsoft distro product.json. — [extensions/git/package.json](https://github.com/microsoft/vscode/blob/main/extensions/git/package.json), [GHPR package.json](https://github.com/microsoft/vscode-pull-request-github/blob/main/package.json), [product.json](https://github.com/microsoft/vscode/blob/main/product.json)
- API guidelines: "We DO NOT want to break API"; add new params as optional; events named `on[Did|Will]VerbSubject`; `createXYZ(args): XYZ` returns synchronously; reads synchronous, writes async; data-driven provider design so VS Code decides when providers run and how many are merged; providers return light items plus a `resolve` step; `CancellationToken` always last parameter; return `undefined` never `null`; numeric enums only; "Don't pass provider data over the wire unchanged". — [Extension API guidelines wiki](https://github.com/microsoft/vscode/wiki/Extension-API-guidelines)

### Inferences
- Copy: one `argo.d.ts`-style public types package versioned with the App; `engines.argo` checked at load; experimental API behind named proposals that only built-in plugins (or dev mode) may enable. That gives first-party plugins room to move fast without promising stability to third parties.
- The "providers + resolve + cancellation" guideline maps cleanly onto JSON-tree UI: plugin returns cheap nodes, Server/App asks for details lazily.

### Gaps
- Deprecation policy specifics (how long deprecated API stays) not found; the guidelines page links an "Extension API process" page I did not read. `@types/vscode` version must be `<=` `engines.vscode` (training knowledge; vsce enforces it) — not verified in this session.

## 4. Settings

### Takeaway
Extensions declare settings as JSON Schema in `contributes.configuration`; core renders the Settings editor from it, handles user/workspace/folder layering and scopes, and the UX guidelines explicitly say do not build your own settings page or webview.

### Cited Findings
- Fields: category `title`, `properties`; per property `type`, `default`, `description`, `markdownDescription`, `enum`, `enumDescriptions`, `markdownEnumDescriptions`, `enumItemLabels`, `scope`, `order`, `deprecationMessage`, `markdownDeprecationMessage`, `editPresentation` (e.g. `"multilineText"`), `tags`, `ignoreSync`, plus JSON Schema keywords (`minimum`, `maximum`, `pattern`, `format`, `maxItems`). — [Contribution Points](https://code.visualstudio.com/api/references/contribution-points)
- Scopes: `application` (user settings only, all instances), `machine` (user or remote settings, not synced), `machine-overridable` (machine, overridable by workspace/folder, not synced), `window` (default; user/workspace/remote), `resource` (all levels incl. folder), `language-overridable` (resource + per-language override). — [Contribution Points](https://code.visualstudio.com/api/references/contribution-points)
- Settings are read with `workspace.getConfiguration`. — [Common Capabilities](https://code.visualstudio.com/api/extension-capabilities/common-capabilities)
- Settings UX: Do "Add default values to each setting", "Add clear descriptions"; Don't "Create your own settings page/webview", don't "Create long descriptions". — [Settings UX guidelines](https://code.visualstudio.com/api/ux-guidelines/settings)
- Webview UX: Don't "Repeat existing functionality (Welcome page, Settings, configuration, etc.)", don't use for wizards or promotions. — [Webview UX guidelines](https://code.visualstudio.com/api/ux-guidelines/webviews)
- GHPR reads its own settings with `vscode.workspace.getConfiguration(PR_SETTINGS_NAMESPACE).get<string[]>(REMOTES)` (`githubPullRequests.remotes`). — [folderRepositoryManager.ts](https://github.com/microsoft/vscode-pull-request-github/blob/main/src/github/folderRepositoryManager.ts)

### Inferences
- Argo should generate plugin settings UI from a schema in the manifest, rendered by Argo's own Settings primitives (FieldGroup/ListItem), rather than letting plugins draw settings screens. This also keeps phone/desktop rendering consistent.
- Scopes map naturally: `application` ~ App/device, `machine` ~ Server, `resource` ~ Project.

### Gaps
- Docs text stating "the Settings editor is generated from `contributes.configuration`" was not quoted directly; supported by the guidelines but phrased as inference.

## 5. Storage

### Takeaway
Each extension gets two key/value Mementos (global and workspace), two private folders (global and workspace), and an encrypted SecretStorage — all keyed by extension id, all provided by core so extensions never pick their own paths.

### Cited Findings
- `workspaceState` / `globalState`: key/value stores; `globalState.setKeysForSync` opts keys into Settings Sync. `storageUri` / `globalStorageUri`: private directories for large files. `secrets`: "A global storage for secrets ... that will be encrypted", not synced. — [Common Capabilities](https://code.visualstudio.com/api/extension-capabilities/common-capabilities)
- Folder paths: `globalStorageHome/<extension-id lowercased>` and `workspaceStorageHome/<workspace storage name>` — [extHostStoragePaths.ts](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/api/common/extHostStoragePaths.ts)
- Memento backing: `extensionStorage.ts` stores each extension's state as one JSON string under key = extension id, in `StorageScope.PROFILE` (global) or `StorageScope.WORKSPACE`; the storage layer uses `@vscode/sqlite3`. — [extensionStorage.ts](https://github.com/microsoft/vscode/blob/main/src/vs/platform/extensionManagement/common/extensionStorage.ts), [base/parts/storage/node/storage.ts](https://github.com/microsoft/vscode/blob/main/src/vs/base/parts/storage/node/storage.ts)
- Secrets: stored in the same storage service under prefix `secret://`, values encrypted via `IEncryptionService`, which on desktop uses Electron `safeStorage` (OS keychain-derived key; can fall back to plain-text encryption on Linux). — [secrets.ts](https://github.com/microsoft/vscode/blob/main/src/vs/platform/secrets/common/secrets.ts), [encryptionMainService.ts](https://github.com/microsoft/vscode/blob/main/src/vs/platform/encryption/electron-main/encryptionMainService.ts)
- Uninstall: a `vscode:uninstall` script in `scripts` is forked as a Node process ("Running post uninstall script") so the extension can clean up. — [extensionLifecycle.ts](https://github.com/microsoft/vscode/blob/main/src/vs/platform/extensionManagement/node/extensionLifecycle.ts), [Extension Manifest](https://code.visualstudio.com/api/references/extension-manifest)

### Inferences
- Copy: `context.state.global/project`, `context.storageDir.global/project`, `context.secrets` scoped by plugin id, all owned by the Server. Argo's Server already has a DB, so Memento-as-JSON-blob-per-plugin is trivially reproducible.

### Gaps
- Could not confirm from source whether core deletes `globalState`/`globalStorageUri` on uninstall; grep of the management services found no such cleanup, only the `vscode:uninstall` hook and pruning of outdated-version sync keys. The SQLite filename `state.vscdb` was not confirmed in the files read.

## 6. Install, enable/disable, built-in extensions

### Takeaway
User extensions live in `~/.vscode/extensions`; built-ins ship in the app's `extensions/` folder and go through the same scanner as "System" type; built-ins can be disabled but not uninstalled; enablement is global or per workspace.

### Cited Findings
- Install folder `~/.vscode/extensions` (`%USERPROFILE%\.vscode\extensions` on Windows), override with `--extensions-dir` or `VSCODE_EXTENSIONS`. Disable globally or "only for your current Workspace". `@builtin` filter lists bundled ones. Auto-update after `extensions.autoUpdateDelay` (12 h default). Marketplace signs extensions; VS Code verifies on install. Workspace `.vscode/extensions.json` `recommendations`. — [Extension Marketplace docs](https://code.visualstudio.com/docs/configure/extensions/extension-marketplace)
- Scanner: `extensionsScannerService.ts` has `scanSystemExtensions` (default + dev system extensions from `systemExtensionsLocation`) and `scanUserExtensions` (from profile location), plus development-path scanning; results are deduped across `ExtensionType.System`, `ExtensionType.User` and `development`. — [extensionsScannerService.ts](https://github.com/microsoft/vscode/blob/main/src/vs/platform/extensionManagement/common/extensionsScannerService.ts)
- Built-in folder today includes `git`, `git-base`, `github`, `github-authentication`, `microsoft-authentication`, `markdown-language-features`, `markdown-math`, `emmet`, `npm`, `references-view`, `typescript-language-features`, `merge-conflict`, `ipynb`, `notebook-renderers`, `simple-browser`, `media-preview`, `terminal-suggest`, `copilot`, many language/theme packs, and `vscode-api-tests`. — [microsoft/vscode/extensions](https://github.com/microsoft/vscode/tree/main/extensions)
- `product.json#builtInExtensions` additionally pulls Marketplace-built extensions into the build (e.g. `ms-vscode.js-debug-companion`); `builtInExtensionsEnabledWithAutoUpdates: ["GitHub.copilot-chat"]`. — [product.json](https://github.com/microsoft/vscode/blob/main/product.json)
- Git README: "This extension is bundled with Visual Studio Code. It can be disabled but not uninstalled." — [extensions/git/README.md](https://github.com/microsoft/vscode/blob/main/extensions/git/README.md)
- Enablement states include `DisabledGlobally`, `DisabledWorkspace`, `EnabledWorkspace`; workspace-level lists stored in `StorageScope.WORKSPACE`; `canChangeEnablement` blocks some cases. — [extensionEnablementService.ts](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/services/extensionManagement/browser/extensionEnablementService.ts)

### Inferences
- Argo: ship first-party plugins in the Server bundle as "system" plugins scanned by the same loader as user plugins; allow disable, not uninstall; enablement per Server and per Project.

### Gaps
- `~/.vscode/extensions/extensions.json` (installed-extension index) not verified this session.

## 7. Dev loop and testing

### Takeaway
F5 launches a second VS Code window ("Extension Development Host") with `--extensionDevelopmentPath` pointing at the source folder; integration tests run inside a real downloaded VS Code via `@vscode/test-electron` / `@vscode/test-cli`.

### Cited Findings
- Tests run inside the "Extension Development Host" with full API access; `@vscode/test-cli` (`vscode-test` script) reads `.vscode-test.js|.mjs|.cjs` with `defineConfig({ files, version, workspaceFolder, extensionDevelopmentPath, mocha })`; arrays of configs with `label`/`--label`. `@vscode/test-electron` `runTests({ extensionDevelopmentPath, extensionTestsPath, launchArgs: ['--disable-extensions'] })` downloads, unzips and launches VS Code. CLI tests fail if another instance of the same build runs; workaround: develop in Insiders, test on Stable. — [Testing Extensions](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- Development-path extensions are scanned separately (`extensionDevelopmentLocationURI`, not validated) and win dedup over installed ones. — [extensionsScannerService.ts](https://github.com/microsoft/vscode/blob/main/src/vs/platform/extensionManagement/common/extensionsScannerService.ts)
- Dev mode on non-stable builds unlocks proposed API automatically. — [extensionsProposedApi.ts](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/services/extensions/common/extensionsProposedApi.ts)

### Inferences
- Argo equivalent: `argo-server --plugin-dev-path <dir>` that loads the folder as a development plugin overriding any installed copy, plus "Restart plugin host" as the reload loop; a test harness that boots a real Server + plugin host with only the plugin under test.

## 8. Tree views as declarative UI; webviews as the escape hatch

### Takeaway
TreeView is the closest analogue to Argo's JSON tree: the extension returns plain `TreeItem` data (label, description, icon, collapsible state, `contextValue`, command) and core renders it; actions attach via static `menus` keyed by `viewItem == <contextValue>`. Webviews are the escape hatch and VS Code's guidelines push hard against them.

### Cited Findings
- `TreeDataProvider`: `getChildren(element?)` (roots when no element), `getTreeItem(element)`, optional `onDidChangeTreeData` to refresh; `collapsibleState` `None | Collapsed | Expanded`; `registerTreeDataProvider(viewId, provider)` or `createTreeView(viewId, { treeDataProvider })` for the `TreeView` object. — [Tree View guide](https://code.visualstudio.com/api/extension-guides/tree-view)
- Item actions: `view/item/context` with `"when": "view == nodeDependencies && viewItem == dependency"` and `"group": "inline"` for inline icons; header actions in `view/title` with `"group": "navigation"`; `viewsWelcome` markdown with `[Label](command:id)` rendered as buttons. — [Tree View guide](https://code.visualstudio.com/api/extension-guides/tree-view)
- Restrictions: "Extensions have no access to the DOM of VS Code UI"; "You cannot write an extension that applies custom CSS to VS Code or adds an HTML element to VS Code UI"; no custom style sheets because DOM/class names are undocumented internals. — [Extension Capabilities overview](https://code.visualstudio.com/api/extension-capabilities/overview)
- Webviews: "should only be used if you absolutely need them"; Do "Only use webviews when absolutely necessary". — [Webview UX guidelines](https://code.visualstudio.com/api/ux-guidelines/webviews)
- Even GHPR, which uses webviews for PR/issue overview, needed proposals `treeItemMarkdownLabel` and `treeViewMarkdownMessage` to get richer tree text — i.e. first-party pushes the declarative surface rather than escaping it. — [GHPR package.json](https://github.com/microsoft/vscode-pull-request-github/blob/main/package.json)

### Inferences
- Argo's JSON-tree-of-primitives is a generalisation of `TreeItem`: data-only nodes, actions referenced by command id, context keys (`contextValue`) to filter menus. Copy `contextValue` + `when` clauses for item menus rather than letting nodes carry arbitrary handlers.

### Gaps
- `TreeView` members (`reveal`, `message`, `badge`, `dragAndDropController`, checkboxes), `resolveTreeItem`, `WebviewViewProvider` and Notebook renderer split were not covered by pages fetched; consult `vscode.d.ts` directly.

## 9. History of moving core into built-ins; GitHub PR extension

### Takeaway
Git moved out of core in 1.11 (March 2017) onto the same public SCM API third parties use; today git, markdown, emmet, npm, references-view, auth providers and even Copilot live under `extensions/`. GHPR picks repos by asking the built-in Git extension's API for repositories and creates one manager per repo, and authenticates via `vscode.authentication.getSession('github', scopes)` from the built-in `github-authentication` provider.

### Cited Findings
- 1.11: "The new Git source control extension is now enabled by default." "This Git integration goes through the same extension points as third-party SCM providers." "The Source Control API is now public, opening up VS Code to new SCM providers." — [VS Code 1.11 release notes](https://code.visualstudio.com/updates/v1_11)
- Git exposes a versioned API to other extensions: copy `src/api/git.d.ts`, call `gitExtension.getAPI(1)`, and declare `extensionDependencies` so `vscode.git` activates first. — [extensions/git/README.md](https://github.com/microsoft/vscode/blob/main/extensions/git/README.md)
- Core also has a `MainThreadGitExtension` proxy in the RPC protocol. — [extHost.protocol.ts](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/api/common/extHost.protocol.ts)
- GHPR repo selection: on activation reads `apiImpl.repositories`, creates `new FolderRepositoryManager(index, context, repository, ...)` per Git repository, sorts repos to match multi-root folder order, listens to `git.onDidOpenRepository`; a `FolderRepositoryManagerResolver` maps URIs to managers. Each manager parses remotes (`parseRepositoryRemotesAsync`), keeps those with a GitHub host, filtered by the `githubPullRequests.remotes` setting; error "{0} has no GitHub remotes". — [extension.ts](https://github.com/microsoft/vscode-pull-request-github/blob/main/src/extension.ts), [folderRepositoryManager.ts](https://github.com/microsoft/vscode-pull-request-github/blob/main/src/github/folderRepositoryManager.ts)
- GHPR auth: `vscode.authentication.getSession(providerId, scopes, options)`; first a silent scope-less lookup to find the preferred account, then tries scope sets in order `['read:user','user:email','repo','workflow','project','read:org']`, `[... 'workflow']`, `['read:user','user:email','repo']` with `{ silent: true }`; remembers last-used scopes under `githubPullRequest.lastUsedScopes` / `...Enterprise`. — [credentials.ts](https://github.com/microsoft/vscode-pull-request-github/blob/main/src/github/credentials.ts)

### Inferences
- Pattern for Argo: core features become plugins only once the API they need is public (the SCM API went public in the same release as Git moved out). Plugins expose versioned APIs to each other via `getAPI(n)` + dependency declaration.
- Auth as a provider plugin (`github-authentication`) consumed through one core `authentication.getSession` call, with silent-first lookup, is directly reusable for Argo's GitHub step.

### Gaps
- Exact dates for markdown, emmet, npm, references-view moving to built-ins not verified. "Our Approach to Extensibility" document not located in this session.
