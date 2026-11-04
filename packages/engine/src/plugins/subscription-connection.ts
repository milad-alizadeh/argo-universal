import { liveConnection, type RpcConnection } from '../rpc';
import type { RpcContext } from '../rpc/connection';

export function requireSignal(signal: AbortSignal | undefined): AbortSignal {
  if (!signal) throw new Error('Plugin subscription signal is missing');

  return signal;
}

export const viewConnection = (ctx: RpcContext): RpcConnection =>
  liveConnection(ctx.connection, 'Plugin views require a live App Connection');

// A view or a live page lives while both the App Connection and its subscription are open.
export function connectionOf({
  ctx,
  signal,
}: {
  ctx: RpcContext;
  signal?: AbortSignal;
}): RpcConnection {
  const live = viewConnection(ctx);

  return {
    ...live,
    signal: signal ? AbortSignal.any([live.signal, signal]) : live.signal,
  };
}
