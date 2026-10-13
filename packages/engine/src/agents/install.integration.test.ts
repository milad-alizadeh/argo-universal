import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { installEntry, startInstallEngine } from '#mocks/installation';

it('refuses unsupported installation without saving a successful selection', async () => {
  const entry = {
    id: 'unsupported',
    name: 'Unsupported',
    description: 'Not for this Server',
    version: '1.2.3',
    license_url: 'https://example.org/license',
    distribution: {
      binary: {
        [process.platform === 'win32' ? 'darwin-aarch64' : 'windows-x86_64']: {
          archive: 'https://example.org/agent',
          cmd: './agent',
        },
      },
    },
  };
  const host = await startEngineTestHost({
    fetchAgents: async () => ({ version: '1.0.0', agents: [entry] }),
  });
  await host.caller.agents.syncCatalog();
  await expect
    .poll(async () => (await host.caller.agents.catalog()).syncStatus)
    .toBe('idle');
  const agent = (await host.caller.agents.catalog()).agents[0];
  if (!agent) throw new Error('Catalog did not contain the fixture');
  await host.caller.agents.install({ agentId: agent.id, version: '1.2.3' });
  await expect
    .poll(
      async () =>
        (await host.caller.agents.installStatus({ agentId: agent.id }))
          .operation,
    )
    .toMatchObject({
      status: 'failed',
      failure: expect.stringContaining('No distribution'),
    });
  expect(await host.caller.agents.configured()).not.toContainEqual(
    expect.objectContaining({ id: agent.id }),
  );
});

it.each(['binary', 'npx', 'uvx'] as const)(
  'installs the pinned %s release and restores its verified launch files after restart',
  async (kind) => {
    const host = await startInstallEngine(installEntry(kind));
    await host.caller.agents.install({
      agentId: host.agentId,
      version: '1.2.3',
    });
    await expect
      .poll(
        async () =>
          (await host.caller.agents.installStatus({ agentId: host.agentId }))
            .operation?.status,
      )
      .toBe('installed');
    await expect(
      host.caller.agents.installStatus({ agentId: host.agentId }),
    ).resolves.toMatchObject({
      installation: { status: 'installed', version: '1.2.3' },
    });
    await host.stop();
    const restarted = await startEngineTestHost({ home: host.home });
    await expect(
      restarted.caller.agents.installStatus({ agentId: host.agentId }),
    ).resolves.toEqual({
      installation: { status: 'installed', version: '1.2.3' },
      operation: null,
    });
  },
);
