import type { OperationId } from '@repo/contracts/operations';
import { TRPCError } from '@trpc/server';

type QueueCaller = { kind: string; id: OperationId };

export function requireAppQueueCaller(caller: QueueCaller): void {
  if (caller.kind === 'app') return;

  if (['session.submit', 'session.queue'].includes(caller.id))
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Only an App can submit or manage user Queued Prompts',
    });
}
