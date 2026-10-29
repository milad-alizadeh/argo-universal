import type { PendingPermission } from '@repo/contracts';
import type { OperationId } from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { assert, expect } from 'vitest';
import { waitForAcpSnapshot } from './acp-feed';
import type { PermissionJourney } from './native-permission';
import { runOperation } from './operations';

export async function askOperation(
  { host, session }: Pick<PermissionJourney, 'host' | 'session'>,
  operation: { id: OperationId; params: Json },
): Promise<AskedOperation> {
  const outcome = Promise.allSettled([
    runOperation(session.caller.operations, { ...operation, wait: true }),
  ]);

  const pending = operationPermission(host, session.sessionId, operation.id);

  await expectPermissionBeforeOutcome(pending, outcome);
  const { pendingPermission: request } = await pending;
  assert(request);

  return { request, outcome };
}

const operationPermission = (
  host: PermissionJourney['host'],
  sessionId: string,
  id: OperationId,
): ReturnType<typeof waitForAcpSnapshot> =>
  waitForAcpSnapshot(
    host,
    sessionId,
    (value) => value.pendingPermission?.operation?.id === id,
  );

const expectPermissionBeforeOutcome = async (
  pending: Promise<unknown>,
  outcome: Promise<PromiseSettledResult<unknown>[]>,
): Promise<void> => {
  expect(await Promise.race([pending.then(() => 'permission'), outcome])).toBe(
    'permission',
  );
};

type AskedOperation = {
  request: PendingPermission;
  outcome: Promise<PromiseSettledResult<unknown>[]>;
};
