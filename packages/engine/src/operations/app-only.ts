import type { OperationId } from '@repo/contracts/operations';
import { appOnlyOperationIds } from '@repo/contracts/operations/catalog';
import { TRPCError } from '@trpc/server';

// No other caller sees an App-only Operation listed, and each refuses one; the catalog says which they are.
export const isAppOnly = (id: string): boolean => appOnlyOperationIds.has(id);

export const appOnlyRefusal = (id: OperationId): TRPCError =>
  new TRPCError({ code: 'FORBIDDEN', message: `Only an App can run ${id}` });

type Caller = { kind: string; id: OperationId };

export function requireAppCaller(caller: Caller): void {
  if (caller.kind !== 'app' && isAppOnly(caller.id))
    throw appOnlyRefusal(caller.id);
}
