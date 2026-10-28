import type { PendingPermission } from '@repo/contracts';
import type { OperationId } from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { assert, expect } from 'vitest';
import { waitForAcpSnapshot } from './acp-feed';
import type { PermissionJourney } from './native-permission';

export async function askOperation(
  { host, session }: Pick<PermissionJourney, 'host' | 'session'>,
  operation: { id: OperationId; params: Json },
): Promise<AskedOperation> {
  const outcome = Promise.allSettled([
    session.caller.operations.run.mutate({ ...operation, wait: true }),
  ]);

  const pending = waitForAcpSnapshot(
    host,
    session.sessionId,
    (value) => value.pendingPermission?.operation?.id === operation.id,
  );

  expect(await Promise.race([pending.then(() => 'permission'), outcome])).toBe(
    'permission',
  );
  const { pendingPermission: request } = await pending;
  assert(request);

  return { request, outcome };
}

type AskedOperation = {
  request: PendingPermission;
  outcome: Promise<PromiseSettledResult<unknown>[]>;
};
