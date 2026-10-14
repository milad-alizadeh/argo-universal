import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { homebrewPorts, machineWithout } from '#mocks/homebrew';
import { InstallCleanupError } from '../install/processes/cleanup-error';

// The staging folders a Homebrew install leaves under Argo's Agents folder.
const stagingLeft = async (home: string): Promise<string[]> => {
  const entries = await readdir(join(home, 'agents', '.tools')).catch(() => []);

  return entries.filter((entry) => entry.startsWith('.install-'));
};

type HeldBrew = {
  release: () => void;
  outcome: (input: { signal: AbortSignal }) => Promise<void>;
};

// A `brew install` that runs until the test releases it, or until its signal aborts.
const heldBrew = (): HeldBrew => {
  const gate = Promise.withResolvers<void>();

  return {
    release: () => gate.resolve(),
    outcome: ({ signal }) =>
      new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason));
        void gate.promise.then(resolve);
      }),
  };
};

it('a second request for the same tool joins the running Homebrew install', async () => {
  await machineWithout('uv');
  const brew = heldBrew();
  const ports = homebrewPorts(brew.outcome);
  const host = await startEngineTestHost({ installationPorts: ports });
  const first = host.caller.agents.installTool({ tool: 'uv' });
  await expect.poll(() => ports.runs.length).toBe(1);
  const second = host.caller.agents.installTool({ tool: 'uv' });

  brew.release();
  await Promise.all([first, second]);

  expect(ports.runs).toHaveLength(1);
});

it('stopping the Engine stops a running Homebrew install', async () => {
  await machineWithout('uv');
  const ports = homebrewPorts(heldBrew().outcome);
  const host = await startEngineTestHost({ installationPorts: ports });
  const install = host.caller.agents.installTool({ tool: 'uv' });
  const settled = install.catch(() => 'stopped');
  await expect.poll(() => ports.runs.length).toBe(1);

  await host.stop();

  expect(ports.runs[0]?.signal.aborted).toBe(true);
  expect(await settled).toBe('stopped');
});

it.each([
  ['succeeds', (): Promise<void> => Promise.resolve()],
  ['fails', (): Promise<void> => Promise.reject(new Error('no bottle'))],
])('when Homebrew %s, its staging folder is removed', async (_, outcome) => {
  await machineWithout('uv');

  const host = await startEngineTestHost({
    installationPorts: homebrewPorts(outcome),
  });

  await host.caller.agents.installTool({ tool: 'uv' }).catch(() => {});

  expect(await stagingLeft(host.home)).toEqual([]);
});

it('an installer that outlived its stop keeps its staging folder for the next start', async () => {
  await machineWithout('uv');

  const ports = homebrewPorts(() =>
    Promise.reject(new InstallCleanupError('installer still running')),
  );

  const host = await startEngineTestHost({ installationPorts: ports });
  await expect(host.caller.agents.installTool({ tool: 'uv' })).rejects.toThrow(
    'installer still running',
  );

  expect(await stagingLeft(host.home)).toHaveLength(1);
});
