import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { resourceOpening } from '#mocks/acp-resource';
import { createAcpResources } from '../index';

it('the production launch port owns a real stdio process and observes its final exit', async () => {
  const base = resourceOpening();
  const resources = createAcpResources();
  const lease = await resources.open({
    ...base,
    launch: {
      ...base.launch,
      executable: process.execPath,
      cwd: process.cwd(),
      env: {},
      args: [
        fileURLToPath(
          new URL('../../../../mocks/acp-process.mts', import.meta.url),
        ),
      ],
    },
  });
  expect(lease.initialization.protocolVersion).toBe(1);
  expect(process.kill(Number(lease.sessionId), 0)).toBe(true);
  await lease.close();
  await lease.released;
  expect(() => process.kill(Number(lease.sessionId), 0)).toThrow('ESRCH');
});
