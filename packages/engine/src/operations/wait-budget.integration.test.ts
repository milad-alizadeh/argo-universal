import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { operationCaller } from '#mocks/operations';

it('rejects a wait budget beyond ninety seconds before running the Operation', async () => {
  const host = await startEngineTestHost();
  const caller = await operationCaller(host);

  await expect(
    caller.operations.run.mutate({
      id: 'agent.setAccess',
      params: { enabled: false },
      timeoutMs: 90_001,
    }),
  ).rejects.toMatchObject({ data: { code: 'BAD_REQUEST' } });
  expect(await host.caller.agent.getAccess()).toEqual({ enabled: true });
});
