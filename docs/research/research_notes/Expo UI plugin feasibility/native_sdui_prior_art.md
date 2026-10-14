# Prior art: driving native SwiftUI and Jetpack Compose UI from runtime data

Research date: 2026-10-14. Scope: evidence on whether rendering server-sent / runtime UI trees into SwiftUI and Compose is proven in production, and what goes wrong. Many primary pages were thin (GitHub landing pages, marketing pages); where a question could not be answered from a primary source it is listed under Gaps.

## 1. LiveView Native (SwiftUI and Jetpack Compose clients): mapping, diffs, problems, archive

### Takeaway
LiveView Native (LVN) is the closest direct precedent (server markup tags such as `<VStack>` and `<Text>` turned into SwiftUI and Compose views), but the evidence on its production use is thin and the main repo was archived on 2026-02-10 with no stated reason. The Jetpack client never showed a stable status in the sources found. Treat the archive as a negative signal about the maintenance cost or adoption of a "mirror the whole native toolkit" approach, but the cause is unverified.

### Cited Findings
- The core `live_view_native` repo "was archived by the owner on Feb 10, 2026" and is read-only; the page gives no reason and names no successor. — [GitHub: live_view_native](https://github.com/liveview-native/live_view_native)
- Org page shows only `live_view_native` and `elixirconf_chat_22` as archived among the ten repos listed; `liveview-client-swiftui` (updated Jan 22, 2026), `liveview-client-jetpack` (Dec 12, 2025), `liveview-native-core` (Oct 27, 2025) and `swiftui-modifiers-codegen` (Dec 9, 2025) were not labelled archived. The page lists 10 of 71 repos, and the org also shows forks of htmx and a headless browser, so the org's focus may have shifted (inference, not stated). — [GitHub org: liveview-native](https://github.com/liveview-native)
- README at archive time pinned `0.4.0-rc.1`, i.e. the 0.4 line never left release-candidate in this README. Architecture: a LiveView uses both a web module and platform modules (e.g. a `.SwiftUI` module defining `render/2`); templates use an `~LVN` sigil with native elements like `<VStack>` and `<Text>`; render clauses can match on target platform (e.g. watchOS vs default). — [GitHub: live_view_native](https://github.com/liveview-native/live_view_native)
- Clients listed: SwiftUI (iPhone, iPad, Apple TV, Watch, macOS, Vision Pro), Jetpack Compose ("LiveView Native Jetpack"), and HTML. — [GitHub: live_view_native](https://github.com/liveview-native/live_view_native)
- DockYard's 2024 announcement: native views are represented "in our own markup format alongside a stylesheet system"; the server sends "very small UI diffs over a socket connection to the device", and the client builds native view trees and merges them into the UI framework's primary view tree. The post says navigation performance improvements were still coming in v0.3.1 of the SwiftUI client. — [DockYard: LiveView Native Is Here](https://dockyard.com/blog/2024/09/09/liveview-native-is-here)
- The SwiftUI modifier system is code-generated from SwiftUI itself (a `swiftui-modifiers-codegen` repo exists in the org), which implies tracking Apple's API surface is a continuous task (inference from repo name and org listing). — [GitHub org: liveview-native](https://github.com/liveview-native)
- Jetpack client README: "lets you use Phoenix LiveView to build native Android apps with Jetpack Compose"; Elixir dep `live_view_native_jetpack ~> 0.3.0` (behind the SwiftUI client's `0.4.0-rc` line at the time of the pages fetched); 139 stars, 110 open issues, 163 commits; no maturity statement. — [GitHub: liveview-client-jetpack](https://github.com/liveview-native/liveview-client-jetpack)
- SwiftUI client README: pre-1.0 (`~> 0.4.0-rc.0`); releases/packages sections empty in the snapshot. — [GitHub: liveview-client-swiftui](https://github.com/liveview-native/liveview-client-swiftui)
- Third-party assessment (kommitters, dev.to; opinion, date not verified): "first versions", many SwiftUI markup tags missing, only the iOS client stable, Android "still under development", not production-ready. — [dev.to: kommitters](https://dev.to/kommitters/exploring-the-advantages-and-disadvantages-of-liveview-native-for-mobile-app-development-38lf)
- Elixir Forum thread "Is Liveview Native realistic in 2025?": the poster feels they are "risking a lot"; one reply is "positive there is real-world usage" but gives no examples. — [Elixir Forum](https://elixirforum.com/t/is-liveview-native-realistic-in-2025/70969)
- Searches found no official explanation (blog, issue, forum post) for the archive. — absence of evidence, see Gaps.

### Inferences
- The archive does not by itself prove the technique fails; the SwiftUI and Jetpack client repos stayed un-archived. It does show that a framework mirroring the entire SwiftUI surface (views plus a generated modifier catalogue) needed sustained effort and had low visible adoption.
- For Argo, a small curated primitive set (the @expo/ui subset) avoids LVN's "track every SwiftUI API" burden.
- Jetpack lagging SwiftUI in LVN suggests Compose parity is the harder or less-resourced half; Argo should plan for two renderers with a common minimal vocabulary.

### Gaps
- Why the repo was archived: no primary statement found. Not verified as a funding, adoption or technical decision.
- LVN internals (diff format, node identity/ID scheme, how SwiftUI `ForEach` ids were assigned, documented bugs): the READMEs and blog were high-level; the hexdocs guides and the `liveview-native-core` Rust code were not read.
- Any production deployments of LVN: none found.

## 2. DivKit (Yandex) iOS/Android renderers

### Takeaway
DivKit is a production-grade SDUI system with native renderers on Android, iOS and Web, but the pages found do not say whether iOS uses UIKit or SwiftUI or whether Android uses Views or Compose, and make no quantified performance claims. Its model is a closed, versioned JSON schema with templates, variables, triggers and patches rather than a mapping onto an open-ended toolkit.

### Cited Findings
- DivKit client libraries render on Android, iOS and Web; server-side JSON builders exist in TypeScript, Kotlin and Python. The README does not say which UI toolkit iOS/Android use and makes no performance claims. — [GitHub: divkit/divkit](https://github.com/divkit/divkit)
- Updates: "roll out server-sourced updates to different app versions"; JSON can also be bundled in the client. — [GitHub: divkit/divkit](https://github.com/divkit/divkit)
- Site claims all elements are "implemented natively for each platform"; features include states, animations, variables and triggers, timers, and "patches from server responses" (e.g. infinite gallery); templates reduce response size; can be embedded in individual views, not only whole screens. No benchmarks. — [divkit.tech](https://divkit.tech/en/)
- iOS packages are Swift packages with internal targets `LayoutKit`, `LayoutKitInterface`, `Serialization` (from package registries). This suggests a custom layout layer rather than SwiftUI, but it is not stated in a primary doc. — [CocoaPods: DivKit_LayoutKit](https://cocoapods.org/pods/DivKit_LayoutKit); [Swift Package Registry](https://swiftpackageregistry.com/divkit/divkit-ios)

### Inferences
- The name `LayoutKit` plus a `Serialization` target suggests DivKit iOS has its own layout engine on UIKit, not SwiftUI. Unverified; do not cite as fact.
- DivKit's design keeps client-side state (variables, triggers) inside the schema so the client can react without a round trip; a plugin tree that needs interaction latency below a server round trip needs a similar local-state mechanism.

### Gaps
- UIKit vs SwiftUI on iOS and Views vs Compose on Android: not found in primary docs.
- Performance numbers, memory, frame rates: none published in pages reviewed.
- How patches/updates preserve view identity: not documented in pages reviewed.

## 3. Airbnb Ghost Platform, Nubank, Lyft (SDUI on native)

### Takeaway
Ghost Platform and Nubank prove SDUI at scale, but both are described at the architecture level; no primary source found details SwiftUI or Compose rendering specifics. Nubank's stack is Flutter, not native SwiftUI/Compose. The only SwiftUI/Compose SDUI library found (Nimbus) is archived.

### Cited Findings
- Ghost Platform: sections (independent, reusable building blocks) and screens (arrangement of sections); server sends UI and data together; clients render with no platform-specific UI logic; one GraphQL schema across web/iOS/Android; each platform in its native language (TypeScript, Swift, Kotlin). — [Okoone summary of Airbnb GP](https://www.okoone.com/spark/product-design-research/changing-user-interface-with-airbnbs-ghost-platform/) (secondary source; Airbnb's Medium original returned HTTP 403)
- Search-result summary of Airbnb's post: GP provides web, iOS and Android frameworks in native languages, with a shared library of generic sections, layouts and actions, "many of which are backward compatible". — [Airbnb Engineering on Medium (via search snippet)](https://medium.com/p/842244c5f5)
- Nubank: framework powers "more than half" of the app and 1000+ screens for 100M+ customers on Flutter; stated challenges include runtime processing layer and large payloads; backend DSLs in Clojure and Protobuf contracts. — [Nubank: Server-driven UI framework](https://building.nubank.com/server-driven-ui-framework-at-nubank/) (read via search snippet only); [Very Good Ventures on Nubank](https://www.verygood.ventures/blog/building-for-100m-users-nubanks-flutter-journey)
- Nimbus (ZupIT), an open-source SDUI library for SwiftUI and Jetpack Compose, is archived (archived by owner Jun 3, 2024). — [GitHub: ZupIT/nimbus-swiftui](https://github.com/ZupIT/nimbus-swiftui) (via search snippet; repo page not fetched)
- A Uniform guide reports that using an enum with associated values rather than protocol + `AnyView` preserves SwiftUI's diffing, because `AnyView` disables structural identity. — [Uniform: SDUI with SwiftUI](https://support.uniform.dev/articles/3072572179-server-driven-ui-with-uniform-and-swiftui) (vendor guide; via search snippet)

### Inferences
- The successful large-scale SDUI systems use a closed catalogue of sections/components with versioned schemas, not a free-form mapping onto toolkit views. That matches Argo mapping JSON onto its own curated primitives.
- SDUI libraries targeting exactly SwiftUI + Compose (Nimbus, LVN main repo) have a poor survival record; the sample is small.

### Gaps
- Lyft: nothing found.
- Airbnb SwiftUI/Compose specifics and pitfalls: primary article not retrievable (403); secondary sources lack them.
- Nubank's Compose/SwiftUI use: none; their stack is Flutter.

## 4. Shopify POS UI extensions (remote-dom, native rendering)

### Takeaway
Shopify is the strongest production precedent for third-party (sandboxed, plugin-style) UI trees rendered by native iOS and Android hosts: extension code runs in a sandbox, emits JSON tree updates over a message channel, and native hosts (Kotlin, Swift) rebuild the tree. The public detail on the native rendering step, batching and performance is thin.

### Cited Findings
- Core idea: separate "the code that defines the UI from the code that renders it", communicating via message passing; Shopify built hosts in JavaScript, Kotlin and Swift. — [Shopify Engineering: Remote rendering](https://shopify.engineering/remote-rendering-ui-extensibility)
- `RemoteRoot` in the extension offers a DOM-like API and sends UI updates to the host as JSON messages; the host's `RemoteReceiver` consumes them and rebuilds the component tree; `@remote-ui/rpc` passes functions across `postMessage` (event callbacks) with automatic memory management of retained handlers. — [Shopify Engineering: Remote rendering](https://shopify.engineering/remote-rendering-ui-extensibility)
- Sandbox runtimes: web workers on web, web views on Android, JsCore on iOS; globals restricted (`importScripts` removed, `fetch` limited to specific domains). — [Shopify Engineering: Remote rendering](https://shopify.engineering/remote-rendering-ui-extensibility)
- April 2024: remote-ui renamed Remote DOM using the browser DOM API in the sandbox; a July 2025 update says the DOM-based version had begun rolling out. — [Shopify Engineering: Remote rendering](https://shopify.engineering/remote-rendering-ui-extensibility)
- POS docs: UI is built from web components "built with remote-dom"; extensions "render as native components for faster load times"; extensions are written in Preact; POS 11.0+ lets extensions run offline (network-dependent features excluded). — [Shopify POS UI extensions docs](https://shopify.dev/docs/api/pos-ui-extensions/latest); [Extending Shopify POS](https://shopify.dev/docs/apps/build/pos)
- The engineering post does not explain how native iOS/Android hosts render the received tree, nor batching, latency or pitfalls. — [Shopify Engineering: Remote rendering](https://shopify.engineering/remote-rendering-ui-extensibility)

### Inferences
- The architecture is directly analogous to what Argo would need for plugins: untrusted JS produces a tree; a trusted host owns native rendering and a fixed component catalogue; events return as proxied callbacks.
- The sandbox runtime is a separate JS engine/web view on mobile, so Shopify pays a cross-runtime hop on every event and update; Argo can avoid this only if plugin code runs where the trees are produced (server) or in the RN JS runtime.

### Gaps
- Whether Shopify's iOS host renders to SwiftUI or UIKit, and Android to Compose or Views: not documented in pages found.
- Performance data and known pitfalls for POS extensions: none found.

## 5. Hyperview (React Native): XML to RN components

### Takeaway
Hyperview is a production SDUI framework over React Native (from Instawork) where server HXML is mapped to RN components, with custom elements registrable as RN components. Public performance information is limited to one vendor claim of render-time reductions after an internal pipeline rework, which indicates re-render cost was a real problem in the earlier design.

### Cited Findings
- Two parts: HXML (XML format for screens and interactions) and a React Native client library; the client is embedded as an RN component with an `entrypointUrl` prop, fetching HXML and handling navigation and interactions via further HXML requests; HXML has no scripting, so state and logic stay on the server; custom elements can be registered with custom RN components. — [Hyperview intro docs](https://hyperview.org/docs/guide_introduction); [GitHub: Instawork/hyperview](https://github.com/Instawork/hyperview)
- Aug 2025 post: version 0.94.0 streamlined the rendering pipeline, claiming "up to a 50% reduction in render time and re-renders", aimed at "complex screens with frequent updates"; no benchmarks or methodology given. Also removed external-navigation support and reorganised the public API (`createProps`, `renderElement`, `Parser` from the `hyperview` package). — [Hyperview blog: Out with the old](https://hyperview.org/blog/2025/08/01/Out-with-the-old)
- No Hyperview source found on XML parse cost, list virtualization or caching. — absence, see Gaps.

### Inferences
- Needing a 50% re-render cut after years of production use suggests naive tree-to-component mapping re-renders too much; Argo's mapping should preserve node identity across updates and memoize per-node.
- Hyperview is full-screen replace/patch over HTTP and RN components, not SwiftUI/Compose, so it informs the RN-side mapping and not the native bridge.

### Gaps
- Performance internals, parse cost, virtualization: not found.
- Hyperview issues specific to the New Architecture / Fabric: not found.

## 6. SwiftUI, Compose and React Native bridge pitfalls with dynamic trees

### Takeaway
Both toolkits track identity from position/type plus explicit ids/keys, so a runtime tree renderer must give every node a stable unique id, avoid `AnyView` type erasure and conditional branching that changes identity, and avoid creating unstable parameter instances. Expo UI hosts SwiftUI behind a `Host` boundary built on `UIHostingController`; its docs do not address identity, keys, serialization or performance across the bridge.

### Cited Findings
**SwiftUI (Apple, WWDC21 "Demystify SwiftUI")**
- Identity: "Views that share the same identity represent different states of the same conceptual UI element." Explicit identity (`id:`, `Identifiable`) vs structural identity (type and position). — [Apple: Demystify SwiftUI](https://developer.apple.com/videos/play/wwdc2021/10022/)
- AnyView: "In general, we recommend avoiding AnyViews whenever possible"; it hides the conditional structure SwiftUI needs, and can hurt performance; use `@ViewBuilder`, `if`/`switch` or generics. — [Apple: Demystify SwiftUI](https://developer.apple.com/videos/play/wwdc2021/10022/)
- State loss: state storage is tied to identity: "...whenever the identity changes, the state is replaced." Switching branches of `if/else` gives each branch fresh state; moving the same view between branches resets state. — [Apple: Demystify SwiftUI](https://developer.apple.com/videos/play/wwdc2021/10022/)
- ForEach ids must be stable and unique; random ids (the talk's pet example "flashes" every update), array indices (identity changes on insert/remove) and duplicate keys (views collapse) are named as mistakes. A non-constant range in `ForEach(0..<n)` is an error. — [Apple: Demystify SwiftUI](https://developer.apple.com/videos/play/wwdc2021/10022/)
- Conditional modifiers: branching around a modifier creates two identities; prefer a single view with a value-varying modifier (`opacity(isExpired ? 0.4 : 1)`); inert modifiers can be pruned. — [Apple: Demystify SwiftUI](https://developer.apple.com/videos/play/wwdc2021/10022/)
- Dependencies form a graph; views are value types, so SwiftUI can compare and skip work when inputs are unchanged. — [Apple: Demystify SwiftUI](https://developer.apple.com/videos/play/wwdc2021/10022/)

**Compose (Android docs)**
- Stability: a type is stable if immutable or if Compose can know whether it changed; stable params compare with `equals()`; with Strong skipping (default since Kotlin 2.0.20) unstable params compare by instance `===` and all restartable composables become skippable; without it composables with unstable params always recompose with the parent. — [Android: Stability in Compose](https://developer.android.com/develop/ui/compose/performance/stability)
- `List`, `Set`, `Map` are treated unstable; with strong skipping they skip only if the same reference is passed. A newly allocated instance with identical values still recomposes: "passing a newly allocated `Contact` instance with identical values will still force `ContactDetails` to recompose." Mutating objects in place does not trigger recomposition. — [Android: Stability in Compose](https://developer.android.com/develop/ui/compose/performance/stability)
- Lazy list keys: without keys Compose "recomposes every item on the list" when items move; provide a stable unique key. Defer state reads (lambda modifiers), `derivedStateOf`, `remember` for expensive work; avoid backwards writes (writing state after reading it causes recomposition loops). — [Android: Compose best practices](https://developer.android.com/develop/ui/compose/performance/bestpractices)

**Expo UI / React Native bridge**
- `Host` is "the boundary between React Native (UIKit) and SwiftUI" and "uses UIHostingController to render SwiftUI views in UIKit"; modifiers are passed as arrays from `@expo/ui/swift-ui/modifiers`; some APIs need newer OS/Xcode (`glassEffect` needs Xcode 26+/iOS 26+); some default styling surprises (Button blue by default, Link text colour). — [Expo docs: Expo UI SwiftUI](https://docs.expo.dev/guides/expo-ui-swift-ui/)
- The Expo guide page does not cover one hosting view per Host, props/children serialization, performance, or identity/keys; it points to the Host and "Extending with SwiftUI" pages. — [Expo docs: Expo UI SwiftUI](https://docs.expo.dev/guides/expo-ui-swift-ui/)

### Inferences
- A JSON-tree renderer must derive native identity from a plugin-supplied or deterministically generated node id (never index or random). A tree diff that re-keys nodes will reset SwiftUI `@State` (text-field contents, scroll position, disclosure state) and defeat animations.
- Prefer a fixed set of SwiftUI container types with data-driven props over type-erased `AnyView` wrappers; in Expo UI this means mapping each node type to a specific React component whose children are real RN children, so the native hosting side keeps its own typed structure. (How Expo UI maps RN children to SwiftUI children internally was not verified.)
- On Compose, deserialized JSON produces new instances each update; plain data classes and lists passed down from a freshly parsed tree will bust skipping unless stability config or reference reuse is applied. Reusing unchanged subtrees by reference avoids this, and Strong skipping reduces (not removes) the risk.
- Many small hosting views may be costly on iOS (each `Host` is a hosting controller), so a tree should live in as few Hosts as possible rather than one per leaf. This is an inference from the `UIHostingController` statement; no measurements were found.

### Gaps
- Measured cost of `AnyView` vs concrete types, of many `UIHostingController`s, or of Fabric view-mounting for many small native views: no primary benchmark found.
- React Native New Architecture / Fabric specifics (view flattening, shadow-tree commit cost, many small views): not researched in a primary source within the call budget.
- How @expo/ui serialises children and modifiers and whether it preserves identity under React reconciliation: not documented on pages reviewed; should be checked in the @expo/ui source.
- Compose `key()` semantics for dynamic non-lazy children: only lazy-list keys were covered in the docs reviewed.
