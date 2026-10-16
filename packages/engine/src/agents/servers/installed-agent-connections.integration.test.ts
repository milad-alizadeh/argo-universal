import { expect, it, vi } from 'vitest';
import { createResourceOpening } from '#mocks/acp-resource';
import { installEntry, installationPorts } from '#mocks/installation';
import {
  installedAgentsOf,
  requireInstalled,
  startLaunchHost,
} from '#mocks/installed-agents';
import type { AcpSessionLease } from '../acp';
import type { InstallPorts } from '../install/ports';

type ConnectionHost = {
  open: (signal?: AbortSignal) => Promise<AcpSessionLease>;
};

// Opens Sessions of the npm fixture Agent in project-1 through the Engine's Installed Agents and ACP resources.
const startConnectionHost = async (
  runTool: InstallPorts['runTool'],
): Promise<ConnectionHost> => {
  const entry = installEntry('npx');

  const { host } = await startLaunchHost(entry, {
    installationPorts: { ...installationPorts, runTool },
  });

  const agent = requireInstalled(host, entry.id);
  const { acpResources } = host.engine.getSnapshot().context;

  return {
    open: async (signal = new AbortController().signal) =>
      acpResources.open({
        ...createResourceOpening(),
        launch: await installedAgentsOf(host).launch(
          agent,
          'project-1',
          signal,
        ),
        signal,
      }),
  };
};

it('reuses the connection of an unchanged version without installing the Agent again', async () => {
  let installs = 0;

  const host = await startConnectionHost(async (tool) => {
    if (tool.args[0] === 'install') installs += 1;

    return installationPorts.runTool(tool);
  });

  await host.open();
  await host.open();
  expect(installs).toBe(1);
});

it('stops the npm install once the only Session waiting on it withdraws', async () => {
  const installing = Promise.withResolvers<AbortSignal>();

  const host = await startConnectionHost(async (tool) => {
    if (tool.args[0] !== 'install') return installationPorts.runTool(tool);
    installing.resolve(tool.signal);

    return new Promise<string>((_, reject) =>
      tool.signal.addEventListener('abort', () => reject(tool.signal.reason)),
    );
  });

  const session = new AbortController();
  const opening = host.open(session.signal);
  const install = await installing.promise;
  session.abort(new Error('Session closed'));
  await expect(opening).rejects.toThrow('Session closed');
  await vi.waitFor(() => expect(install.aborted).toBe(true));
});
