import { OperationExecution } from '@repo/contracts/operations';
import { assert, expect, it } from 'vitest';
import { fixtureRegistry } from '#mocks/agent-fixtures';
import { operationRaceHost, beginHeldTurn } from '#mocks/operation-race';
import { TestOperationWaitClock } from '#mocks/operation-wait-clock';
import { runOperation } from '#mocks/operations';

it('keeps the native full JSON Blob reference when a resumed Operation result needs a Feed preview', async () => {
  const registry = fixtureRegistry([
    { agent: 'mock', label: 'Registry '.repeat(10_000), logo: '' },
  ]);

  const clock = new TestOperationWaitClock();
  const release = Promise.withResolvers<string>();
  let holding = false;

  const { host, session } = await operationRaceHost(clock, async () =>
    holding ? release.promise : JSON.stringify(registry),
  );

  await beginHeldTurn(host, session.sessionId);

  holding = true;

  const run = runOperation(session.caller.operations, {
    id: 'registry.refresh',
    params: {},
    timeoutMs: 10,
  });

  await clock.waitUntilScheduled();
  clock.advance(10);
  const pending = OperationExecution.parse(await run);
  release.resolve(JSON.stringify(registry));

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
