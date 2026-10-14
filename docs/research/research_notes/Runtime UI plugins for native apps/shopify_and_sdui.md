# Sandboxed JS driving host-owned components: Shopify remote-dom and server-driven UI (SDUI)

Research date: 2026-10-14. Sources are primary where marked; secondary sources are flagged. Several primary pages returned HTTP 403 (Airbnb Medium post, Lyft blog), so those claims rest on InfoQ or search summaries and are flagged.

## 1. How Shopify's extension model works (remote-ui to remote-dom, sandbox, host rendering)

### Takeaway
Shopify separates "UI definition" (untrusted extension JS in a sandbox) from "UI rendering" (first-party host) and joins them with message passing. The sandbox builds a tree of allow-listed elements; the host mirrors it into its own native or web components. Extensions get no DOM, no CSS and no arbitrary components. Originally this was `remote-ui` (React reconciler plus JSON tree); since 2024 it is `remote-dom` (real DOM API in the sandbox, mutation records to the host).

### Cited Findings
**Core architecture**
- Extension code is third-party and sandboxed; host code is first-party and in the main app. They communicate only by message passing, so each side can use a different language. Transport is `MessageChannel`. Hosts exist in JavaScript, Kotlin and Swift. — [Shopify Engineering: Remote rendering](https://shopify.engineering/remote-rendering-ui-extensibility) (article is from 2021, with later updates)
- remote-ui layers: `@remote-ui/rpc` (functions callable across `postMessage` via Promise/Proxy, so event callbacks work; handlers are retained and released automatically as components mount and unmount), `RemoteRoot` (DOM-like API that serialises updates as JSON over RPC), `RemoteReceiver` (rebuilds the tree on the host). Shopify's host used a controller that maps remote component types to native React components. — [Shopify Engineering: Remote rendering](https://shopify.engineering/remote-rendering-ui-extensibility)
- Sandbox contract: host calls `load` with an external URL; the extension calls `register` with a callback; host calls `render` with `remoteChannel` (UI transport) and `api` (the host functions the extension may call). Production hardening: some globals removed (e.g. `importScripts`), others replaced by restricted versions (e.g. `fetch` limited to specific domains), and the sandbox script loads from a separate domain. — [Shopify Engineering: Remote rendering](https://shopify.engineering/remote-rendering-ui-extensibility)
- Per-platform sandboxes as of that article: web = web workers; Android = web views; iOS = JavaScriptCore ("JsCore"). This is the 2021-era description; I found no current primary source restating it for POS or the mobile admin app (see Gaps). — [Shopify Engineering: Remote rendering](https://shopify.engineering/remote-rendering-ui-extensibility)
- Stated design goal: extension UI must match Shopify's native look, feel, performance and accessibility. The article does not describe an explicit allow-list; it implies only mapped component types render. — [Shopify Engineering: Remote rendering](https://shopify.engineering/remote-rendering-ui-extensibility)

**remote-dom (current)**
- remote-ui was renamed Remote DOM in April 2024; it uses the full browser DOM API inside the sandbox instead of the DOM-like `RemoteRoot`; the RPC layer works similarly. Shopify began releasing the DOM-based UI extension system in July 2025. — [Shopify Engineering: Remote rendering](https://shopify.engineering/remote-rendering-ui-extensibility)
- Remote DOM "lets you take a tree of DOM elements created in a sandboxed JavaScript environment" and render it in another environment, isolating untrusted code off the main thread while letting it render a controlled set of elements. — [Shopify/remote-dom README](https://github.com/Shopify/remote-dom)
- Sandbox side: `RemoteMutationObserver` (extends `MutationObserver`) observes a root and forwards mutation records, e.g. via `postMessage`. Host side: `DOMRemoteReceiver` applies them with `receiver.connection.mutate(data)`. — [Shopify/remote-dom README](https://github.com/Shopify/remote-dom)
- The receiver's `elements` option is an allow-list of element names, plus per-element attributes, events and methods (e.g. `attributes: ['primary']`, `events: {click: {}}`, `methods: ['focus']`). If omitted, element names are unrestricted. — [Shopify/remote-dom README](https://github.com/Shopify/remote-dom)
- Remote side defines placeholder custom elements extending `RemoteElement` with static `remoteAttributes` / `remoteEvents`; the host defines the real implementation of the same tag (e.g. a `ui-button` with shadow DOM). Properties are not automatically reflected as attributes. — [Shopify/remote-dom README](https://github.com/Shopify/remote-dom)
- Functions cannot cross `postMessage` natively; the README examples use `@quilted/threads` to serialise them (`ThreadIframe` on host, `ThreadNestedWindow` in remote, with a `render(connection)` export). — [Shopify/remote-dom README](https://github.com/Shopify/remote-dom)
- Packages: `@remote-dom/core`, `@remote-dom/preact`, `@remote-dom/react`, `@remote-dom/polyfill` (minimal DOM for Web Workers), `@remote-dom/signals`. Sandboxes shown: hidden iframe and Web Worker. — [Shopify/remote-dom README](https://github.com/Shopify/remote-dom)
- The Shopify engineering post explains the shift: legacy `@shopify/ui-extensions-react` used `react-reconciler` to convert React to remote-ui's serialised protocol; remote-dom "mirrors real DOM nodes from the sandbox to the host", so any DOM-rendering framework (or none) works and no custom reconciler is needed. — [Shopify Engineering: Upgrading Checkout Blocks (July 16, 2026)](https://shopify.engineering/upgrading-checkout-blocks-app-to-polaris-web-components)

**Surfaces and execution**
- Checkout UI extensions run "inside of a Web Worker which doesn't have access to `window` or the DOM", in an isolated sandbox separate from the checkout page and other extensions; no access to payment information or the page's HTML. — [shopify.dev Checkout UI extensions](https://shopify.dev/docs/api/checkout-ui-extensions)
- Docs for Checkout, Admin and POS all state their web components are "native UI elements that follow Shopify's design system", built with remote-dom, with Preact as the default authoring framework. — [Admin](https://shopify.dev/docs/api/admin-extensions), [POS](https://shopify.dev/docs/api/pos-ui-extensions), [Checkout](https://shopify.dev/docs/api/checkout-ui-extensions)
- POS docs: the same web components render as native UI on iOS and Android POS; the 2025-07 API version is the last to support React-based components; later versions use web components. — [POS UI extensions (search summary of shopify.dev pages)](https://shopify.dev/docs/api/pos-ui-extensions/2025-07/ui-components); [POS UI extensions](https://shopify.dev/docs/api/pos-ui-extensions)
- A Shopify Partners article describes POS extension code being translated into native app code integrated into the POS experience (marketing-level, secondary). — [Shopify Partners blog](https://www.shopify.com/partners/blog/pos-ui-extensions)

**Component and styling limits**
- Component CSS cannot be changed or overridden; custom CSS has no effect. Appearance is controlled only through properties (`padding`, `background`, `border`, `tone`, `color`, `variant`). Components inherit the merchant's brand settings. Extensions use Shopify's custom elements (e.g. `s-banner`), not `div`/`script`. — [shopify.dev Using Polaris web components](https://shopify.dev/docs/api/polaris/using-polaris-web-components)
- Icon sets differ by surface: App Home and Admin support the full icon set; Checkout, Customer accounts and POS a smaller subset. — [shopify.dev Using Polaris web components](https://shopify.dev/docs/api/polaris/using-polaris-web-components)
- Each surface has its own component reference (checkout uses `s-stack`, `s-text`, `s-button`; POS uses `s-tile`, `s-pos-block`, `s-box`; admin uses `s-admin-block`, `s-admin-action`). — [Checkout](https://shopify.dev/docs/api/checkout-ui-extensions), [POS](https://shopify.dev/docs/api/pos-ui-extensions), [Admin](https://shopify.dev/docs/api/admin-extensions)
- Real-world gaps found in migration: `textAlign` removed from Paragraph/Heading (re-exposed as `textAlignment` after a request); `s-checkbox` accepted only plain string labels until a label slot (only `s-text`/`s-link` allowed) was added; Preact `useId()` produced duplicate IDs across extension instances, breaking `commandFor` overlay wiring. — [Shopify Engineering: Upgrading Checkout Blocks](https://shopify.engineering/upgrading-checkout-blocks-app-to-polaris-web-components)

**Targets / extension points**
- Checkout: block (merchant-placed in the checkout editor, up to three extensions per block location), runnable (no UI, returns data, e.g. on address input), static (fixed location). — [Checkout](https://shopify.dev/docs/api/checkout-ui-extensions)
- Admin: six target types: action, selection action, block, configuration, print action, runnable. Block targets must be added and pinned by merchants. — [Admin](https://shopify.dev/docs/api/admin-extensions)
- POS: tile (home screen grid), action (menu items and full-screen modals), block (inline in native screens). Targets are declared in `shopify.extension.toml` (`target` + `module`). — [POS](https://shopify.dev/docs/api/pos-ui-extensions)

**Actions, events and data round trip**
- Each extension gets a global `shopify` object. Admin: `shopify.data` (context), `shopify.query()` (GraphQL Admin API), `shopify.navigation.navigate()`, `shopify.auth.idToken()`. POS: `shopify.storage`, `shopify.toast`, `shopify.action.presentModal()`. — [Admin](https://shopify.dev/docs/api/admin-extensions), [POS](https://shopify.dev/docs/api/pos-ui-extensions)
- `fetch()` to the app's own domain automatically gets an OpenID Connect ID token in `Authorization`; relative URLs resolve against `app_url`. Cross-domain needs a manual token and CORS for `https://extensions.shopifycdn.com`. Direct Admin GraphQL via `fetch('shopify:admin/api/graphql.json')` skips the app backend; scopes declared in TOML. — [Admin](https://shopify.dev/docs/api/admin-extensions)
- POS 10.6.0+ (API 2025-07+) has the same app-auth and direct-API patterns; offline mode (`runs_offline = true`, POS 11.0+, CLI 3.92.0+) supports storage, toast, camera, scanner etc. but not app auth or direct API. — [POS](https://shopify.dev/docs/api/pos-ui-extensions)
- Credentials must stay on the app server, not in extension code. — [POS](https://shopify.dev/docs/api/pos-ui-extensions)

**Size, performance, versioning**
- Compiled bundle limit: 64 KB (128 KB for full-page customer-account extensions), enforced at deploy. — [Admin](https://shopify.dev/docs/api/admin-extensions), [POS](https://shopify.dev/docs/api/pos-ui-extensions), [Checkout](https://shopify.dev/docs/api/checkout-ui-extensions)
- 2026-01 CLI enforces a 64 KB gzip budget; Checkout Blocks bundles were ~100-112 KB gzipped before migration. Dropping `react-reconciler` (~89 KB) via Preact was the largest saving; transferred bundle sizes fell 40-85%; extension load time P50 -8%, P90 -7%. — [Shopify Engineering: Upgrading Checkout Blocks](https://shopify.engineering/upgrading-checkout-blocks-app-to-polaris-web-components), [InfoQ (Oct 9, 2026)](https://www.infoq.com/news/2026/10/shopify-web-components)
- Rate limiting: after an extension is rate limited it cannot make further changes during the buyer's session (checkout). Extension names 5-30 chars; max 20 settings per definition. — [Checkout](https://shopify.dev/docs/api/checkout-ui-extensions)
- Versioning: dated `api_version` (e.g. 2026-07 in examples); each stable version supported at least 12 months; CLI blocks deploys targeting older versions. Since Oct 1, 2026, deploys including extensions earlier than 2026-01 are blocked (Checkout/Customer Account). — [Checkout](https://shopify.dev/docs/api/checkout-ui-extensions), [Shopify Engineering: Upgrading Checkout Blocks](https://shopify.engineering/upgrading-checkout-blocks-app-to-polaris-web-components)
- Shopify hosts only the extension code, not the app backend; `shopify app dev` previews with live reload; `@shopify/ui-extensions-tester` for unit tests from API 2026-04. — [Admin](https://shopify.dev/docs/api/admin-extensions)

### Inferences
- The transferable pattern is: sandbox builds a tree of allow-listed element names with allow-listed attributes/events; host maps each name to its own component; callbacks are RPC proxies. The allow-list is what makes "look native" and "stay safe" the same mechanism.
- Message-passing-only design is what lets Shopify implement hosts in Kotlin and Swift, not just JS. For Argo, where the plugin runs in a Node Server and the host is a React Native client, the transport would be the existing server connection instead of `postMessage`; the remote-dom mutation record format is transport-agnostic (the README shows `postMessage`/`@quilted/threads`, but the receiver just needs `mutate(data)`).
- The 64 KB bundle cap and no-CSS rule are deliberate constraints that keep extensions from becoming mini-apps; they are policy choices, not technical necessities.

### Gaps
- No primary source found for how POS (iOS/Android native apps) executes extension JS today (engine, Hermes/JSC/WebView) or how it maps remote-dom elements to SwiftUI/Compose/React Native. The 2021 article gives JsCore (iOS) / web views (Android); not confirmed for the web-components era.
- No source found on Shopify mobile admin app rendering of Admin UI extensions; the Admin docs page explicitly does not cover it.
- No documentation found on remote-dom wire format details (mutation record schema) beyond README; not read the source.
- remote-ui GitHub repo page was not retrievable as intended (fetch returned the remote-dom page); its deprecation status beyond the rename in the Shopify article is unverified.

## 2. Polaris web components / remote-dom move in 2025-2026

### Takeaway
Yes. API 2025-10 made Preact plus `s-*` Polaris web components the default across UI extension surfaces; React (via remote-ui reconciler) stopped at 2025-07. Enforcement landed Oct 1, 2026 (deploys with versions earlier than 2026-01 are blocked for Checkout/Customer Account). Complaints centre on missing components and an unpinned CDN script.

### Cited Findings
- All API versions 2025-10 and later use Polaris web components by default; the broader Preact + web-component move landed with 2025-10 in late 2025. — [InfoQ (Oct 9, 2026)](https://www.infoq.com/news/2026/10/shopify-web-components), search summary of [Shopify community](https://community.shopify.dev/t/what-happens-to-existing-extensions-that-arent-migrated-to-preact-web-components-and-api-2025-10-and-beyond/37642)
- Shopify moved Checkout Blocks (five extensions; ~one-third of customized checkouts) from React + legacy Remote UI (API 2025-07) to remote-dom + Preact + Polaris web components (2026-01); the post says Shopify is moving its whole UI extension surface to this stack. — [Shopify Engineering (July 16, 2026)](https://shopify.engineering/upgrading-checkout-blocks-app-to-polaris-web-components), [InfoQ](https://www.infoq.com/news/2026/10/shopify-web-components)
- `s-*` components load from Shopify's CDN. — [InfoQ](https://www.infoq.com/news/2026/10/shopify-web-components)
- Community reception: one forum developer called the unversioned CDN script a "nightmare for stability" with no way to pin a version; a Reddit thread called the new components "incomplete" (e.g. no Index Table); Hacker News commenters welcomed no Shadow DOM. — [InfoQ](https://www.infoq.com/news/2026/10/shopify-web-components) (secondary reporting of community posts)
- Shopify published migration guides (60+ component-specific pages) and an AI toolkit for upgrading. — [shopify.dev changelog](https://shopify.dev/changelog/polaris-web-components-migration-guides-now-available-for-checkout-and-customer-account-ui-extensions), [AI toolkit changelog](https://shopify.dev/changelog/shopify-ai-toolkit-for-upgrading-extensions-to-polaris-web-components)
- A forum post asks whether unmigrated extensions keep working; no official answer found. — [Shopify community](https://community.shopify.dev/t/what-happens-to-existing-extensions-that-arent-migrated-to-preact-web-components-and-api-2025-10-and-beyond/37642)

### Inferences
- Shopify's retreat from a custom React reconciler to a framework-agnostic custom-element vocabulary suggests the stable contract should be the element vocabulary (names, attributes, events, slots), not any framework.
- Breaking the vocabulary has real migration cost (forced deadline, 12-month window), so a plugin system needs an explicit dated or numbered API version from day one.

### Gaps
- Exact current status of the Admin and POS surfaces vs checkout migration deadlines not confirmed beyond docs saying web components are the current model.
- Reddit/HN/forum claims are only seen via InfoQ; not independently verified.

## 3. Shopify and Apple's guidelines on downloaded code

### Takeaway
Nothing documented by Shopify on this. Apple's text allows downloaded "HTML5 and JavaScript mini apps ... plug-ins" under guideline 4.7 with conditions, while 2.5.2 forbids downloaded code that changes app features. Any reconciliation by Shopify is inference.

### Cited Findings
- Guideline 2.5.2: apps may not "download, install, or execute code which introduces or changes features or functionality of the app", with a narrow educational/developer-tool carve-out. — [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Guideline 4.7 permits "HTML5 and JavaScript mini apps and mini games, streaming games, chatbots, and plug-ins" not embedded in the binary, and the developer is responsible for them. Conditions: 4.7.1 follow privacy rules, filter objectionable material, report and block mechanisms, and Guideline 3.1 for digital goods; 4.7.2 the app "may not extend or expose native platform APIs or technologies to the software without prior permission from Apple"; 4.7.3 no sharing of data or privacy permissions with individual software without explicit user consent each time; 4.7.4 provide an index of software and metadata including universal links to all software; 4.7.5 age-rating identification and restriction. — [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Shopify's sandbox design restricts extensions to message-passing APIs and removes/replaces globals such as `importScripts` and `fetch`. — [Shopify Engineering: Remote rendering](https://shopify.engineering/remote-rendering-ui-extensibility)

### Inferences
- Shopify has not (in what I found) said how it squares this with Apple. The architecture fits the spirit of 4.7.2: extensions get no native APIs, only an explicit host API (`shopify.*`) and allow-listed UI elements. This is my inference, not a Shopify statement.
- For Argo: plugin code running on the user's own local Node Server (not downloaded into the iOS app) means the iOS/macOS client only receives data (a UI tree), not code. That sits far from 2.5.2 and 4.7, though App Review's stance on a client that renders arbitrary server-defined UI is not documented here; see SDUI section for precedent (Airbnb, Lyft, Nubank ship SDUI in the App Store).

### Gaps
- No Shopify, Apple or third-party-verified statement on how Shopify POS / mobile admin apps are reviewed for running third-party extension JS. Guidelines 3.3.x quotes not retrieved (page text truncated).
- Secondary guides on 2.5.2 (e.g. ptkd.com) were seen only as search summaries and not relied on.

## 4. Server-driven UI at Airbnb, Lyft, DoorDash, Nubank (schema, versioning, fallback, caching, native feel)

### Takeaway
Production SDUI systems share a shape: a server response made of screens, sections/components and actions, rendered by native frameworks on each platform, with component vocabulary owned by the client. Public detail on unknown-component fallback, versioning and caching is thin; most companies only describe it abstractly.

### Cited Findings
**Airbnb Ghost Platform (2021)**
- Ghost Platform (GP) sends data plus its UI representation to web, iOS and Android from one backend response that controls layout, sections, data and actions; includes native frameworks for each platform with a shared set of sections, layouts and actions. — [InfoQ (July 2021)](https://www.infoq.com/news/2021/07/airbnb-server-driven-ui/) (summarising Ryan Brooks' Airbnb Tech Blog post; Medium original returned 403)
- Three core types: **Sections** (independent groups of related UI components, e.g. `HeroSection`, `TitleSection`, each wrapped in a `SectionContainer` whose `SectionComponentType` lets the same section render differently by context), **Screens** (a `ScreenContainer` sets properties such as popup vs sheet, and `LayoutsPerFormFactor`, e.g. `SingleColumnLayout` with `nav`, `main`, `floatingFooter` slots), **Actions** (e.g. `onTitleClickAction`). — [InfoQ](https://www.infoq.com/news/2021/07/airbnb-server-driven-ui/)
- Data layer: Viaduct, a GraphQL-based data-service mesh providing strongly typed models across platforms. — [InfoQ](https://www.infoq.com/news/2021/07/airbnb-server-driven-ui/)
- The InfoQ summary does not discuss versioning; I found no source on Airbnb's unknown-section fallback or minimum-client handling. — [InfoQ](https://www.infoq.com/news/2021/07/airbnb-server-driven-ui/); search results otherwise returned only generic SDUI articles.

**Lyft**
- Lyft Bikes and Scooters first used "Server Supplemented UI" (server configures small parts, client keeps overall layout) before moving to SDUI because client-side complexity had become hard for mobile engineers to keep up with. — [Lyft Engineering](https://eng.lyft.com/the-journey-to-server-driven-ui-at-lyft-bikes-and-scooters-c19264a0378e) (page returned 403; claims come from search-result snippets only, treat as unverified detail)

**Nubank (Backend Driven Content, BDC)**
- Server supplies "information about how to build, display the UI and react to user interactions"; built from "building blocks" assembled into screens; uses Flutter components; platform written in Clojure; complies with Nu's Design System for consistency; ~70% of new screens/flows use BDC and 43% of the app (as stated in that article). — [Nubank engineering blog](https://building.nu.com/server-driven-ui-framework-at-nubank/)
- QCon London 2025 talk (Rafael Ring): framework powers more than half the app, 1,000+ screens, 100M+ customers, 3,000+ mobile engineers; the abstract names the core problem as users who do not update and multiple app versions running at once, but gives no versioning strategy. — [QCon London 2025](https://qconlondon.com/presentation/apr2025/mobile-server-driven-ui-scale)

**DoorDash**
- Has a dedicated "Server Driven UI Platform" team building Web, Android and iOS SDK pieces (job listing). A DoorDash careers/engineering post describes a component library that maps a backend response to text nodes for a Dasher WebView, with a future page-layout screen builder envisioned. No dedicated DoorDash SDUI engineering post was found. — [DoorDash careers](https://careers.doordash.com/?p=10258), [job listing](https://www.mediabistro.com/jobs/1710985982) (secondary)

**Not found:** Spotify and Yelp SDUI write-ups were not researched/found within the call budget.

### Inferences
- Common vocabulary: screen (layout, container behaviour) / section or component (typed, owned by the client) / action (typed, handled by the client). Airbnb's "container" wrapper per section is the extension point for context-specific rendering.
- The client owning the component and action registry is what preserves native look and feel; the server only chooses and parameterises.
- Version skew (stale clients) is the recognised hard problem (Nubank abstract), but no public specific recipe was found. For Argo, plugin and app are both in the user's control and the Server version can be matched to the client, which eases this, but a capability/version handshake is the obvious design.

### Gaps
- Unknown-component fallback, schema versioning, and caching strategies for Airbnb, Lyft, DoorDash, Nubank, Spotify, Yelp: not found in accessible primary sources. Airbnb Medium post and Lyft post blocked (403).
- Airbnb's current (2026) state of Ghost Platform not researched.

## 5. Open-source SDUI frameworks for React Native and Expo RSC

### Takeaway
Two relevant routes exist: (a) json-render (Vercel Labs), a catalog-constrained JSON spec with a React Native renderer; (b) React Server Components in Expo Router, which can stream a UI tree from a server to native but is explicitly experimental and has constraints that matter for a plugin system.

### Cited Findings
**json-render (Vercel Labs)**
- Generative-UI framework: AI can only use components defined in a catalog. `defineCatalog` declares components with Zod prop schemas and descriptions plus allowed actions; `catalog.prompt()` generates the LLM system prompt; `defineRegistry` binds implementations; `Renderer` renders a flat JSON spec (root key + elements map). — [vercel-labs/json-render](https://github.com/vercel-labs/json-render)
- `@json-render/react-native` ships 25+ standard components; supports data binding via `$state`, `$cond`, `$template`, `$computed`, a built-in `setState` action, `watch`, and streaming via SpecStream (`createSpecStreamCompiler`). Same catalog can drive many renderers (React, Vue, Svelte, Solid, RN, Ink, PDF, email, etc.). Apache-2.0; ~18.7k stars at fetch time; some parts experimental. — [vercel-labs/json-render](https://github.com/vercel-labs/json-render)
- The README has no dedicated security section; guardrails are conceptual (output constrained to the catalog schema). — [vercel-labs/json-render](https://github.com/vercel-labs/json-render)

**Expo Router + React Server Components**
- RSC in Expo Router is "experimentally available", beta, "subject to breaking changes"; works on all platforms including native; requires the New Architecture. — [Expo docs: Server Components](https://docs.expo.dev/guides/server-components/)
- Server Functions render components on the server and return an "RSC payload (a custom JSON-like format maintained by the React team)" streamed to the client; so it can deliver UI from a server to a native client. Routes with `render: 'static'` are embedded in the native binary at build time. — [Expo docs](https://docs.expo.dev/guides/server-components/)
- Native limits: `StyleSheet.create` and `Platform.OS` unsupported in server components (use plain style objects and `process.env.EXPO_OS`); Server Functions calling other Server Functions don't work on Hermes. Other limits: EAS Update doesn't work with Server Components yet; production deployment is limited and not recommended; full RSC mode has no stack routing and `Stack`/`Tabs`/`Drawer` don't support Server Components; "use dom" components can't use Server Functions in production. Setup needs `react-server-dom-webpack` and `experiments.reactServerFunctions`. — [Expo docs](https://docs.expo.dev/guides/server-components/)

### Inferences
- RSC delivers React element trees whose component references are resolved on the client against the client's own module graph, so in principle it fits "server describes, client's own primitives render". But the server code there is trusted first-party app code compiled with the app bundle, not a sandbox for untrusted plugin code; it also ties the server to the Expo bundler/Metro build. Treat it as a UI transport precedent, not a plugin sandbox.
- json-render is closest to the "allow-listed catalog + JSON spec" model, but it is designed around LLM output rather than a stateful, event-driven, long-lived plugin session; callbacks/state live in the spec's declarative expressions (no sandboxed JS driving updates).

### Gaps
- Not examined: Stac/Mirai-style RN frameworks, Nativeblocks, other RN SDUI libraries; maturity of json-render's RN renderer not tested.
- Expo RSC min SDK version not stated on the docs page; Expo docs page is dated by fetch only. How RSC payload handles client-references on native (security model) not read.
