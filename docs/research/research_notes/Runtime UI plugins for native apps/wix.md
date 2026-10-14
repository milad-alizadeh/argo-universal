# Wix extensibility architecture (apps, dashboard, mobile) for runtime plugin design

Method note: most claims are quoted or paraphrased from Wix's own docs (`dev.wix.com/docs`, fetched via the portal's `llms-full.txt` / `.md` pages on 2026-10-14) and Wix Help Center pages. Where a page could not be fetched directly (Medium returned HTTP 403; the dev-docs "Appear on the Wix Owner App" page returned 404 for `.md` and rendered client-side), the claim is marked "(via search summary)" and should be re-verified. "Inferred" is always labelled.

## 1. Which Wix mobile apps exist, and how are they customised per site without new binaries? Is it server-driven UI?

### Takeaway
Wix ships a small family of fixed mobile binaries: the owner/management apps (Wix app, Wix Studio app), three shared member apps (Spaces by Wix, Fit by Wix, Dine by Wix), and a per-business "Branded App" built in a no-code App Builder. Site owners configure branding and content from the dashboard; the docs describe design (look) changes to a Branded App as needing store resubmission, while layout/content changes go live automatically. Wix does not document the mechanism as "server-driven UI" anywhere I found; that is an inference from behaviour.

### Cited Findings
- Wix's help centre lists: Wix app and Wix Studio app (owner management apps, "the app you need depends on if you are using Wix or Wix Studio"), Spaces by Wix (free member app), Fit by Wix (free member app for fitness businesses), and Branded App (own native app, own branding, no site required, needs a "Mobile App Premium plan" to publish) — [Wix Help: The Wix mobile apps, an overview](https://support.wix.com/en/article/the-wix-mobile-apps-an-overview)
- A second help result states there are "3 member apps": Spaces, Fit by Wix and Dine by Wix (Dine for restaurants), and that member apps are free — [Wix Help: mobile apps for your customers](https://support.wix.com/en/mobile-apps-for-your-customers) (via search summary; the overview article above does not mention Dine)
- Owner app (Wix app) function: marketing (social, email, push), stores, bookings, analytics, live chat, light site editing ("for complex changes, the page recommends desktop"), and "adding Wix apps directly to your site from your phone" (examples listed are Wix first-party apps: Bookings, Events, Groups, Blog, Pricing Plans, Online Programs, Stores, Members) — [Wix Help: About the Wix app](https://support.wix.com/en/article/about-the-wix-owner-app)
- Per-site configuration of the shared member app is limited to look-and-feel and growth settings in the dashboard: colours, cover image, logo, invite banner, download link, invitation emails/campaigns (Settings > Communications > Mobile app for members) — [Wix Help: Customizing your site for your members](https://support.wix.com/en/article/spaces-by-wix-customizing-your-site-for-your-members). That page does not mention tabs/app lists or third-party apps.
- Branded App: no-code builder; "Design changes require resubmission ... Layout and content changes can be made at any time and apply to the live app automatically"; initial launch requires connecting Apple/Google developer accounts and store approval; app "receives regular updates to stay compatible with the latest iOS and Android versions" — [Wix Help: Building your own native mobile app with Wix](https://support.wix.com/en/article/building-your-own-native-mobile-app-with-wix) (via fetch summary)
- Branded App can embed web content via a WebView element (available only in own mobile app) — [Wix Help: Adding a WebView to your own app](https://support.wix.com/en/article/wix-mobile-apps-adding-a-webview-to-your-own-app)
- In the Wix platform data model a Branded App is a first-class project type: `BRANDED_APP` is "a native mobile app built with the Wix branded app builder"; the Projects API can create "standard Wix sites, Headless backends, branded mobile apps, and Wix Vibe sites" — [Wix Projects API](https://dev.wix.com/docs/api-reference/account-level/sites/project-v1/introduction.md)
- Wix's "Wix Owner mobile app" is a distinct first-party product that Wix's own docs call "the companion Wix Owner app (available from the Google Play and Apple App Store)" — [About Notification Extensions](https://dev.wix.com/docs/build-apps/develop-your-app/extensions/backend-extensions/notifications/about-notification-extensions.md)

### Inferences
- Inferred: the Branded App is rendered from a server-held app definition (screens/layout/content) interpreted by a fixed native runtime, because layout/content edits apply "automatically" while only "design" changes need resubmission. The design-changes-need-resubmission rule suggests that theme/branding assets (icon, splash, colours?) are baked into the store binary. Wix never calls this "server-driven UI" in any source I found.
- Inferred: member apps (Spaces/Fit/Dine) are one binary per vertical serving many sites, with per-site config (colours, logo, cover, enabled Wix business apps) fetched at runtime. The Help Center describes only the config surface, not the mechanism.
- Inferred: because the Branded App is a first-class project with a storefront-style "screens" editor and a Velo-flavoured widget API (section 2), Wix treats the mobile surface as a constrained, Wix-owned component vocabulary rather than an open plugin surface.

### Gaps
- No Wix source found that documents server-driven UI / over-the-air screen definitions for any Wix mobile app. Searches for "server driven", "code push", "over the air" with Wix engineering returned nothing relevant.
- Could not confirm what Dine by Wix does vs Spaces in Wix's own words beyond the one search-summary line; the overview page omits it.
- The App Builder help page ("about-the-app-builder") returned 404; the exact list of Branded App screen/widget types was not obtained.
- Whether "design changes" in the Branded App article means theme, icon, or native feature set was not clarified by the source.

## 2. Wix App Market extension types, and which appear in Wix's mobile apps (native vs web view)

### Takeaway
Wix apps are composed of many "extensions": frontend (site, dashboard, editor) and backend (service plugins, schema plugins, notifications, automations, APIs, events, etc.). Almost all frontend UI extensions are web content hosted in iframes/custom elements. On mobile, the only documented surfaces for third-party apps are (a) notifications (push + notification centre in the Owner app) and (b) a beta "light" App Market in the Owner app that opens the app's mobile-optimised dashboard in a React Native WebView. Custom widgets in Branded Apps (Velo `wix-mobile`) exist only as Developer Preview, not available to all users.

### Cited Findings
- Extension taxonomy (frontend): Site pages, Site widgets (draggable), Editor React Components (Harmony), Site plugins (placed in slots of Wix-built apps' widgets), Embedded scripts, Dashboard pages, Dashboard modals, Dashboard plugins (widgets in predefined slots of first-party app dashboard pages), Dashboard menu plugins — [About Extensions](https://dev.wix.com/docs/build-apps/develop-your-app/extensions/about-extensions)
- Extension taxonomy (backend): Data collections, Schema plugins, Service plugins, Notifications, Web method extensions, Automations, APIs, Events, and App Tools (expose app functionality as tools that Wix's AI assistant "Aria" can run in the site dashboard) — [About Extensions](https://dev.wix.com/docs/build-apps/develop-your-app/extensions/about-extensions)
- Catalogue with build options: Dashboard page = Blocks, Wix CLI, or self-managed iframe; Dashboard plugin and Dashboard modal = Wix CLI or self-managed iframe; Dashboard menu plugin = Wix CLI or app-dashboard config; Site widget/plugin = Blocks, CLI custom element, or self-managed custom element; Editor Add-on = self-managed iframe — [How Apps Extend Wix](https://dev.wix.com/docs/build-apps/get-started/overview/how-apps-extend-wix.md)
- Wix Vibe and Headless projects "can only use apps that only have dashboard extensions" (editor-based Wix Editor/Studio sites can use any type) — [How Apps Extend Wix](https://dev.wix.com/docs/build-apps/get-started/overview/how-apps-extend-wix.md)
- Harmony (new editor) support matrix: dashboard and backend extensions supported; Blocks site widgets/plugins and legacy custom elements not supported; Editor React Components only in Harmony — [About Wix Harmony and Apps](https://dev.wix.com/docs/build-apps/get-started/overview/about-wix-harmony-and-apps.md)
- Dashboard plugins: "Slot" = placeholder declared by a Wix-built app; plugin and slot share a "Plugin API" contract; slot passes data (e.g. an ID) which the plugin reads via `dashboard.observeState()`; plugin takes full slot width, height as the plugin's loaded height unless the slot sets a limit; "Not all apps built by Wix include pre-defined slots" — [About Dashboard Plugin Extensions](https://dev.wix.com/docs/build-apps/develop-your-app/extensions/dashboard-extensions/dashboard-plugins/about-dashboard-plugin-extensions.md)
- Dashboard menu plugin: adds a menu item in a predefined slot of a Wix-built dashboard page's menu; clicking it opens another dashboard page or a dashboard modal — same page as above
- Dashboard SDK exposes `page.getLayout()` returning `'mobile' | 'desktop'`, "which dashboard your extension was loaded into", reflecting host environment not screen size; set once on load — [page.getLayout()](https://dev.wix.com/docs/sdk/host-modules/dashboard/page/get-layout.md). This implies a distinct "mobile dashboard" host in which dashboard extensions can load.
- Owner-app beta for third-party apps ("Appear on the Wix Owner App", via search summaries of the page; direct fetch failed): Wix "is testing a light version of the App Market on the Owner app", letting users "find apps that support mobile, install them, and open their dashboards from their phone". Requirements: app must have a dashboard component and no visual Editor components (widgets/pages); every dashboard screen optimised for mobile; on iOS the upgrade/premium flow must not appear. Technical: the dashboard endpoint loads in a **React Native WebView**; links opening a new tab/window leave the app; "The Wix SDK does not work within the Wix Owner App" (app must work without it); Android billing purchase flows only work on redirect not new window; no way to test before production — [Appear on the Wix Owner App](https://dev.wix.com/docs/build-apps/launch-your-app/marketing/wix-owner-app) (page itself returned 404/empty to my fetch; claims come from two independent WebSearch summaries that agree)
- Notifications are the one backend extension explicitly delivered to the mobile app: apps can send "App dashboard notifications" and "App push notifications" to the Wix Owner app; "Notification extensions must be self-managed" — [About Notification Extensions](https://dev.wix.com/docs/build-apps/develop-your-app/extensions/backend-extensions/notifications/about-notification-extensions.md)
- Branded Apps: Velo `wix-mobile` (`wixMobile`, `appFramework`: action sheets, alert modals, toasts) and `wix-navigate-mobile` APIs plus mobile `$w` elements (mobile button, container, image, picker, repeater, switch, text, text input, video player, date picker) are "only relevant for custom widgets in Branded Apps. Custom widgets are not yet available to all users. ... Developer Preview and ... subject to change" — [Wix Mobile API intro](https://dev.wix.com/docs/sdk/frontend-modules/mobile/introduction.md), [App Framework](https://dev.wix.com/docs/velo/apis/wix-mobile/app-framework/introduction.md)
- Mobile Velo apps use stack navigation ("screens are arranged in a stack ... closeScreen()") — [Wix Navigate Mobile API](https://dev.wix.com/docs/velo/apis/wix-navigate-mobile/introduction.md)
- Wix Storage Mobile API: "This API is only relevant for storage in native mobile apps" with two storage types — [Storage Mobile](https://dev.wix.com/docs/velo/apis/wix-storage-mobile/introduction.md)
- Some Velo APIs note they are "supported in sites and mobile apps" (e.g. at full-docs line for a `wix-` module), showing a shared runtime between web and Branded App Velo code — [Wix full docs index](https://dev.wix.com/docs/llms-full.txt)
- Headless is the other route to a custom mobile app: Wix publishes a React Native + Expo template (`wix/headless-templates`) that uses Wix as a backend — [React Native mobile eCommerce template](https://dev.wix.com/docs/go-headless/tutorials-templates/templates/mobile/react-native-template.md)

### Inferences
- Inferred: third-party UI inside Wix's own native Owner app is deliberately web-only (a WebView of a hosted URL); there is no documented native-component extension API for third parties in the Owner app. The only native-ish surfaces are notifications (data, not UI).
- Inferred: the dashboard plugin / slot / `observeState` model is a "contribution point with typed props" pattern: host declares named slots with a data contract; the extension renders into an iframe sized by the host. Slots are limited to first-party Wix apps' pages, not arbitrary UI.
- Inferred: the `getLayout()` mobile value and the Owner-app doc "SDK does not work" are in tension. Either the docs lag, the SDK gained a mobile host after the Owner-app page was written, or the Owner-app doc page is out of date. Flag for the report: do not depend on either claim without testing.

### Gaps
- No documentation found for Dine by Wix or Spaces accepting third-party extension UI. The member apps appear closed to third-party apps (member-side page content not documented as extensible).
- The date and current status of the Owner-app "light App Market" beta could not be verified; Wix's own page was not retrievable.
- Which dashboard plugin slots, if any, render in the mobile dashboard was not documented.

## 3. Wix Blocks, Velo, Wix CLI, Wix Design System: UI consistency enforcement

### Takeaway
Wix offers three build frameworks (Wix CLI, Wix Blocks, self-managed). Wix Design System (WDS) is the recommended React component library for dashboard UI, but the docs word it as "consider using", not as a hard requirement; consistency is steered by tooling (templates, providers, Patterns) and design docs rather than documented runtime enforcement. I did not find a documented review rule that rejects non-WDS dashboards (not searched exhaustively).

### Cited Findings
- Frameworks: Wix CLI (React/Node.js, deployed automatically to Wix cloud), Self-managed (own stack/hosting; you give Wix URLs for iframes/webhooks/JS bundles), Wix Blocks (visual editor with Velo, hosted on Wix cloud) — [Wix's development frameworks](https://dev.wix.com/docs/build-apps/get-started/overview/wix-s-development-frameworks.md)
- Dashboard page docs: "When it comes to designing the UI, consider using the Wix Design System ... to make your app appear and feel like a native Wix app" — [About Dashboard Page Extensions](https://dev.wix.com/docs/build-apps/develop-your-app/extensions/dashboard-extensions/dashboard-pages/about-dashboard-page-extensions.md); same wording for plugins — [About Dashboard Plugin Extensions](https://dev.wix.com/docs/build-apps/develop-your-app/extensions/dashboard-extensions/dashboard-plugins/about-dashboard-plugin-extensions.md)
- WDS contents: React core components, advanced "Patterns" library (collection pages with toolbar/filters/bulk actions), Figma kit, Wix colour palettes, "Madefor" font, 1,500+ icons; used "when working with Wix CLI or building self-managed extensions ... to create dashboard pages and panels" — [About the Wix Design System](https://dev.wix.com/docs/build-apps/develop-your-app/design/about-the-wix-design-system.md)
- Tutorials wrap pages in `WixDesignSystemProvider features={{ newColorsBranding: true }}` (theme provider pattern) — Wix dev docs tutorials (e.g. "Top Blog Posts" dashboard page with the CLI, see [docs index](https://dev.wix.com/docs/llms-full.txt))
- Dashboard SDK comment: heights of iframe dashboard components are auto-adjusted by the host, so don't use `vh` units — [Dashboard API intro](https://dev.wix.com/docs/sdk/host-modules/dashboard/introduction.md)
- Blocks is a Wix-native, low-code app editor: build site and dashboard components with drag-and-drop, code logic in Velo, hosted on Wix cloud; Blocks apps are not supported in the Harmony editor (existing ones remain for Editor/Studio) — [About Wix Blocks](https://dev.wix.com/docs/build-apps/develop-your-app/develop-an-app-with-blocks/about-wix-blocks.md)
- Blocks widgets have separate "design guidelines" for responsiveness and blending with host sites — [Blocks widget design guidelines](https://dev.wix.com/docs/build-apps/develop-your-app/develop-an-app-with-blocks/widget-design/blocks-widget-design-guidelines.md)
- Legacy site-extension (iframe) guidance: apps must "look good and work well in at least 3 sizes", "functionality must be the same in all sizes", device-type checks via SDK — legacy iframe site-extension design guide, found in the [Wix full docs index](https://dev.wix.com/docs/llms-full.txt) (exact article URL not captured)
- The old "Corvid by Wix" name is now Velo; the docs still describe Velo as "Wix's native coding solution" for sites and Blocks. Old Wix Apps Framework terms such as "Wix.openModal" and the "iframe SDK" are under "deprecated" paths — [deprecated iframe SDK](https://dev.wix.com/docs/client/api-reference/deprecated/iframe-sdk-deprecated/wix.md)
- The legacy Wix CLI for Apps is deprecated; new projects should use the unified Wix CLI — [Legacy Wix CLI for Apps docs](https://dev.wix.com/docs/wix-cli/legacy-clis/legacy-wix-cli-for-apps/supported-extensions/dashboard-extensions/dashboard-pages/add-dashboard-page-extensions-with-the-cli)

### Inferences
- Inferred: consistency is achieved socially + via tooling (WDS provider, Patterns, scaffolds), not by sandbox restrictions: a self-managed iframe can render anything.
- Inferred: no mobile design system for third parties is documented; mobile consistency in the Owner-app WebView falls on the third party ("all dashboard screens need to be optimised for mobile").

### Gaps
- Did not locate Wix's App Market review/approval checklist; cannot confirm whether non-WDS UI is rejected.
- WDS responsive/mobile support specifics and the WDS theming/token API were not read.

## 4. Where extension code runs, how data/actions round-trip, permissions/OAuth

### Takeaway
UI code runs in iframes (dashboard) or custom elements/iframes (site) hosted either on Wix cloud (CLI/Blocks) or on the developer's server (self-managed); the iframe talks to the host via the Dashboard SDK. Backend work runs on Wix cloud (CLI/Blocks) or the developer's server; service plugins are reverse-calls from Wix to the developer's endpoint with JWT-signed requests. Permissions are the intersection of the app's granted scopes and the current user's permissions; server-side calls use OAuth client-credentials per app instance.

### Cited Findings
- Dashboard pages "add an iframe page to a site dashboard"; self-managed config requires an https iFrame URL, and Wix appends a signed `instance` query parameter to identify the site/owner — [Add Self-Managed Dashboard Pages](https://dev.wix.com/docs/build-apps/develop-your-app/frameworks/self-hosting/supported-extensions/dashboard-extensions/add-self-hosted-dashboard-page-extensions.md); the iframe receives query params including `viewMode=dashboard` — [iframe query parameters](https://dev.wix.com/docs/build-apps/develop-your-app/develop-a-self-managed-app/supported-extensions/dashboard-extensions/iframe-query-parameters-for-dashboard-extensions.md)
- Dashboard SDK in iframes: self-managed apps create a client with `dashboard.host()` and `dashboard.auth()` ("hosted authorization strategy") so the iframe calls Wix APIs on behalf of the logged-in user; the SDK is only initialised inside an iframe (`inIframe()` check in tutorial) — [Dashboard API intro](https://dev.wix.com/docs/sdk/host-modules/dashboard/introduction.md)
- Host-provided capabilities: navigate users to dashboard pages, display modals, `showToast` alerts, `observeState`, `page.getLayout` — [Dashboard API intro](https://dev.wix.com/docs/sdk/host-modules/dashboard/introduction.md)
- Warning in Dashboard docs: "Recent updates to the Dashboard module include changes to how the Wix Dashboard communicates with apps. Apps using outdated versions of these packages may stop working" (minimum `@wix/dashboard` 1.3.43) — same page (shows the host-iframe protocol is versioned through the SDK package, not a stable raw postMessage contract)
- Permission model: "Your code can access APIs with the permissions of the currently logged-in Wix user, but only if the app ... has also been granted those permissions" — i.e. an intersection — [Dashboard API intro](https://dev.wix.com/docs/sdk/host-modules/dashboard/introduction.md)
- Server-side auth: OAuth client-credentials with App ID, app secret, and the app instance ID to mint an access token; "custom authentication" (redirect-based OAuth 2.0 handshake, refresh tokens) is deprecated and not available for new apps — [About OAuth](https://dev.wix.com/docs/build-apps/develop-your-app/access/authentication/about-oauth.md)
- App instance = unique installation per site; `instanceId` is shared by all extensions and is the key apps must use to identify users on App Market public apps — [About App Instances](https://dev.wix.com/docs/build-apps/develop-your-app/access/app-instances/about-app-instances.md)
- Service plugins invert the call direction ("Don't call us, we'll call you"): Wix calls the app's service in a flow, waits for the response, then continues; JWT-encrypted requests are decoded with the SDK's `process()`/`provideHandlers()`; with the CLI Wix hosts the endpoints for you — [About Service Plugin Extensions](https://dev.wix.com/docs/build-apps/develop-your-app/extensions/backend-extensions/service-plugins/about-service-plugin-extensions.md)
- Schema plugins extend Wix objects with namespaced `extendedFields` governed by field permissions in a JSON schema — [About Schema Plugin Extensions](https://dev.wix.com/docs/build-apps/develop-your-app/extensions/backend-extensions/schema-plugins/about-schema-plugin-extensions.md)
- Site widgets/plugins are sandboxed iframes in the editor/preview with opaque origin (`allow-same-origin` unsupported) — [Handle sandboxing in the editor](https://dev.wix.com/docs/build-apps/develop-your-app/extensions/site-extensions/handle-sandboxing-in-the-editor.md); same-domain iframes are auto-sandboxed in another doc (line in full-docs), and cross-origin iframes should use `postMessage`
- Site-owner data/plan: self-managed iframe apps get the dashboard URL format `{username}-{sitename}.{editor|studio|harmony}.wix.com` and must update CORS allowed origins — [About Dashboard Page Extensions](https://dev.wix.com/docs/build-apps/develop-your-app/extensions/dashboard-extensions/dashboard-pages/about-dashboard-page-extensions.md)
- Blocks: code (Velo) deploys and runs on Wix cloud; app permissions are added in Blocks — [Add app permissions in Blocks](https://dev.wix.com/docs/build-apps/develop-your-app/develop-an-app-with-blocks/code-in-blocks/add-app-permissions-in-blocks.md)

### Inferences
- Inferred: Wix's model is "untrusted-origin iframe + typed host SDK + server callbacks" — the extension never runs in the host process. Round-trips: UI -> SDK (postMessage under the hood; the docs do not name the transport) -> host or Wix APIs with user+app permission intersection; host -> developer server via signed HTTP for service plugins.
- Inferred for Argo: a Wix-style design maps to "plugin UI hosted/served by the local Node Server, rendered in a webview/iframe, host SDK for navigation/toasts/state; plugin backend callbacks signed by host". Wix's own mobile experience shows this approach yields WebView UIs on phone, not native components.

### Gaps
- Transport details (postMessage envelope, origin checks) for the Dashboard SDK are undocumented in what I read.
- Permission scope catalogue and consent UX were not read.
- CLI-hosted extension runtime (what Wix cloud runs: worker/lambda/container) is not described in the pages I read.

## 5. What Wix engineering has published about mobile architecture (React Native, multi-module, OTA/App Store compliance)

### Takeaway
Wix is one of the earliest and largest React Native adopters, runs a multi-module "Engine + Modules" architecture so ~100+ mobile engineers in ~30 teams ship into the main Wix app, and open-sourced RNN, Detox, RN UI Lib, etc. I found no Wix-published material on over-the-air/server-driven UI or App Store compliance for downloaded content.

### Cited Findings
- Wix describes itself as an early RN adopter with "one of the largest RN code base in the world", maintaining 30+ RN open-source projects (Detox, RN UILib, RN Navigation, RN Calendars, RN Notifications) and became an official React Native partner in Oct 2022 — [Wix Engineering: official RN partner](https://www.wix.engineering/post/wix-engineering-now-an-official-react-native-partner)
- Wix press release: the Wix Owner App "was created using RN" — [Nasdaq press release](https://www.nasdaq.com/press-release/wix-becomes-an-official-react-native-partner-2022-10-25) (via search summary)
- Scale: from a small team to "more than 100 mobile engineers, spread across 30 teams globally"; 2019 meetup description: 70 developers from 15 teams into one app with near-daily production releases — [React Native at Wix (Medium, Nov 2020)](https://medium.com/wix-engineering/react-native-at-wix-d56c3745aaff) and [dou.ua event](https://dou.ua/calendar/25706/) (both via search summaries; Medium page itself returned 403)
- Architecture (via search summary of the Deep Dive post): an **Engine** supplies native code/infrastructure so each **Module** can be mostly JavaScript; modules declare the Engine as dev/peer dependency; Engine publishes pre-built native apps to NPM so module teams avoid native builds; modules communicate through the Engine via Methods, Components, Broadcasts and Services — [RN at Wix: Architecture II (Deep dive)](https://medium.com/wix-engineering/react-native-at-wix-the-architecture-ii-deep-dive-9cfcb3c2822c) (via search summary; 403 on direct fetch)
- Wix's "Mobile Wix Multi-Module" talk framing: "think more like an OS to allow each team easily integrates their module into the main Wix's React Native mobile app" — [Wix Engineering podcast transcript E06](https://www.wix.engineering/post/breaking-down-react-native-e06-full-transcript) (via fetch summary; quote paraphrased)
- Open-source engine playground: "partially implementation of Wix Multi-Module architecture for react-native application" — [wix-incubator/react-native-wix-engine](https://github.com/wix-incubator/react-native-wix-engine/blob/main/README.md)
- Module versioning: modules are versioned from git history; the app installs the GA-marked version of each — [Versioning master](https://medium.com/wix-engineering/versioning-master-8bb42e6c4a2a) (via search summary)
- Pain points called out in the podcast transcript: early performance problems hard to diagnose; difficulty recruiting experienced RN devs; maintenance burden of many open-source libraries; need for a few native developers — [Podcast transcript E06](https://www.wix.engineering/post/breaking-down-react-native-e06-full-transcript) (via fetch summary, transcript truncated)
- Wix built its own navigation lib (React Native Navigation) and e2e test framework (Detox) because RN lacked them — same transcript

### Inferences
- Inferred: Wix's multi-module architecture composes modules at build/release time into the binary (an engine plus npm-delivered modules), i.e. an internal plugin system for first-party teams, not a runtime mechanism for third parties. No source says modules are loaded dynamically after install.
- Inferred: Because third-party content in the Owner app is a WebView of a hosted dashboard and the owner app is an RN app, App Store compliance risk is minimised by never executing downloaded native/JS code outside web content. Wix has not published its reasoning on guideline 2.5.2/3.3.2 that I could find.

### Gaps
- No Wix engineering post found on server-driven UI, JS bundle OTA updates (e.g. CodePush-style), or App Store guideline compliance for downloaded content.
- The primary Medium posts were inaccessible (403); details above are search-tool summaries and need confirmation by a human reading the originals.
- The 2023+ status of the multi-module architecture (post new RN architecture / Hermes) was not found.

## 6. Limits and known pain points (consolidated)

### Takeaway
The documented limits cluster around mobile: only dashboard-only apps are eligible for the Owner app beta, everything runs in a WebView without the Wix SDK, billing flows are platform-restricted, and testing before production is not possible. Elsewhere, extension availability varies by editor (Harmony vs Editor/Studio), and several APIs are in Developer Preview.

### Cited Findings
- Owner-app beta limits (see section 2): dashboard-only, mobile-optimised, no new windows, no SDK, iOS upgrade-flow ban, Android billing limits, no pre-production test path — [Appear on the Wix Owner App](https://dev.wix.com/docs/build-apps/launch-your-app/marketing/wix-owner-app) (via search summaries)
- Branded App custom widgets: Developer Preview, "not yet available to all users" — [Wix Mobile API intro](https://dev.wix.com/docs/sdk/frontend-modules/mobile/introduction.md)
- Branded App publishing needs paid "Mobile App Premium"; design changes need store resubmission — [Help: mobile apps overview](https://support.wix.com/en/article/the-wix-mobile-apps-an-overview), [Help: building your own app](https://support.wix.com/en/article/building-your-own-native-mobile-app-with-wix)
- Slots are limited: "Not all apps built by Wix include pre-defined slots" — [About Dashboard Plugin Extensions](https://dev.wix.com/docs/build-apps/develop-your-app/extensions/dashboard-extensions/dashboard-plugins/about-dashboard-plugin-extensions.md)
- Editor fragmentation: Blocks and legacy custom elements unsupported in Harmony; legacy iframes partial — [About Wix Harmony and Apps](https://dev.wix.com/docs/build-apps/get-started/overview/about-wix-harmony-and-apps.md)
- Protocol churn: Dashboard SDK versions must be bumped as host communication changes; dashboard URL/cookie format change requires CORS updates — [Dashboard API intro](https://dev.wix.com/docs/sdk/host-modules/dashboard/introduction.md), [About Dashboard Page Extensions](https://dev.wix.com/docs/build-apps/develop-your-app/extensions/dashboard-extensions/dashboard-pages/about-dashboard-page-extensions.md)
- Deprecations: custom authentication (new apps blocked), legacy Wix CLI for Apps, iframe SDK (`Wix.*`), `@wix/dashboard-react` ("deprecated" path) — [About OAuth](https://dev.wix.com/docs/build-apps/develop-your-app/access/authentication/about-oauth.md), [legacy CLI docs](https://dev.wix.com/docs/wix-cli/legacy-clis/legacy-wix-cli-for-apps/supported-extensions/dashboard-extensions/dashboard-pages/add-dashboard-page-extensions-with-the-cli), [dashboard-react (deprecated)](https://dev.wix.com/docs/sdk/host-modules/dashboard-react-deprecated/introduction.md)

### Inferences
- Inferred lesson for Argo: Wix's mobile story for third-party plugins is intentionally minimal (web view of a phone-optimised page, no host SDK, no native components). Native-feeling plugin UI on phones would require either a host-defined declarative component vocabulary (as in Branded App widgets) or accepting WebViews.
- Inferred: the combination "typed slots owned by first-party apps" + "iframe UI" + "notifications as data" is Wix's whole third-party mobile surface today.

### Gaps
- No public numbers on adoption of the Owner-app light App Market.
- No Wix-published postmortems or conference talks on third-party plugin problems were found.
