import { TRPCError } from '@trpc/server';
import {
  identityOf,
  serverDeviceIdentity,
  type RpcIdentity,
  type RpcSocket,
} from '../rpc/identity';

/*
 * The Device a caller is: the one its channel's handshake named, or the Server Device when the caller itself proved it (ADR-0045).
 * A caller who proved neither is nobody, and no procedure serves nobody (#1696). A Connection the handshake named is asked nothing, so a channel's own calls are never reported as unproved.
 */
export function provenIdentity(
  socket: RpcSocket,
  proves: () => boolean,
): RpcIdentity | undefined {
  return identityOf(socket) ?? (proves() ? serverDeviceIdentity : undefined);
}

// A caller who showed a token the Server does not know is told so, which is what the CLI prints when `ARGO_TOKEN` is stale; one who showed nothing at all is refused by the procedure it called.
export function refuseUnknownToken(
  identity: RpcIdentity | undefined,
  token: string | undefined,
): void {
  if (identity || token === undefined) return;

  throw new TRPCError({
    code: 'UNAUTHORIZED',
    message: 'An Argo token is required',
  });
}
