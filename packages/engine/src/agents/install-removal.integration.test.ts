import { access, readdir, rename, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { installationPorts, startInstallEngine } from '#mocks/installation';
import { waitForInstalledSelection } from '#mocks/installation-storage';

it('removal deletes managed files, retains the Agent identity and survives restart', async () => {
  const host = await startInstallEngine();
  const { agentId } = host;
  const credentials = join(host.home, 'upstream-credentials');
  await writeFile(credentials, 'owned by the Agent');
  await host.caller.agents.install({ agentId, version: '1.2.3' });
  await waitForInstalledSelection(host);
  await host.caller.agents.remove({ agentId });
  await expect(access(credentials)).resolves.toBeUndefined();
  expect(await readdir(join(host.home, 'agents'))).toEqual([]);
  await expect(host.caller.agents.installStatus({ agentId })).resolves.toEqual({
    installation: { status: 'not-installed' },
    operation: null,
  });
  await host.stop();
  const restarted = await startEngineTestHost({ home: host.home });
  expect(await restarted.caller.agents.configured()).toContainEqual(
    expect.objectContaining({
      id: agentId,
      configuration: expect.objectContaining({
        source: 'registry',
        release: null,
        removed: true,
      }),
    }),
  );
});

it('a disabled catalog id stays disabled through catalog sync, removal, reinstall and restart', async () => {
  const host = await startInstallEngine();
  const { agentId } = host;
  await host.caller.agents.install({ agentId, version: '1.2.3' });
  await waitForInstalledSelection(host);
  await host.caller.agents.setEnabled({ agentId, enabled: false });
  await host.caller.agents.syncCatalog();
  await expect
    .poll(async () => (await host.caller.agents.catalog()).syncStatus)
    .toBe('idle');
  await host.caller.agents.remove({ agentId });
  await host.caller.agents.install({ agentId, version: '1.2.3' });
  await waitForInstalledSelection(host);
  await host.stop();
  const restarted = await startEngineTestHost({ home: host.home });
  expect(await restarted.caller.agents.configured()).toContainEqual(
    expect.objectContaining({
      id: agentId,
      enabled: false,
      configuration: expect.objectContaining({ release: expect.any(String) }),
    }),
  );
});

it('removal refuses a redirected managed root and leaves its selection and external files intact', async () => {
  const host = await startInstallEngine();
  const { agentId } = host;
  await host.caller.agents.install({ agentId, version: '1.2.3' });
  await waitForInstalledSelection(host);
  const before = await host.caller.agents.configured();
  const external = join(host.home, 'external');
  await rename(join(host.home, 'agents'), external);
  await symlink(external, join(host.home, 'agents'));
  await expect(host.caller.agents.remove({ agentId })).rejects.toThrow(
    'symbolic link',
  );
  expect(await host.caller.agents.configured()).toEqual(before);
  expect(await readdir(external)).toHaveLength(1);
  await expect(
    host.caller.agents.installStatus({ agentId }),
  ).resolves.toMatchObject({ installation: { status: 'installed' } });
});

it('setup ownership refuses removal from another App until installation settles', async () => {
  const started = Promise.withResolvers<void>(),
    release = Promise.withResolvers<void>();
  const host = await startInstallEngine(undefined, {
    ...installationPorts,
    runTool: async (input) => {
      if (input.executable === 'npm') {
        started.resolve();
        await release.promise;
      }
      return installationPorts.runTool(input);
    },
  });
  const { agentId } = host;
  try {
    await host.caller.agents.install({ agentId, version: '1.2.3' });
    await started.promise;
    await expect(
      host.createCaller().agents.remove({ agentId }),
    ).rejects.toThrow('in use');
  } finally {
    release.resolve();
  }
  await waitForInstalledSelection(host);
  await host.createCaller().agents.remove({ agentId });
  await expect(
    host.caller.agents.installStatus({ agentId }),
  ).resolves.toMatchObject({ installation: { status: 'not-installed' } });
});
