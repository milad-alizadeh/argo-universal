import type { ACPAgent } from '@repo/contracts';
import { createInstallationPorts } from '@repo/mocks/registry/installation';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { installEntry } from '#mocks/installation';

it('refresh and catalog removal retain the offline launch until an explicit pinned update', async () => {
  let entry: ACPAgent = installEntry('npx');
  let entries = [entry],
    ports = createInstallationPorts();
  const host = await startEngineTestHost({
    installationPorts: {
      download: (url, signal) => ports.download(url, signal),
      runTool: (input) => ports.runTool(input),
    },
    fetchAgents: async () => ({ version: '1.0.0', agents: entries }),
  });
  const sync = async (): Promise<void> => {
    await host.caller.agents.syncCatalog();
    await expect
      .poll(async () => (await host.caller.agents.catalog()).syncStatus)
      .toBe('idle');
  };
  await sync();
  const agentId = (await host.caller.agents.catalog()).agents[0]?.id;
  if (!agentId) throw new Error('Missing fixture Agent');
  await host.caller.agents.install({ agentId, version: '1.2.3' });
  await expect
    .poll(
      async () =>
        (await host.caller.agents.installStatus({ agentId })).operation?.status,
    )
    .toBe('installed');
  const configured = await host.caller.agents.configured();
  entry = {
    ...entry,
    version: '2.0.0',
    distribution: { npx: { package: 'fixture-install@2.0.0' } },
  };
  entries = [entry];
  await sync();
  expect(await host.caller.agents.configured()).toEqual(configured);
  expect(await host.caller.agents.list()).toContainEqual(
    expect.objectContaining({
      agent: agentId,
      version: '1.2.3',
      availableVersion: '2.0.0',
    }),
  );
  entries = [];
  await sync();
  expect((await host.caller.agents.catalog()).agents).toEqual([]);
  expect(await host.caller.agents.configured()).toEqual(configured);
  await host.stop();
  const restarted = await startEngineTestHost({
    home: host.home,
    installationPorts: {
      download: (url, signal) => ports.download(url, signal),
      runTool: (input) => ports.runTool(input),
    },
    fetchAgents: async () => ({ version: '1.0.0', agents: [entry] }),
  });
  await expect(
    restarted.caller.agents.installStatus({ agentId }),
  ).resolves.toMatchObject({
    installation: { status: 'installed', version: '1.2.3' },
  });
  await restarted.caller.agents.syncCatalog();
  await expect
    .poll(async () => (await restarted.caller.agents.catalog()).syncStatus)
    .toBe('idle');
  ports = createInstallationPorts({ version: '2.0.0' });
  await restarted.caller.agents.install({ agentId, version: '2.0.0' });
  await expect
    .poll(
      async () =>
        (await restarted.caller.agents.installStatus({ agentId })).installation,
    )
    .toMatchObject({ status: 'installed', version: '2.0.0' });
  expect(await restarted.caller.agents.configured()).toContainEqual(
    expect.objectContaining({ id: agentId }),
  );
});
