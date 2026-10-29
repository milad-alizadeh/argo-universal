import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { operationCaller, runOperation } from '#mocks/operations';

it('refuses an unknown Operation id as a bad request that names it', async () => {
  const caller = await operationCaller(await startEngineTestHost());

  await expect(
    runOperation(caller.operations, { id: 'nope.thing', params: {} }),
  ).rejects.toMatchObject({
    data: { code: 'BAD_REQUEST' },
    message: expect.stringContaining('Unknown Operation nope.thing'),
  });
});
