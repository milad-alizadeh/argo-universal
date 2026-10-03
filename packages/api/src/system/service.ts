import type { ClockTick, SystemInfo } from '@argo/contracts';

export interface SystemService {
  info(): SystemInfo;
  // tRPC passes no signal to a server-side call without one, so `undefined` is allowed.
  clock(signal: AbortSignal | undefined): AsyncIterable<ClockTick>;
}
