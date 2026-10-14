# Store policies on downloaded, interpreted or server-delivered code and UI (Apple App Store, Google Play)

Research date: 2026-10-14. Not legal advice. Quotes are kept short; Apple and Google texts were read from the live pages by a fetch tool that summarises pages, so treat "verbatim" as "as returned by the tool". The Apple Guidelines page shows no revision date in the fetched text (see Gaps).

## 1. Apple: what the current text says (2.5.2, DPLA 3.3.1(B), 4.7.x, 4.2, 2.5.6)

### Takeaway
Apple's rule 2.5.2 bans downloading code that "introduces or changes features or functionality", while DPLA 3.3.1(B) allows downloaded *interpreted* code if it does not change the app's primary purpose, bypass OS security, or make a store. Guideline 4.7 is the explicit carve-out for non-embedded "HTML5 and JavaScript mini apps ... and plug-ins", with strings attached (moderation, no extra native API exposure, an index of all software, age gating).

### Cited Findings
- 2.5.2: apps "may not download, install, or execute code which introduces or changes features or functionality of the app". Only educational apps for teaching code get a limited exception. — [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- DPLA 3.3.1(B) "Executable Code" (current text on Apple's page): "an Application may not download or install executable code. Interpreted code may be downloaded to an Application but only so long as such code" (a) "does not change the primary purpose of the Application by providing features or functionality that are inconsistent with the intended and advertised purpose of the Application", (b) "does not bypass signing, sandbox, or other security features of the OS", and (c) "for Applications distributed on the App Store, does not create a store or storefront for other Applications." — [Apple Developer Program License Agreement](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/) (read at chars 100000-200000 of the page; agreement version date not shown in the fetched text)
- Older DPLA wording (2016, quoted in a forum) allowed interpreted code only if "packaged in the Application", with an exception for "scripts and code downloaded and run by Apple's built-in WebKit framework or JavascriptCore". That exception no longer appears in the current 3.3.1(B) text as fetched; a 2022 Expo-forum post makes the same observation. The 2016 forum thread had no Apple staff answer. — [Apple Developer Forums thread 52161](https://developer.apple.com/forums/thread/52161); [Expo forum](https://forums.expo.dev/t/expo-updates-and-apples-app-store-review-guidelines/64495) (via search snippet only; the page itself redirected to Discord)
- The DPLA text has a separate rule for programming environments (80% of screen, conspicuous indicator, no storefront, source viewable and editable). Not relevant unless Argo's plugin runtime is pitched as a learn-to-code environment. — [DPLA](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- 4.7 (current): "Apps may offer certain software that is not embedded in the binary, specifically HTML5 and JavaScript mini apps and mini games, streaming games, chatbots, and plug-ins." The developer is "responsible for all such software offered in your app". — [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/); same text in [Apple's UK PDF](https://developer.apple.com/support/downloads/terms/app-review-guidelines/App-Review-Guidelines-English-UK.pdf)
- 4.7.1: the software must follow privacy guidelines (5.1), "include a method for filtering objectionable material, a mechanism to report content and timely responses to concerns, and the ability to block abusive users", and follow 3.1 for digital goods. — same sources
- 4.7.2: "Your app may not extend or expose native platform APIs or technologies to the software without prior permission from Apple." — same sources
- 4.7.3: no sharing of "data or privacy permissions" with any individual software "without explicit user consent in each instance". — same sources
- 4.7.4: "You must provide an index of software and metadata available in your app. It must include universal links that lead to all of the software offered in your app." — same sources
- 4.7.5: a way for users to identify software exceeding the app's age rating, plus "an age restriction mechanism based on verified or declared age". — same sources
- Neither "WebKit" nor "JavaScriptCore" appears in 4.7 or 4.7.1-4.7.5 in Apple's text (checked in the UK PDF). Third-party blogs (dev.to, a search-summary) claim 4.7 requires standard WebKit/JavaScriptCore and bans custom engines like Hermes/V8; no Apple text for this was found. 2.5.6 does say "Apps that browse the web must use the appropriate WebKit framework and WebKit JavaScript" (that is about browsing the web, not plugins). — [UK PDF](https://developer.apple.com/support/downloads/terms/app-review-guidelines/App-Review-Guidelines-English-UK.pdf); [dev.to (unsourced claim)](https://dev.to/arshtechpro/apples-guideline-47-update-what-every-developer-hosting-html5-mini-apps-must-know-90)
- 4.2 Minimum Functionality: the app should "elevate it beyond a repackaged website"; 4.2.2 bars apps that are "primarily ... content aggregators, or a collection of links"; 4.2.3(i) "Your app should work on its own without requiring installation of another app to function." — [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- 4.2.7 Remote Desktop Clients (nearest analogue to phone-to-own-Mac): software shown "fully executed on the host device, rendered on the screen of the host device"; host must be "user-owned" and on a "local and LAN-based network"; client UI must not "provide a store-like interface" or let users "browse, select, or purchase software not already owned or licensed by the user". — [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

### When was 4.7 last changed?
- Apple's news post "Updated App Review Guidelines now available" dated November 13, 2025 states 4.7 "now clarifies that HTML5 and JavaScript mini apps and mini games are in scope". — [Apple Developer News](https://developer.apple.com/news/?id=ey6d8onl)
- Earlier: 4.7 was revised in early 2024 (retro console/PC emulators may offer downloads; MacStories said mini apps "must be created with HTML 5", described as a clarification; exact day not stated). — [MacStories](https://www.macstories.net/news/apple-amends-app-review-guidelines-to-permit-game-emulators-and-make-other-changes/)
- A search summary mentions June 2019 changes to 4.7 sub-points about real-money gaming/donations; this is not in the current text and was not verified from a primary source. — search result, unverified
- No 2026 revision of 4.7 was found (one search; sources with 2026 dates in the result set had mismatched content).
- Same day (November 13, 2025): Apple launched a Mini Apps Partner Program. Hosts must supply a 4.7.4 manifest "that Apple approves"; mini apps are "software packages, scripts, or game content that are added after app installation and executed on the device" in "HTML5 or JavaScript, or another language approved by Apple", and must comply with DPLA 3.3.1(B). 15% commission on qualifying (not same-developer) mini apps; requires Advanced Commerce API, Declared Age Range API, In-App Purchase. Optional program. — [Mini Apps Partner Program](https://developer.apple.com/programs/mini-apps-partner/)

### Inferences
- The DPLA 3.3.1(B) wording ("Interpreted code may be downloaded") is the contractual basis that makes React Native OTA JS and plugin interpreters possible, but the three conditions are judged by App Review, not by a published test. "Primary purpose" is read against "intended and advertised purpose", so Argo's advertised purpose has to plausibly include "run plugins".
- 4.7 defines the safest *explicit* lane for plugins: HTML5/JS in a sandbox, no native API extension, moderation hooks, an index, age gating. Option (c) with extra native bindings would conflict with 4.7.2 unless Apple gives permission.
- Whether 4.7 duties apply when plugins are the user's own code on the user's own Mac is not addressed by the text (see section 4).

### Gaps
- The Guidelines page revision date was not visible in the fetched text; Apple's Nov 13, 2025 news post is the latest revision I could confirm. A later (2026) revision cannot be ruled out.
- The date/version of the DPLA currently in force was not visible.
- No Apple source found for a WebKit/JavaScriptCore-only requirement in 4.7.

## 2. Apple: server-driven UI, OTA JS (Expo Updates / CodePush), and extension-hosting apps

### Takeaway
There is no Apple ruling that blesses server-driven UI or OTA JS; evidence is vendor statements and forum anecdotes. Server-driven UI that maps JSON to a fixed set of native components is widely practised and argued to be low risk; OTA JS that "changes features" and logic-carrying schemas are higher risk.

### Cited Findings
- Expo's FAQ says only that "your updates need to follow the App Store and Play Store guidelines" and that behaviour changes usually need review; it does not cite 2.5.2/3.3.1 or "primary purpose". — [Expo EAS Update FAQ](https://docs.expo.dev/eas-update/faq/)
- DockYard (a LiveView Native vendor) argues server-driven UI "sends UI representations, events, and data, not executable code", that its tags map one-to-one to SwiftUI views already in the binary (so Apple can analyse the binary), and cites Airbnb, Lyft, Shopify and Meta as SDUI examples on the App Store. Vendor opinion, not an Apple ruling. — [DockYard, Dec 2024](https://dockyard.com/blog/2024/12/20/are-liveview-native-apps-accepted-by-apple)
- Rejection reports under 2.5.2 exist for hot-code-push SDKs: Meteor forum quotes an Apple letter asking for removal of code "that [gives the] capability to change your app's behavior or functionality after App Review approval"; thread suggests the trigger was native-calling code rather than plain JS/HTML. — [Meteor forum](https://forums.meteor.com/t/apple-starts-rejecting-apps-with-hot-code-push-features/34597) (via search summary; page not fetched)
- A 2016 developer-forum thread shows developers split on whether downloaded interpreted code is covered; no Apple staff answered. — [Apple Developer Forums](https://developer.apple.com/forums/thread/52161)
- ptkd.com (SEO-style secondary source, low reliability) rates remote-schema UI engines with inline behaviour "medium-to-high" risk and remote JS through a native bridge "high" risk, and says OTA updates are tolerated when they "revise existing functionality without changing the primary purpose". Treat as a lead only. — [ptkd.com](https://ptkd.com/journal/guideline-2-5-2-downloading-scripts-without-review-codepush)
- Shopify POS UI extensions: extensions are "client-side JavaScript applications"; UI is built from web components "built with remote-dom"; some run entirely on the merchant's device. The reviewed page does not say where the JS executes (Worker vs main), nor how Apple reviewed it. — [Shopify POS UI extensions](https://shopify.dev/docs/api/pos-ui-extensions/latest)
- Slack and Teams: no primary sources on their app-store treatment were found. Not researched beyond this.

### Inferences
- Shopify POS is a real-world precedent for "third-party JS extensions render into a host app's native UI via remote-dom" on the App Store, but no documented Apple position was found; it is existence evidence only, and Shopify is a first-tier partner whose review dynamics may differ.
- For (a) JSON to native: lowest risk if the schema is declarative data (layout, text, bindings) and actions are an enumerated set the app already implements; risk rises as the schema gains expressions/scripts.
- Reviewers key on SDK/method names (e.g. "downloadAndReplaceCurrentBundle") per anecdotes, so the review-notes explanation matters.

### Gaps
- No documented enforcement case specific to server-driven UI was found; no Apple statement on Expo Updates.
- No evidence retrieved on how Slack/Teams/Shopify disclose or were reviewed.
- Search results were dominated by low-quality aggregator content; many claims could not be traced to primary Apple sources.

## 3. Google Play: Device and Network Abuse

### Takeaway
Google forbids downloading executable code (dex, JAR, .so) from outside Google Play and forbids self-update outside Play, but exempts code run in a VM or interpreter with only indirect Android API access ("JavaScript in a webview or browser"). Runtime-loaded interpreted-language code must not enable policy violations; WebView JS interfaces loading untrusted content are an explicit violation.

### Cited Findings
- "an app may not download executable code (such as dex, JAR, .so files) from a source other than Google Play." — [Device and Network Abuse](https://support.google.com/googleplay/android-developer/answer/9888379?hl=en)
- Exception: the restriction "does not apply to code that runs in a virtual machine or an interpreter", where it provides indirect access to Android APIs "such as JavaScript in a webview or browser". — same source
- Apps/SDKs "with interpreted languages (JavaScript, Python, Lua, etc.) loaded at run time" must not allow potential violations of Google Play policies. — same source
- Apps may not update themselves by any method other than Google Play's mechanism. — same source
- Listed violation: apps or SDKs "containing a WebView with an added JavaScript Interface that loads untrusted web content or unverified URLs". — [Policy page (alt copy)](https://support.google.com/googleplay/android-developer/answer/16559646?hl=en)
- The interpreted-languages clause took effect October 15, 2021; The Register described it as tightening, not a new rule. — [The Register, Jul 2021](https://www.theregister.com/2021/07/29/google_play_python_javascript/)
- 2025-2026 changes: the fetched policy pages (footer 2026) show no dated change notice affecting executable code; the page does include a recent On-device Android Containers rule (`REQUIRE_SECURE_ENV`), unrelated. A prior search summary reported a "changes coming" banner, but a fetch of the page found none, so that is unconfirmed. — [Policy](https://support.google.com/googleplay/android-developer/answer/9888379?hl=en)

### Inferences
- Google's text is more permissive than Apple's for interpreted JS, as long as the interpreter only gives indirect Android API access. A JS engine in the app bridged to a *small, fixed, audited* API set fits "indirect access"; exposing arbitrary native modules does not clearly fit.
- JSON describing UI from the app's own components is not "executable code" under this text.

### Gaps
- No 2025-2026 revision history for this section was found; Google's page does not show a change log.
- Google's own definition of "indirect access" is not given beyond the example.

## 4. Practical verdict for (a), (b), (c), and effect of the user's own machine

### Takeaway
(a) JSON to native is lowest risk on both stores; (b) HTML/JS in a WebView is the best-supported pattern on both, and falls under Apple 4.7 as an explicit allowance; (c) a JS interpreter in the app is allowed in text by DPLA 3.3.1(B) and Google's interpreter exception, but is the most review-sensitive, and any native binding runs into Apple 4.7.2. The user's own machine as plugin source is not mentioned in any policy text; that it changes the analysis is my inference.

### Cited Findings
- WebView JS on Android is the exception example Google itself names. — [Device and Network Abuse](https://support.google.com/googleplay/android-developer/answer/9888379?hl=en)
- On Apple, 4.7 explicitly lists "HTML5 and JavaScript mini apps ... and plug-ins" as permitted non-embedded software. — [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- 4.7.1 asks for filtering, reporting and blocking tools; 4.7.4 asks for an index with universal links; 4.7.5 for age gating; 4.7.2 forbids extending native APIs without Apple's permission. — [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- 3.3.1(B)(c): no "store or storefront for other Applications" (DPLA); 4.2.7(d): no store-like UI in remote-desktop clients. — [DPLA](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/); [Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- The Mini Apps Partner Program says hosted mini apps are code "added after app installation and executed on the device" and uses a 4.7.4 manifest Apple approves. — [Apple](https://developer.apple.com/programs/mini-apps-partner/)

### Inferences (not Apple/Google statements)
| Option | Apple | Google Play |
|---|---|---|
| (a) JSON, app's own native components | Lowest risk. Not "executable code" if the schema is data and actions are a fixed enumerated set. Becomes risky if the JSON carries logic/expressions or lets plugins add new capabilities (2.5.2 "changes features"). Keep the set of components and actions in the binary. | Low risk; no executable code downloaded. |
| (b) HTML/JS in a WebView | Best-supported; matches 4.7 and 2.5.6 (use WKWebView). Treat plugin UI as 4.7 software: obey 4.7.1 (report/block/filter), 4.7.2 (no native bridge beyond what Apple permits), 4.7.3 (per-use consent for data/permissions), 4.7.4, 4.7.5. Avoid making the WebView the whole app (4.2). | Explicitly the exempt example. Avoid `addJavascriptInterface` loading untrusted content; keep any bridge minimal and origin-restricted. |
| (c) JS interpreter on phone | Textually allowed by DPLA 3.3.1(B) if it keeps the three conditions, but it is "downloaded interpreted code" with the weakest precedent; exposing native APIs to it hits 4.7.2; Hermes/other engines are not clearly 4.7-compliant (the WebKit/JSC claim is third-party only). Prefer JavaScriptCore/WebKit isolated context with no native bridge, or run it in a WebView. | Allowed via VM/interpreter exception if access to Android APIs is indirect; runtime-loaded languages "must not allow potential violations". |

- Risk-reducing controls (inferred from the policy text): user-initiated install of a named plugin; no in-app browsing/discovery of plugins (avoid "store or storefront" and 4.2.7(d)-style store UI); plugin list/index limited to what the user's own Server reports; keep the app's advertised purpose to include "extend with plugins" in the App Store description and review notes; per-plugin permission prompts (4.7.3); a report/block mechanism and content filter (4.7.1); an age-rating answer that accounts for plugin content (4.7.5); provide Apple a demo Server and sample plugin in review notes; no IAP bypass for digital goods (3.1 via 4.7.1); keep native API surface for plugins small and enumerate it in review notes (4.7.2).
- Plugin on the user's own Mac: the code never reaches the phone as a downloaded binary in (a) and (b)-with-JSON, only data; on that point (a) looks like ordinary client-server. This resembles Apple's remote-desktop carve-out (4.2.7: logic "fully executed on the host device", "user-owned" host, LAN) but 4.2.7 applies to remote-desktop clients, and whether Argo qualifies is untested. If plugin JS is shipped to the phone to run (b/c), source location (the user's Server vs a developer's server) is not a distinction in 2.5.2, 3.3.1(B), 4.7 or Google's policy text; both still count as code "not embedded in the binary". Also 4.7 says "You are responsible for all such software offered", i.e. the host app is liable regardless of who wrote it.
- 4.2.3(i) ("work on its own without requiring installation of another app") — the Server is not an app store listing, but a phone app that is useless without a desktop Server may draw 4.2 scrutiny; provide demo mode/reviewer access. This is my reading, not a documented case.

### Gaps
- No documented review outcomes for an app that renders plugin UI from a user-owned desktop server were found.
- Whether Apple treats a JS engine running inside the app (JSC without WebView) the same as a WebView for 4.7 purposes: no source.
- Apple's expectation for an "index" (4.7.4) when plugins are installed by the user from their own machine: not addressed in the text; the Mini Apps Partner Program page only describes the manifest in the context of that program.
- No direct statement from Apple on server-driven UI; answers remain interpretive. Recommend asking App Review/Apple Developer Forums or a pre-submission query before committing to (c).
