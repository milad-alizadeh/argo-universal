import { fileURLToPath } from 'node:url';
import { expect, it, onTestFinished, vi } from 'vitest';
import { resourceDestination, resourceOpening } from '#mocks/acp-resource';
import { createAcpResources } from '../index';

it('a missing executable rejects opening and releases the production resource after child closure', async () => {
  const resources = createAcpResources();
  const failures: unknown[] = [];
  const base = resourceOpening({
    ...resourceDestination(),
    failed: (error) => {
      failures.push(error);
    },
  });
  const executable = `/missing-argo-agent-${crypto.randomUUID()}`;
  const input = {
    ...base,
    launch: { ...base.launch, executable, cwd: process.cwd() },
  };
  const opening = resources.open(input);
  void opening.catch(() => {});
  await vi.waitFor(() =>
    expect(failures).toContainEqual(
      expect.objectContaining({ code: 'ENOENT' }),
    ),
  );
  await expect(opening).rejects.toMatchObject({
    code: 'ENOENT',
    path: executable,
  });
  await expect(resources.open(input)).rejects.toMatchObject({
    code: 'ENOENT',
    path: executable,
  });
  await expect(resources.shutdown()).resolves.toBeUndefined();
});

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
