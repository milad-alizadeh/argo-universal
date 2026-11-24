# Slow-network tests

`packages/client/mocks/slow-network.ts` wraps `ChannelPlatform.openSocket` so an integration test can run the real channel (handshake, tRPC, Feed) over a Connection with latency and limited bandwidth, in each direction. Use it to prove that a transport change is faster in CI, not only on a phone.

```ts
import { badWifi, slowNetwork } from '../../mocks/slow-network';

const platform = nodeChannelPlatform(device);
const slow = { ...platform, openSocket: slowNetwork(platform.openSocket, badWifi) };
```

Pass `slow` to `createChannelTransport`, as `channel-slow-network.integration.test.ts` does.

## Profile

A `NetworkProfile` is `{ up, down }`, where each side is a `Link`:

- `latencyMs`: how long a byte takes to cross.
- `bytesPerSecond`: the link's bandwidth. A chunk occupies the link for `length / bytesPerSecond`, and the next chunk queues behind it.

Leave a field out for none. `up` is App to Server. `badWifi` is 60 ms each way, 250 KB/s up and 500 KB/s down. Opening the socket costs one round trip (`up + down` latency). Bytes and closes keep their order.

The wrapper wraps any `OpenSocket`, so it stacks with other test wrappers such as one that silences a socket: wrap the inner one, or wrap the slow one.

## Timing

`channel-slow-network.integration.test.ts` records how long the first page of a seeded Feed takes, from a new channel to the rows, direct and over `badWifi`, and prints both. Run it alone and read the line it prints:

```
pnpm --filter client exec vitest run channel-slow-network --disableConsoleIntercept
```

A later ticket reuses `phoneOn` and `firstPageMs` from that file (or moves them to `mocks/`), and compares its number with the baseline recorded in the PR. Timings use real timers, so quote a few runs, not one. Unit tests of the wrapper itself use fake timers (`slow-network.test.ts`).
