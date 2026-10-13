import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { installationPorts, startInstallEngine } from '#mocks/installation';

it('a failed replacement leaves the previous working selection usable', async () => {
  let fail = false;

  const host = await startInstallEngine(undefined, {
    ...installationPorts,
    runTool: async (input) => {
      if (fail) throw new Error('Node.js is required on the Server');

      return installationPorts.runTool(input);
    },
  });

  await host.caller.agents.install({ agentId: host.agentId, version: '1.2.3' });
  await expect
    .poll(
      async () =>
        (await host.caller.agents.installStatus({ agentId: host.agentId }))
          .operation?.status,
    )
    .toBe('installed');
  const before = await host.caller.agents.configured();
  fail = true;
  await host.caller.agents.install({ agentId: host.agentId, version: '1.2.3' });
  await expect
    .poll(
      async () =>
        (await host.caller.agents.installStatus({ agentId: host.agentId }))
          .operation,
    )
    .toMatchObject({
      status: 'failed',
      failure: 'Node.js is required on the Server',
    });
  expect(await host.caller.agents.configured()).toEqual(before);
  await expect(
    host.caller.agents.installStatus({ agentId: host.agentId }),
  ).resolves.toMatchObject({ installation: { status: 'installed' } });
});

it('missing managed files invalidate installation while retaining its durable identity', async () => {
  const host = await startInstallEngine();
  await host.caller.agents.install({ agentId: host.agentId, version: '1.2.3' });
  await expect
    .poll(
      async () =>
        (await host.caller.agents.installStatus({ agentId: host.agentId }))
          .operation?.status,
    )
    .toBe('installed');
  await rm(join(host.home, 'agents'), { recursive: true, force: true });
  await expect(
    host.caller.agents.installStatus({ agentId: host.agentId }),
  ).resolves.toMatchObject({ installation: { status: 'failed' } });
  expect(await host.caller.agents.configured()).toContainEqual(
    expect.objectContaining({ id: host.agentId }),
  );
  expect(await host.caller.agents.list()).toContainEqual(
    expect.objectContaining({
      agent: host.agentId,
      availability: 'not_installed',
    }),
  );
});
