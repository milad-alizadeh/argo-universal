# Slow-network tests

`packages/client/mocks/slow-network.ts` wraps `ChannelPlatform.openSocket` so an integration test can run the real channel (handshake, tRPC, Feed) over a Connection with latency and limited bandwidth, in each direction. Use it to prove that a transport change is faster in CI, not only on a phone.

Most tests want the phone helpers in `packages/client/mocks/slow-channel-client.ts`:

```ts
import { firstPageMs, phoneOn } from '../../../../../mocks/slow-channel-client';
import { badWifi } from '../../../../../mocks/slow-network';

const phone = await phoneOn(host, badWifi); // a paired Device on bad Wi-Fi; omit the profile for a direct one
const { ms, rows } = await firstPageMs(phone, sessionId);

await phone.close();
```

To build a platform by hand, wrap its `openSocket`:

```ts
const platform = nodeChannelPlatform(device);
const slow = {
  ...platform,
  openSocket: slowNetwork(platform.openSocket, badWifi),
};
```

## Profile

A `NetworkProfile` is `{ up, down }`, where each side is a `Link`:

- `latencyMs`: how long a byte takes to cross.
- `bytesPerSecond`: the link's bandwidth. A chunk occupies the link for `length / bytesPerSecond`, and the next chunk queues behind it. An idle link is free again.

Leave a field out for none. `up` is App to Server. `badWifi` is 60 ms each way, 250 KB/s up and 500 KB/s down. Opening the socket costs one round trip (`up + down` latency). Each direction delivers from one queue, so bytes and closes keep their order.

## Chaining with other socket wrappers

`slowNetwork(open, profile)` takes an `OpenSocket` and returns an `OpenSocket`, so it chains with any other wrapper of `openSocket`. `silenceable(open)` (from `mocks/node-channel-platform.ts`) returns `{ openSocket, sockets, silence(), close() }`, so pass its `openSocket`. Wrap in the order that says what you mean:

- `slowNetwork(silenceable(open).openSocket, profile)`: the silence sits at the real socket. Bytes already in flight on the slow link reach it after their delay and are dropped there.
- `silenceable(slowNetwork(open, profile))`: the silence sits at the App's end. Bytes already in flight on the slow link still arrive there, and the App stops hearing them.

## Timing

`channel-slow-network.integration.test.ts` records how long the first page of a seeded Feed takes, from a new channel to the rows, direct and over `badWifi`, and prints both. The test asserts only the profile's own floor, not a comparison of two wall-clock runs. Run it alone and read the line it prints:

```
pnpm --filter @repo/client exec vitest run channel-slow-network --disableConsoleIntercept
```

A later ticket reuses `phoneOn` and `firstPageMs`, and compares its number with the baseline recorded in the PR. Timings use real timers, so quote a few runs, not one. Unit tests of the wrapper itself use fake timers (`slow-network.test.ts`).
