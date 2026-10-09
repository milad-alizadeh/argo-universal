import { fileURLToPath } from 'node:url';
import { expect, it, onTestFinished, vi } from 'vitest';
import { resourceOpening } from '#mocks/acp-resource';
import { createAcpResources } from '../index';

it('the production launch port owns a real stdio process and observes its final exit', async () => {
  const base = resourceOpening();
  const resources = createAcpResources();
  onTestFinished(() => resources.shutdown());
  vi.stubEnv('ARGO_348_AMBIENT', 'ambient');
  vi.stubEnv('NODE_ENV', 'test');
  const lease = await resources.open({
    ...base,
    launch: {
      ...base.launch,
      executable: process.execPath,
      cwd: process.cwd(),
      env: { ARGO_348_PRESENT: 'captured' },
      args: [
        fileURLToPath(
          new URL('../../../../mocks/acp-process.mts', import.meta.url),
        ),
      ],
    },
  });
  expect(lease.initialization.protocolVersion).toBe(1);
  expect(lease.initialization._meta).toEqual({
    present: 'captured',
    ambient: null,
    nodeEnv: null,
  });
  expect(process.kill(Number(lease.sessionId), 0)).toBe(true);
  await lease.close();
  await lease.released;
  expect(() => process.kill(Number(lease.sessionId), 0)).toThrow('ESRCH');
});
