# Testing a Server away from home (Tailscale)

Tailscale is an optional route for testing, not a requirement ([ADR-0045](../adr/0045-pairing-gives-every-device-its-own-key.md) rejects it as one). The phone reaches the Server Device's `100.x` tailnet address over the same channel and handshake as at home. No code switch is involved.

## Pair with Tailscale up

The pairing QR carries the Server Device's addresses at the moment it is shown, and the phone keeps every one. A tailnet address is in the QR only if Tailscale was up on the Server Device then.

1. Run Tailscale on the Server Device and on the phone, signed in to the same tailnet.
2. Turn on Local network access (Settings). The Server binds `0.0.0.0` only then.
3. Open Pair a Device and scan the QR from the phone. A `100.x` address is among the kept addresses.

A phone paired without Tailscale up keeps no tailnet address. Unpair, then pair again with Tailscale up. Alternatively type `<computer>.<tailnet>.ts.net:<port>` as the address when pairing.

## Test from cellular

1. Turn Wi-Fi off on the phone, so only cellular and Tailscale carry traffic.
2. Force-quit and reopen the App, a cold start.
3. The Connection comes up on the `100.x` address. The App asks every kept address together and keeps the first that proves the Server's key, so the stale home address no longer costs the four-second wait.

For a repeatable slow link in CI, see `docs/agents/slow-network-tests.md`.

## Failure signs

- The Connection shows the Server unreachable: Tailscale is down on either side, or Local network access is off.
- It connects only on Wi-Fi: the pairing happened without Tailscale up. Pair again.
- iOS `ws://` to `100.x` is expected to work and is not yet verified on a device. Record the result here when you test it.

## Why the iOS App allows `ts.net` over `ws://`

The channel's socket on iOS is `URLSessionWebSocketTask`, which App Transport Security polices (React Native's own WebSocket was not). `app.json` therefore sets `NSAllowsLocalNetworking` for LAN and IP addresses and an exception for `ts.net` (`NSIncludesSubdomains`, `NSExceptionAllowsInsecureHTTPLoads`), so a typed `<computer>.<tailnet>.ts.net:<port>` is not blocked. The outer transport is plaintext, but everything inside is encrypted and authenticated by the Noise channel (ADR-0045).
