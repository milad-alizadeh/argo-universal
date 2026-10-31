# Pairing gives every Device its own key, on an encrypted channel over the local network

This is the pairing and authentication protocol that [ADR-0002](0002-a-local-server-owns-all-machine-work.md) and [ADR-0022](0022-server-device-and-paired-devices.md) deferred to its own ADR, and it extends [ADR-0044](0044-argo-is-driven-through-one-operation-registry-and-the-argo-cli.md)'s list of procedures that are the user's alone (owner, 2026-10-30, grilling of 24 questions on Spec 0025 #1486).

The owner cannot open Argo on their phone. The Server binds `127.0.0.1` and has no authentication, so the only App that can reach it is one on the Server Device itself; a phone on the same Wi-Fi has no route in and no way to prove who it is. Pairing is therefore not a feature added to an authenticated Server. It is the first authentication the whole API has ever had, and the transport that carries every tRPC call has no path for a credential at all.

## What this replaces

- **ADR-0002's last paragraph on the bind and the checks.** "For now the Server binds to `127.0.0.1` only, without authentication" becomes: the Server binds loopback until the owner turns on Local network access, and every Connection beyond loopback is authenticated. `Host` checking (`requestHostAllowed`) is **deleted**, not kept beside the handshake. The `Origin` check stays, narrowly, to keep a web page in a browser out. The exception where plain HTTP serves `GET /blobs/:id` also goes, with `/plugin-assets/*`: bytes travel on the authenticated channel.
- **ADR-0002's "one WebSocket carrying every tRPC call", for native Apps only.** See the transport, below. Web and the desktop shell keep the WebSocket.
- **ADR-0022's "Still deferred: the pairing and authentication protocol", and with it "until then the Server binds `127.0.0.1`, every Connection is on the Server Device, and no paired Device exists".** ADR-0022's Server-Device-only list, its "the Server says where each Connection comes from", and its "a paired Device never sees the other Devices" all stand unchanged; this ADR only says how the Server knows. ADR-0022's keep-running-after-quit setting ships with Pairing rather than later, because `main.ts` stops a Supervisor it started when the desktop app quits, and a paired phone would read as broken every time a window closes.
- **ADR-0044's "the rest of tRPC stays open until Pairing" is now spent.** The control token for `operations.*` is unchanged and sits beside this, not under it: an Agent's token and a Device's key answer different questions.

## The trust model

- **The local network only.** No relay, no Tailscale, no internet reachability. Remote access stays a later spec, as ADR-0022 says.
- **One owner, no accounts, no roles.** A paired Device is the owner, minus ADR-0022's Server-Device-only list. There are no per-Device scopes and no permissions to configure, because there is nobody to configure them against.
- **No offline mode.** An App is a view onto a Server. Unreachable is a drawn state, not a local copy.

## The channel, and why the ticket is not the credential

The Server holds a long-term static keypair, made once and stored beside its identity, with `control.token`'s exclusive-create and `0600` handling. A connecting App must already know the public half; it reaches the App out of band, in a QR code on the Server Device's screen. A Device on the network that does not know it cannot complete a handshake. Both sides authenticate; the channel is encrypted. That much is the shape Paseo uses, and it is sound.

Paseo then stops, and that is its flaw: knowing the daemon's public key **is** the credential. Every paired Device holds the same secret, so no two are distinguishable and per-Device revocation is not merely unimplemented, it is structurally impossible. Argo separates the ticket from the credential, as Tailscale does.

- The QR carries the Server's static public key, the Server's discovery name, and a short-lived, single-use **Pairing Ticket**.
- The App makes its own long-term **Device Key** and sends the public half inside the completed handshake, with the Device name it claims.
- The Server stores one row per Device: id, public key, name, platform, paired at, last seen. The Server Device has a row, made with the Server.
- From then on the Device authenticates with its own key. The ticket is spent and never used again.
- **Unpairing is one row deleted.** It takes effect on the next record as well as the next connect: an open Connection from an unpaired Device is closed.

A ticket lives about two minutes and is good once. The pair sheet mints a new one and redraws the QR while it is open, so the code is still valid when the owner finally gets their phone out, and a photograph of the screen is not a lasting key. A spent or expired ticket gets its own refusal, distinct from every other, so the App can draw "This code has expired" and offer a new one instead of a mystery.

**The owner confirms on the Server Device.** The handshake completes, the claimed name arrives, and the Server holds the registration until the owner allows it ("iPhone 15 Pro wants to pair"). Scanning the code is not by itself enough. The claimed name is pre-authentication and untrusted: it is shown for recognition, as Syncthing shows one, and never used for a decision.

This confirmation is not built yet; it lands with the pair sheet in #1496. #1495 spends the Ticket inside the handshake, because admitting a Device and then asking would let it reach the API while the owner was still deciding. So until #1496, **holding a live Pairing Ticket is the whole gate**, and a Device that spends one is a paired Device at once.

**Replay and impersonation are refused by construction,** not by a check someone has to remember: a fresh ephemeral key per handshake, a record nonce each side takes from its own count of the records it has handled, and an App that aborts when the Server's static key is not the one it stored. A computer that answers to the right discovery name with the wrong key gets nowhere.

The record number is not a field on the wire and nothing checks it on receive. Both sides simply count, and a record that does not decrypt under the number the receiver has reached fails its authentication tag and ends the Connection — so a reordered or replayed record is refused without a counter ever being compared.

**`serverDevice` comes from the credential, not from the socket.** `RpcContext` today derives it from `socket.remoteAddress === socket.localAddress`. That comparison goes. The context carries the authenticated identity: the Server Device itself, or a paired Device with its id. Loopback stays a recognised identity — the Server Device's App does not pair with itself.

**Keys live in platform secure storage.** The Device Key goes in the iOS Keychain or the Android Keystore through `expo-secure-store`, a new dependency. A Device that cannot store a key securely is refused rather than half-trusted, so **Pairing is native and desktop only**: a browser has no secure storage, so a web App cannot be a Paired Device and web stays Server-Device-only. The typed-code path, for a Device with no camera, exists for a paired *desktop* Device, not for browsers.

**Each platform keeps the Device Key in its own store, and web keeps nothing** (owner, 2026-10-31). A paired desktop uses Electron's `safeStorage`, which encrypts with a key the OS keychain holds for the app, and the ciphertext sits in the app's `userData` directory with the Server's own exclusive-create and `0600` handling. No native module and no `keytar`: the one in Electron is enough, and it raises no prompt, so there is no desktop secure-store dialog to design. iOS and Android keep `expo-secure-store`. Web stores nothing at all, because a web App is Server-Device-only and has no Device Key to keep.

## The transport: the encrypted channel is the socket

The encrypted channel cannot sit on top of `ws://`. **It is the transport**, with tRPC riding inside it.

This was measured, not reasoned. The hardware spike (#1488) put a release Android build on a Pixel 8a against a Server on the local network. `ws://192.168.68.108:17731` closed with `CLEARTEXT communication to 192.168.68.108 not permitted by network security policy`; `http://` to the same address threw `UnknownServiceException` with the same text. A raw TCP socket to the same address, from the same APK, connected and read its bytes back. The APK declares no `usesCleartextTraffic` and no `networkSecurityConfig`: the refusal is the platform default. The network was never the problem. HTTP was.

The cheaper option was to declare a cleartext exemption and keep `ws://`. It is rejected. A `networkSecurityConfig` `domain-config` matches names, not address ranges, so for a LAN address the working form is app-wide `usesCleartextTraffic`, which opens cleartext for every other request the App makes. That is the concession this design named Home Assistant for, which shipped `NSAllowsArbitraryLoads=true`, permitted cleartext and added user CA trust anchors. `NSAllowsArbitraryLoads` stays `false`, no cleartext is permitted, and no user CA trust anchor is added.

**The constraint improves the design.** Had Android allowed cleartext on the LAN, nothing would have stopped a later change from quietly putting plain `ws://` there — a reconnect path simplified under deadline, a debugging shortcut left in. The platform now forbids the shortcut, so the only transport a native App has is the authenticated one. Spec 0025 already required an encrypted channel; what the measurement removed is the option of ever having one in name only.

**One port serves both** (#1495). The Server's single advertised port reads the first bytes of each socket and sends one that opens with the channel's own marker to the handshake; anything else is plain HTTP, admitted only from loopback and only as the Server Device. A second port would be a second thing to advertise, bind, rebind and keep in step with the first, and the port is not what authenticates anybody.

So: the Engine gains a listener for the channel; the App opens a raw socket and runs the handshake on it; tRPC's `wsLink` runs over a WebSocket-shaped shim on the channel rather than over `ws://`. Web and the desktop shell keep the WebSocket they have. `/blobs/:id` and `/plugin-assets/*` move onto the channel — a raw transport removes HTTP from the native path entirely, so there is no plain-HTTP route left to leave open by accident. If a Device can read an image, it is because it proved who it is.

## Finding the Server, and the bind

- **Listening beyond loopback is a switch, off by default.** Until **Local network access** is on, the Server binds `127.0.0.1` exactly as today and Pairing is unavailable in Settings. Turning it on rebinds and starts advertising; turning it off rebinds to loopback and stops. Nothing turns it on implicitly, and Pairing never turns it on as a side effect — installing Argo does not open a port.
- **Discovery by mDNS/Bonjour, not UDP broadcast.** Broadcast needs Apple's restricted multicast entitlement; mDNS needs only the declared service type and the standard local-network prompt. A multi-homed Server Device must advertise on **every interface it is bound to**: in the spike the Engine advertised on Ethernet only and the phone, on Wi-Fi, found nothing, while a registration covering Wi-Fi was found in 0.2 seconds.
- **The phone remembers the name, not the address.** It stores the Server's discovery name with the address as a fallback, re-resolves on each connect, and keeps whichever answer proves the stored static key. A rename, a new router and a new IP address therefore do not force re-pairing, because the Device Key and the Server's static key are the anchors and the address is a hint.
- **No MAC addresses anywhere.** Raised and rejected: they are not routable, a sandboxed App cannot read the peer's, iOS and Android randomise their own per network, and one computer has several.

## The surfaces

**Settings › Devices is the only entry point.** There is no pairing step in Get started: setup is desktop-only and a phone pairs afterwards. The Devices list puts the Server Device first, marked as this computer and with no remove action, so the owner cannot lock themselves out, then each paired Device with its name, platform and last seen. Names come from the Device's own platform; renaming is a later spec.

Unpair confirms first and offers no Undo toast, because it cannot be undone without the other Device present. A paired Device unpairs itself from the Server's row in its own list of Servers, since it has no Devices page; the word is "Unpair" in both directions.

**The phone holds a list of Servers from day one,** with one entry as the ordinary case. That is what makes a laptop both a Server Device for its own Server and a Paired Device for the desktop's: the Device heading in Settings keys off which Server is being looked at. **No copy says "Mac":** the Server Device may be Windows or Linux, which is why there is an Electron shell.

## Pairing is the user's alone, and no Operation

ADR-0044 establishes one Operation registry, and that whatever a user can do an Agent can — then excepts "consent, sign-in and presence, which are the user's alone", on the reasoning that keeping them out of the registry means none can leak to an Agent by mistake. **Pairing and unpairing a Device join that exception**, with the Local network access and keep-running-after-quit settings.

They belong there for the exception's own reason, and more plainly than anything already in it. An Agent calling `pairing.*` would be deciding who may reach the Server — a consent that is the owner's by definition, since the whole protocol exists so that a Device is trusted only when the person at the Server Device says so. An Agent that could mint a ticket or allow a registration would make the confirmation prompt theatre. One that could unpair would be able to cut the owner off from their own Server. And an Agent runs *inside* a Session on a Server a Device has already been trusted to reach: letting it widen that trust would let any paired Device pair another, which ADR-0022 forbids for the lost-phone reason.

So `pairing.*` and `devices.*`, and those two settings, are Server-Device-only and hand-written, never Operations, with no tier that could make them askable. A `serverDeviceProcedure` sits beside `publicProcedure` in `packages/engine/src/rpc/trpc.ts` and backs every one of them; the Server checks the list itself, from the authenticated context, because hiding a row in the App is not the check. The CI check from Spec 0022 (#1312) that refuses new hand-written tRPC mutations gets these added to its allowlist with the reason recorded.

`serverDeviceProcedure` does not exist yet either; it lands with #1497. #1495 built `publicProcedure`, which requires a proved identity and nothing more, so **until #1497 a paired Device can call `devices.list` and `system.setKeepRunning`** along with every other procedure. The identity it would narrow on is already carried in the context, so #1497 adds the procedure and the list rather than new plumbing.

## Still open

- **Whether a workable raw socket exists for React Native.** `react-native-tcp-socket` carried the spike, but a shim that tRPC's `wsLink` accepts over our channel is unverified, as is the socket surviving app backgrounding and Wi-Fi changes, which a phone does constantly. Settling this is the **first** job of #1495, before the protocol is built on top of it. If no workable socket module exists, this transport decision has to be revisited rather than worked around.
- **iOS is entirely unverified** (#1527). No iPhone was attached to the spike, and the Simulator shares the Mac's network stack so it cannot raise the local-network prompt. Unknown: whether the prompt appears, whether discovery works once granted, and whether `ws://` to a LAN address is allowed under `NSAllowsLocalNetworking` — Apple documents that it is, and if so iOS could keep the WebSocket while Android uses the socket, though one shared transport keeps one code path. This blocks the pairing screens.
- **Address resolution by discovery name on Android.** The Pixel found the advertisement in 0.2 seconds but no resolution to an address was observed in the App, so "discovery by name yields an address" is proven only as far as the find (#1494).

Everything in the spike was wrong at least once before it was right — a check run against loopback, a test against the wrong subnet, a hard-coded `listening on 127.0.0.1` log line, an advertisement on the wrong interface. Not one was a platform limit. Whoever reads this and measures something: verify the address and the interface a result came from before believing a failure.

## Considered Options

- **A relay, as Claude Code, Codex and Paseo all use.** Rejected by the owner: it would hand us discovery, publicly-trusted TLS and server-side revocation for free, and it puts the owner's code on somebody else's machine for a phone two metres away. The local network is the point, and the ticket/credential separation and the hardware spike are what make that choice safe.
- **Tailscale, which Paseo points its users at for a direct connection.** Rejected: it makes a second product a requirement for opening Argo on your own phone, on your own Wi-Fi.
- **The Pairing Ticket as the credential, as Paseo does.** Rejected: it makes paired Devices indistinguishable and per-Device revocation impossible, which breaks "an unpaired Device loses access immediately" and the Devices list itself.
- **`ws://` with a cleartext exemption in the Android network security config.** Rejected: at the transport layer it is cleartext HTTP, it is app-wide for a LAN address, and it is the Home Assistant concession this design exists to avoid. Measured as the only alternative that works, and declined anyway.
- **Keeping the `Host` allowlist beside the handshake.** Rejected: the handshake is the gate, and an allowlist of address spellings is a second half-check that will drift out of step with it. Two half-checks are worse than one check.
- **Deriving `serverDevice` by comparing socket addresses, as the code does.** Rejected: it answers a question about identity with a fact about plumbing, and the moment a second Device exists it answers it wrongly.
- **Leaving `/blobs/:id` on plain HTTP, since an image needs a URL.** Rejected: it is a side door that grows. On native there is no HTTP stack to serve it from anyway.
- **A web App as a Paired Device.** Rejected: no secure storage, so its key would sit somewhere readable, and a weak kind of paired Device is worse than none.
- **UDP broadcast for discovery.** Rejected: Apple's restricted multicast entitlement.
- **MAC addresses to identify a Device.** Rejected: see above; none of the four reasons has a workaround.
- **Turning on Local network access implicitly when the owner presses Pair a Device.** Rejected: the switch is how the owner learns what they are allowing, and a side effect is not a decision.
- **Per-Device scopes, so a phone could be read-only.** Rejected: one owner, and ADR-0022's Server-Device-only list is the only distinction that has a reason behind it.
