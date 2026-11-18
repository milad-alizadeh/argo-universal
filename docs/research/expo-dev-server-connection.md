# How Expo connects a phone to a dev server, and why Argo Pairing may fail

Researched 2026-11-18 from upstream source code (expo/expo, kitten/lan-network, facebook/react-native), Apple's TN3179, and this repo's code at `main` (09e4e0c17). Nothing was run on a phone. Where a source could not be read, the claim says so.

Short answer: Expo puts the computer's IP address and port in the URL the QR carries, and treats Bonjour as an extra. Argo's QR carries no address at all, so on a scan the phone can reach a Server only if mDNS browsing works on the phone, the Mac and the router at once.

## How Expo does it

### What the QR carries, and how the host gets in

- `UrlCreator` builds an `http(s)://host:port` URL, then rewrites the scheme to `exp` for Expo Go. [UrlCreator.ts](https://github.com/expo/expo/blob/main/packages/@expo/cli/src/start/server/UrlCreator.ts) (`constructExpoGoUrl`, `joinUrlComponents`).
- For a development build the URL is `<scheme>://?__expo_url=<encodeURIComponent(manifestUrl)>`; the manifest URL is the same `host:port`. Same file, `constructDevClientUrl`.
- The host is resolved in this order (same file, `getUrlComponents`, `getDefaultHostname`): a proxy URL; a forwarded request's authority; a tunnel URL when `hostType` is `tunnel`; `localhost` (as `127.0.0.1`) when `hostType` is `localhost`; otherwise the override, else `options.hostname || getGatewayAddress()`.
- `REACT_NATIVE_PACKAGER_HOSTNAME` is the override. It is wired in as `getHostnameOverride` in [BundlerDevServer.ts](https://github.com/expo/expo/blob/main/packages/@expo/cli/src/start/server/BundlerDevServer.ts), where a TODO calls it undocumented. [env.ts](https://github.com/expo/expo/blob/main/packages/@expo/cli/src/utils/env.ts) documents it as "Overwrite the hostname used in dev server URLs, disregarding the `--host`, `--lan` and `--localhost` arguments". The public CLI page does not mention it; it documents `EXPO_PACKAGER_PROXY_URL` instead. [docs.expo.dev/more/expo-cli](https://docs.expo.dev/more/expo-cli/).
- LAN is the default: "By default, the project is served over a LAN connection." Same docs page. `--tunnel` (through `@expo/ngrok`) is the documented answer when a device cannot reach the computer over LAN.

### How one address is picked from several interfaces

- [ip.ts](https://github.com/expo/expo/blob/main/packages/@expo/cli/src/utils/ip.ts) calls `lanNetwork` / `lanNetworkSync` from the `lan-network` package and uses its `address`. It caches the result (`cachedGateway`). If the lookup throws it returns `127.0.0.1`. It does not filter link-local, VPN or `utun` itself.
- [lan-network](https://github.com/kitten/lan-network/blob/main/README.md) tries three things in order: (1) open a UDP socket toward a public address and take the interface the OS routes it through; (2) send a DHCP discovery broadcast on each routable interface and see which gets a reply; (3) fall back to the top-ranked candidate. [src/index.ts](https://github.com/kitten/lan-network/blob/main/src/index.ts) sorts candidates "external first, then LAN-reserved IP range priority, then address value" and may end at `127.0.0.1`.
- Not verified: how lan-network ranks 169.254, `utun` and bridge interfaces. That code is in `./network` and `./route`, which were not read.
- So Expo asks the OS routing table which interface leads to the internet and advertises that one. Argo advertises every interface (see below).

### Whether Expo uses Bonjour

Yes, as a second path next to the QR.

- The CLI advertises `_expo._tcp` using `dnssd-advertise`, with TXT fields `name`, `slug`, `androidPackage`, `iosBundleIdentifier`, `username`, and `stack: 'IPv4'`. [Bonjour.ts](https://github.com/expo/expo/blob/main/packages/@expo/cli/src/start/server/Bonjour.ts). It is skipped under CI or when `EXPO_UNSTABLE_BONJOUR` is off. In `env.ts` that variable defaults to `!envIsHeadless()`, so it is on for an interactive terminal.
- The dev launcher on iOS browses with `NWBrowser` for `_expo._tcp` (`BONJOUR_TYPE`) with `bonjourWithTXTRecord`, resolves each result to an HTTP base URL, and keeps it only if `GET /status` answers `packager-status:running`. [DevLauncherViewModel.swift](https://github.com/expo/expo/blob/main/packages/expo-dev-launcher/ios/SwiftUI/DevLauncherViewModel.swift), [NetworkUtilities.swift](https://github.com/expo/expo/blob/main/packages/expo-dev-launcher/ios/SwiftUI/NetworkUtilities.swift).
- Android uses `NsdManager.discoverServices` for `_expo._tcp.`, and on Android 13+ requests all networks, VPN included. It checks `$url/status` for `packager-status:running`. [NsdDiscoveryBase.kt](https://github.com/expo/expo/blob/main/packages/expo-dev-launcher/android/src/debug/java/expo/modules/devlauncher/nsd/NsdDiscoveryBase.kt).
- The list refreshes every 10 s, a browse restart waits 3 s, a connection to a found server waits 3 s to be ready, and the whole resolution gives up at 7 s. Source: `DevLauncherViewModel.swift` and `NetworkUtilities.swift`. If the list goes from non-empty to empty, discovery restarts once.
- Typing or scanning the URL does not need any of this: it is a plain `http://ip:port`.

### Transport and timeouts

- The manifest and bundle travel as plain HTTP from the same `host:port`. Hot reload runs on a WebSocket at `<origin>/hot`. [HMRClient.js](https://github.com/facebook/react-native/blob/main/packages/react-native/Libraries/Utilities/HMRClient.js).
- On a failed socket React Native shows "Cannot connect to Metro." with the host, port and error, and tells Android users to check `adb reverse` and the Dev settings host. On close it says to check Metro is on the same network. Same file.
- On Android the host comes from `packagerConnectionSettings.debugServerHost`; the class comment says an empty `debug_http_host` falls back to `10.0.2.2` (emulator). [DevServerHelper.kt](https://github.com/facebook/react-native/blob/main/packages/react-native/ReactAndroid/src/main/java/com/facebook/react/devsupport/DevServerHelper.kt). Not verified: the HTTP and WebSocket timeout values, which live in `JSPackagerClient` and `PackagerStatusCheck`.
- Not verified from a primary source: whether iOS needs `NSAllowsLocalNetworking`. The Apple page for it did not return its body.

### iOS Local Network permission

- The plugin adds `NSBonjourServices` containing `_expo._tcp` and, when absent, an `NSLocalNetworkUsageDescription` of "Expo Dev Launcher uses the local network to discover and connect to development servers running on your computer." A release-build script removes only those. [withDevLauncher.ts](https://github.com/expo/expo/blob/main/packages/expo-dev-launcher/plugin/src/withDevLauncher.ts).
- The prompt is not triggered by any special call. Apple: "The first time a program accesses the local network, the system displays an alert asking the user to approve that access." [TN3179](https://developer.apple.com/documentation/technotes/tn3179-understanding-local-network-privacy). Every Bonjour operation counts, and so do outgoing TCP and UDP to local addresses.
- Failure is detectable. A Bonjour browser in `.waiting` reports `kDNSServiceErr_PolicyDenied`; a TCP `NWConnection` reports `unsatisfiedReason == .localNetworkDenied`. Apple also warns "the system may deny the operation immediately, before the user has responded to the alert", and that no API says whether access is granted (FB8711182). TN3179.
- Expo's launcher uses both. `checkLocalNetworkAccess()` starts an `NWListener` and an `NWBrowser`, reports `granted` when results appear, and maps `PolicyDenied` to `denied` and `NoAuth` to `misconfigured`. After 4 s with no verdict it returns `undetermined` rather than a failure, "because the system prompt may still be pending". [LocalNetworkVerdict.swift](https://github.com/expo/expo/blob/main/packages/expo-dev-launcher/ios/SwiftUI/LocalNetworkVerdict.swift), `DevLauncherViewModel.swift`.
- The launcher draws a different page for each state: denied points to Settings > Privacy & Security > Local Network with an Open Settings button; misconfigured says the build's Info.plist lacks `_expo._tcp` and to re-run prebuild; undetermined says access could not be verified. [LocalNetworkPermissionView.swift](https://github.com/expo/expo/blob/main/packages/expo-dev-launcher/ios/SwiftUI/LocalNetworkPermissionView.swift).
- The Simulator cannot show the prompt: "The simulator doesn't support local network privacy; test on a device." TN3179.

### The computer side on macOS

From TN3179, which is the authority here:

| Operation | Needs Local Network access |
|---|---|
| Listening for and accepting incoming TCP | no |
| Receiving incoming UDP unicast | no |
| Sending UDP multicast or broadcast | yes |
| Receiving incoming UDP multicast or broadcast | yes |
| Outgoing TCP, UDP unicast | yes |
| Any Bonjour operation (register, browse, resolve) | yes |

- Automatically allowed on macOS: "Any daemon started by launchd", "Any program running as root", and "Command-line tools run from Terminal or over SSH, including any child processes they spawn". The note says nothing about IDEs, so a tool started from an IDE is not exempt. It says the system will "block its local network operations until the user grants it" otherwise.
- The responsible process: "if your app spawns a helper tool and the helper tool performs a local network operation, macOS considers the app to be the responsible code." The choice is recorded for the whole app and shown under that app's name in System Settings. So a Node process started from the Antigravity terminal is judged as Antigravity.
- "macOS fails to display the local network alert when a process with a very short lifespan performs a local network operation (FB16131937)." Also: macOS keeps separate state per user account.
- Consequence for Expo: its dev server only accepts TCP and (if Bonjour is on) sends and receives mDNS multicast. Plain HTTP serving needs no permission, so the QR path works even when the computer side has been denied. Only the optional Bonjour advertisement is affected. This is an inference from TN3179's table, not something Expo documents.

### What happens when the computer's IP changes

- The URL is built from the IP found when the server started (`UrlCreator.init`, `cachedGateway`). A phone that scanned the old QR points at the old address. Nothing in the files read recovers it; restarting `expo start` and scanning again does.
- Bonjour is the recovery path in the dev launcher: the list is refreshed every 10 s and rebuilt after an empty result. Not verified: how the launcher treats a "recent" server whose IP has changed.

## How Argo does it

### The design (ADR-0045)

[ADR-0045](../adr/0045-pairing-gives-every-device-its-own-key.md) chose mDNS/Bonjour discovery, not UDP broadcast, with the phone remembering the name and not the address ("The phone remembers the name, not the address ... re-resolves on each connect"). The QR is the key delivery: it carries the Server's static public key, its discovery name, and a six-digit Ticket. Transport is a raw TCP socket with its own Noise-style handshake, because Android release builds refuse cleartext to LAN addresses. ADR open items say iOS was unverified (#1527, now closed with no comments) and that discovery by name on Android was proven only as far as "found".

### What the QR carries

`PairingInvite` has exactly three fields: `key`, `server` (the computer's name) and `ticket`. `packages/contracts/src/devices/pairing.ts:54-61`. There is no host or port. The sheet also lists `addresses` (`host:port`) next to the code for typing by hand: `pairing.ts:89-94`, filled by `listeningAddresses` in `packages/engine/src/network-access/listening-addresses.ts:4-7`.

The camera path calls `onRead(scanned)` with no address (`packages/client/src/screens/settings/servers/add/add-server-screen.tsx:105` passes `link.address` only for a link, not a camera scan), so for a scan `deps.address` is `undefined` (`packages/client/src/features/servers/pairing/pair-with-invite.ts:103-107`).

### Server side (advertising and the bind)

- Local network access is a stored switch. `packages/engine/src/network-access/local-network-access.ts:21-25`; off means loopback only (`packages/engine/src/engine/network-listener.ts:3-6`, `19-20`). On this machine the stored value is on (`local_network_access` row `1|1`) and `~/.argo/logs/engine.log` shows `listening on 0.0.0.0:7337` on every start today.
- mDNS is hand-rolled on `multicast-dns`, not Bonjour proper (`packages/engine/package.json:54` also lists `bonjour-service`, but `advertiser.ts` uses `multicast-dns`). `packages/engine/src/network-access/advertiser.ts:33` makes one responder per interface: `makeMdns({ interface: address, bind: '0.0.0.0' })`.
- Interfaces: `interfaceAddresses()` takes, for every interface name, the first IPv4 that is not internal (`advertiser.ts:9-14`). It does not skip `utun`, bridges or 169.254, and it is called once, when Local network access turns on (`advertiser.ts:108-110`). It is not refreshed when the address changes.
- Records per responder: PTR, SRV (target `argo-<hash>.local`), TXT `keyhash=<16-byte SHA-256 of the key, base64url>`, and an A record for that interface's address. `packages/engine/src/network-access/service-identity.ts:47-54`, `packages/contracts/src/devices/discovery.ts:12-33`. The instance name is the computer's name (`packages/engine/src/engine/announce-server.ts:6-8`), with dots replaced and cut to 50 characters (`service-identity.ts:19-23`). The port is `options.port` (7337 in dev).
- There is no probing or conflict detection in the responder, so two Servers using one computer name answer for the same instance name with different SRV and A data. That is the case the user saw.
- Send or join failures are logged as `could not announce ...` through `writeLog` (`advertiser.ts:47-55`). `~/.argo/logs/engine.log` holds one such line, from 2026-11-16: `could not announce: send EADDRNOTAVAIL 224.0.0.251:5353`. There is none for 2026-11-17 or 2026-11-18.
- `pnpm dev` runs `tsx src/main.ts --watch` in `apps/server/package.json:8`, which restarts the Engine on every file change. The log shows 15 starts on 2026-11-17/18. Tickets are minted in memory per open pair sheet (`packages/engine/src/pairing/router.ts:50-57`), so a restart between mint and scan leaves a code the new process has never seen.
- On this Mac only `en0` has an IPv4 address (192.168.1.172); `utun0-3`, `bridge0`, `awdl0` and `llw0` have none. So multiple-interface choice is not the cause on this machine today.

### Phone side (browse, resolve, connect)

- Browsing: `react-native-zeroconf` scans `_argo._tcp`. `packages/client/src/features/connection/discovery/browse-servers.native.ts:10-18`. The `error` event is swallowed with a comment ("A denied permission or a missing service type arrives here; the list stays empty") (`:16-17`). Servers are stored by `service.name` (`:14`), and only IPv4 addresses are kept (`packages/contracts/src/devices/discovery.ts:27-39`).
- Resolve: `resolveServer` waits for an announcement whose `keyhash` matches the QR's key, for 3000 ms (`packages/client/src/features/connection/discovery/resolve-server.ts:29`, `78-88`, `128-136`). If none is heard it uses the stored address, and with no stored address throws `ServerNotFoundError` (`:112-121`). With a QR scan there is no stored address.
- Connect: `pairOnAny` tries each announced host in the order given, once each, over a raw TCP socket with a 4 s connect timeout. `pair-with-invite.ts:92-101`; `packages/client/src/features/connection/api/channel/channel-platform.native.ts:31-50`. Every error that is not a refusal is read as "wrong address". The link-local-last ordering added in 09e4e0c17 is in `channel-route.ts:15-31` and applies to paired Connections only, not to Pairing.
- Everything in `pairWithInvite` ends in `{ kind: 'not-found' }` on any thrown error (`pair-with-invite.ts:117-123`), and that outcome is drawn as "Can't find <Mac name>" with "It may be asleep or turned off, or this phone may be on a different Wi-Fi." (`packages/client/src/screens/settings/servers/add/pair-copy.ts:76-84`).
- "Waiting" is drawn before anything is reached. `use-pair-server.ts:75-80`: `ask()` sets `{ phase: 'waiting', serverName }` and only then calls `pairWithInvite`, which begins with the 3 s browse (`pair-with-invite.ts:118`) and then up to 4 s for each address. So the claim in the symptom is true: "Waiting for approval" appears at once, for up to 3 s plus 4 s per address, before the phone has contacted any Server. The typed-code path is different: it shows `looking` first and `waiting` only from `onFound` (`type-code.ts:15`, `28-33`).
- iOS config: `apps/universal-app/app.json:14-16` declares `NSBonjourServices: ["_argo._tcp"]` and `NSLocalNetworkUsageDescription: "Argo finds your Server on the local network."`. This matches `discoveryServiceType` (`packages/contracts/src/product-identity.ts:10`). Only a native build made after that change carries the keys.

### The Allow prompt

The Server holds a registration only after the handshake completes and a live Ticket from the open pair sheet is spent. The sheet shows "<name> wants to pair" from those held registrations. `packages/engine/src/pairing/registrations.ts:18-47`, ADR-0045 ("The owner confirms on the Server Device"). A phone that never completes the handshake produces no prompt, so "Waiting" with no prompt means the handshake did not finish, not that the owner did not answer.

## Side by side

| | Expo (`expo start`, dev launcher) | Argo Pairing |
|---|---|---|
| What the QR holds | `exp://host:port` or `<scheme>://?__expo_url=<http://host:port>` ([UrlCreator.ts](https://github.com/expo/expo/blob/main/packages/@expo/cli/src/start/server/UrlCreator.ts)) | `{key, server name, ticket}`, no host, no port (`pairing.ts:54-61`) |
| Address source | OS default route via `lan-network`, one address ([ip.ts](https://github.com/expo/expo/blob/main/packages/@expo/cli/src/utils/ip.ts)) | Every interface's first IPv4, announced over mDNS only (`advertiser.ts:9-14`) |
| Override | `REACT_NATIVE_PACKAGER_HOSTNAME`, `EXPO_PACKAGER_PROXY_URL`, `--localhost`, `--tunnel` | None. A hand-typed `host:port` works only with a typed code |
| Bonjour | Optional extra: `_expo._tcp`, on by default when interactive | The only way to find the Server from a scan |
| Phone's browser | `NWBrowser` / `NsdManager`, plus `/status` check | `react-native-zeroconf`, matched by `keyhash`, 3 s |
| Responder | `dnssd-advertise` | Own `multicast-dns` code, no conflict handling |
| Transport | HTTP and a WebSocket (`/hot`) | Raw TCP, Noise-style handshake, tRPC inside (ADR-0045) |
| Connect timeout | 3 s to a found server, 7 s overall (dev launcher) | 4 s per address (`channel-platform.native.ts:32`) |
| Permission handling | Detects `PolicyDenied`, `NoAuth`, "undetermined" and shows a page for each | `error` event swallowed (`browse-servers.native.ts:17`); every failure is "Can't find" |
| Prompt still pending | 4 s probe returns `undetermined`, not failure | 3 s timer runs on, then `not-found` |
| Computer needs Local Network? | Only for the optional Bonjour; HTTP serving needs none (TN3179) | Yes: mDNS sends and receives multicast (TN3179) |
| IP changes | Restart and rescan; launcher re-browses every 10 s | Announced addresses are fixed at start (`advertiser.ts:108`) |
| Waiting UI | n/a | Shown before anything is reached (`use-pair-server.ts:78`) |

## Why Argo pairing may fail, most likely first

The log shows the Server is listening on `0.0.0.0:7337` and announcing without a logged error on 2026-11-17 and 2026-11-18, and that this Mac has one IPv4 interface. That moves suspicion toward the phone's browse and toward what an mDNS packet needs to cross.

### 1. No address in the QR, so any mDNS failure ends the attempt

- Evidence: `pairing.ts:54-61` (no host); `add-server-screen.tsx:105` and `pair-with-invite.ts:103-107` (no address on a scan); `resolve-server.ts:112-121` (throws with none); `pair-with-invite.ts:117-123` (any throw becomes `not-found`, which draws "Can't find <Mac name>"). Expo's QR carries `host:port` and Bonjour is only extra ([UrlCreator.ts](https://github.com/expo/expo/blob/main/packages/@expo/cli/src/start/server/UrlCreator.ts)).
- This makes every cause below fatal. It also explains why the same Mac can fail to pair while Metro on 8337 loads fine on the phone.
- Check: on the phone, open `http://192.168.1.172:8337` in Safari (use the Mac's `en0` address). If it loads, unicast works and the problem is mDNS or the app's handling of it. Then type the code with `192.168.1.172:7337` in Enter code (`typed-address.ts`, `pair-with-typed-code.ts:50-55`); if that pairs, discovery is the sole fault.
- Fix: put the Server's address and port in the QR (see "What Argo could adopt").

### 2. The phone's browse is denied, undetermined or unlinked, and Argo cannot tell

- Evidence: `browse-servers.native.ts:16-17` swallows `error`; `resolve-server.ts:29` gives 3 s, which a user reading the first-run prompt will exceed (Expo's probe returns `undetermined` after 4 s precisely "because the system prompt may still be pending", `DevLauncherViewModel.swift`; Apple: "the system may deny the operation immediately, before the user has responded to the alert", [TN3179](https://developer.apple.com/documentation/technotes/tn3179-understanding-local-network-privacy)). Apple also says a denied TCP connection becomes `.localNetworkDenied` and, when access is later granted, "the system automatically retries", so a tap on Allow after 3 s never helps this attempt. The ADR names iOS as unverified (#1527 is closed with no recorded result), and `browse-servers.native.ts:9` still carries "Unverified on a device".
- Also possible: the installed build predates the `NSBonjourServices` change in `app.json:14-16`, or runs in Expo Go, which has none of Argo's native modules. Expo's launcher draws a "misconfigured" page for exactly this ([LocalNetworkPermissionView.swift](https://github.com/expo/expo/blob/main/packages/expo-dev-launcher/ios/SwiftUI/LocalNetworkPermissionView.swift)).
- Check: on the phone, Settings > Privacy & Security > Local Network, and see that Argo is listed and on. Delete and reinstall the app to get the prompt again, then wait for it before the 3 s ends. Use a Bonjour browser app to confirm `_argo._tcp` is visible from the phone. Run `plutil -p` on the built app's Info.plist (or inspect the dev build) for `NSBonjourServices`.
- Fix: log the zeroconf `error` event, map it to a "Local network access is off for Argo" page with an Open Settings button, and give the first browse the 4 s-then-undetermined behaviour Expo uses.

### 3. The Node process lacks macOS Local Network permission (symptom a)

- Evidence: mDNS needs Local Network on the computer (`advertiser.ts:33`, TN3179's table: sending and receiving multicast need it). The responsible process of a Node child started from the Antigravity terminal is Antigravity (TN3179), and the exemption covers only Terminal.app and SSH. The symptom order (a) fits: it appeared while Antigravity lacked permission.
- Counter-evidence: the log has no `could not announce` after 2026-11-16, and the one line from then (`EADDRNOTAVAIL`) is about an address, not permission. TN3179 does not say what error a denied multicast send raises, so silence in the log does not prove the send worked. Also, Apple notes per-user state, and a granted-but-not-restarted app keeps the old denial for processes already running.
- Check: quit Antigravity completely after granting, then start `pnpm dev` from Terminal.app (exempt per TN3179). If pairing then works, Antigravity's permission is the cause. From a second device on the Wi-Fi, run `dns-sd -B _argo._tcp` or use a Bonjour browser; on the Mac, `dns-sd -L "<computer name>" _argo._tcp local` from Terminal.
- Fix: document starting the dev Server from Terminal.app, or from an app granted Local Network. The Server cannot tell it is denied, so have it log a line at start naming what it announced and where.

### 4. Two Servers with one name collapse into one (symptom b, earlier)

- Evidence: `browse-servers.native.ts:14` stores by `service.name`; both Servers announce the instance `<computer name>._argo._tcp.local` (`service-identity.ts:41`, `announce-server.ts:6-8`), and `advertiser.ts` does no probing or conflict handling. The second record replaces the first on the phone and the `keyhash` of the one kept may be the other Server's. The handshake would then fail (wrong key), the address is skipped, and the end is "Can't find".
- Check: `dns-sd -B _argo._tcp` and `dns-sd -L` show two records with the same name. Quit every other Argo (desktop app, second worktree) and retry.
- Fix: key `HeardServers` by name plus `keyhash`, and add the key hash to the instance name or run a probe before announcing.

### 5. "Waiting for approval" is drawn before the phone reaches anything (symptom b)

- Evidence: `use-pair-server.ts:75-80`, then up to 3 s of browse and 4 s per address. A prompt appears only after the handshake completes and a live Ticket from the open sheet is spent (`registrations.ts:18-47`, ADR-0045). With a restart from `--watch` (`apps/server/package.json:8`) between mint and scan, the Ticket is unknown to the new process.
- This is a defect in what the user is told rather than a cause of failure, but it hides the real stage. Waiting for approval with no prompt then means the connection never completed. Possible paths: the browse is still running; every announced address timed out at 4 s; or a Ticket from a previous process.
- Check: watch `~/.argo/logs/engine.log` while scanning. A `listening on` line (a restart) between minting and scanning answers it. Mint again with the sheet open after the Server is quiet.
- Fix: draw `looking` first, as the typed-code path does (`type-code.ts:15`), and move to `waiting` only once the handshake completes. Name the stage in the copy.

### 6. mDNS does not cross the router, or the phone's Wi-Fi is on a different segment

- Evidence: Argo needs multicast to cross between the phone and the Mac. Expo's QR needs only unicast. Wi-Fi client isolation, a guest SSID, or multicast filtering gives "Can't find" with a working Metro.
- Check: if hypothesis 1's Safari test loads Metro but a Bonjour browser on the phone lists nothing from the Mac, this is it (while another service such as the Mac's own AirPlay appears, that tells the phone can browse at all).
- Fix: the QR address (see below).

### 7. Interface choice, address staleness and ordering

- Evidence: `interfaceAddresses()` takes every non-internal interface's first IPv4 once at start (`advertiser.ts:9-14`, `108-110`), so a laptop that changes network after the Server starts announces a dead address until Local network access is switched. `pair-with-invite.ts:92-101` tries addresses in announced order with a 4 s wait each and no link-local-last rule (that exists only in `channel-route.ts:15-31`). Expo asks the OS for a single route ([lan-network](https://github.com/kitten/lan-network/blob/main/README.md)).
- Not the cause on this Mac today, where only `en0` has an IPv4 address, but it can be on a machine with a VPN, Docker bridge or Ethernet.
- Check: `ifconfig | grep -E "^[a-z0-9]+:|inet "` on the Mac; compare with the addresses in `dns-sd -L`.
- Fix: re-run `interfaceAddresses()` on network change; order Pairing hosts like `channel-route.ts`.

## What Argo could adopt from Expo

- Put the address in the QR. A QR can carry `addresses` or one `host:port` beside the key, name and Ticket (the sheet already computes them at mint: `MintedPairingTicket.addresses`, `pairing.ts:89-94`, `router.ts:27`). The phone would try those first and use mDNS for later address changes, as the ADR already wants. This is what Expo does, and it makes Bonjour an improvement rather than a requirement. It contradicts nothing in ADR-0045's "the address is a hint". Ask the owner, because the QR is a visible and cryptographic surface, and say which ADR it touches.
- A manual fallback. The sheet already shows `host:port` and the typed path takes one (`typed-address.ts`). Offer the same after a scan fails, instead of "Can't find". Expo's equivalent is `REACT_NATIVE_PACKAGER_HOSTNAME`, and `--tunnel` is the documented answer for a network where LAN does not work.
- An override of the advertised host for the dev Server, like `REACT_NATIVE_PACKAGER_HOSTNAME` (read in [env.ts](https://github.com/expo/expo/blob/main/packages/@expo/cli/src/utils/env.ts)), for machines with VPNs and bridges.
- Permission states. Copy Expo's four verdicts (granted, denied, misconfigured, undetermined) and the "undetermined after 4 s is not failure" rule ([LocalNetworkVerdict.swift](https://github.com/expo/expo/blob/main/packages/expo-dev-launcher/ios/SwiftUI/LocalNetworkVerdict.swift), `DevLauncherViewModel.swift`), with a page that opens Settings.
- A liveness check after resolve. Expo does not trust a Bonjour result until `GET /status` answers. Argo's counterpart is the handshake, which is stronger, so nothing to adopt there.
- Not recommended: an HTTP and WebSocket transport. Expo's cleartext HTTP works because a development build can carry the exemptions; ADR-0045 measured that a release Android build refuses `ws://` and `http://` to a LAN address, and chose a raw socket on that evidence. The transport is not what fails here: the symptoms are about finding the Server.
- Not verified and worth a short spike: whether `react-native-zeroconf` 0.17.7 (`pnpm-workspace.yaml:161`) surfaces `PolicyDenied` on iOS, since Expo's launcher reads that code from `NWBrowser`. If it does not, an `NWBrowser`-based module is what gives Expo its verdicts.
