import { OperationExecution } from '@repo/contracts/operations';
import { assert, expect, it } from 'vitest';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import { fixtureRegistry } from '#mocks/agent-fixtures';
import { operationRaceHost, beginHeldTurn } from '#mocks/operation-race';
import { runOperation } from '#mocks/operations';

it('keeps the native full JSON Blob reference when a resumed Operation result needs a Feed preview', async () => {
  const registry = fixtureRegistry([
    { agent: 'mock', label: 'Registry '.repeat(10_000), logo: '' },
  ]);

  const { host, session } = await operationRaceHost(undefined, async () =>
    JSON.stringify(registry),
  );

  await beginHeldTurn(host, session.sessionId);

  const pending = OperationExecution.parse(
    await runOperation(session.caller.operations, {
      id: 'registry.refresh',
      params: {},
    }),
  );

  const snapshot = await waitForAcpSnapshot(
    host,
    session.sessionId,
    (value) => value.pendingPermission !== null,
  );

  assert(snapshot.pendingPermission);
  await host.caller.session.answerPermission({
    sessionId: session.sessionId,
    requestId: snapshot.pendingPermission.requestId,
    optionId: 'allow_once',
  });

  const settled = await session.caller.operations.wait.mutate({
    id: pending.id,
  });

  expect(settled).toMatchObject({
    status: 'settled',
    fullResult: { mime: 'application/json' },
  });
  assert(settled.fullResult);
  const url = `${host.url}/blobs/${settled.fullResult.blobId}`;
  const read = { headers: { origin: 'app://app' } };
  await expect.poll(async () => (await fetch(url, read)).status).toBe(200);
  const response = await fetch(url, read);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(await host.caller.registry.get());
}, 30_000);
