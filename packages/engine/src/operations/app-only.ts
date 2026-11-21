import { operations, type OperationId } from '@repo/contracts/operations';
import { TRPCError } from '@trpc/server';
import { operationPermission } from './operation-permission';

export const appOnlyRefusal = (id: string): TRPCError =>
  new TRPCError({ code: 'FORBIDDEN', message: `Only an App can run ${id}` });

export function requireAppCaller(caller: {
  kind: string;
  id: OperationId;
}): void {
  if (
    operationPermission(operations[caller.id].policy, caller.kind === 'app') ===
    'person-only'
  )
    throw appOnlyRefusal(caller.id);
}
