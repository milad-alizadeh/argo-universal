import { appendFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { PluginCapability } from '@repo/contracts/plugins';
import { expect, it, vi } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { journeyMs } from '#mocks/journey-budget';
import { fixtureNetwork, httpsServer, installed } from '#mocks/probe-plugin';

// Plugin workers start a real process: budget this file's tests for startup.
vi.setConfig({ testTimeout: journeyMs });

const pollOptions = { timeout: 30_000 };

// A shell is Full access (ADR-0030); these probes declare one to start children that outlive a call.
const commands: PluginCapability[] = [
  { kind: 'process:exec', command: 'sh', args: ['-c', '*'] },
  { kind: 'process:exec', command: 'sleep', args: ['*'] },
];

const alive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);

    return true;
  } catch {
    return false;
  }
};

// Starts a child that records its pid in the data folder, waits for the record, then runs `after`.
const spawning = (after: string): string => `
  export async function register(argo) {
    await argo.process.spawn(['sh', '-c', 'echo $$ > $DATA/pid; exec sleep 60']);
    for (let i = 0; i < 100; i++) {
      if (await argo.fs.read('$DATA/pid').then((t) => t.trim(), () => '')) break;
      await argo.process.run(['sleep', '0.05']);
    }
    ${after}
  }`;

const childPid = async (data: string): Promise<number> => {
  const pidFile = join(data, 'pid');

  await expect
    .poll(() => readFile(pidFile, 'utf8').catch(() => ''), pollOptions)
    .not.toBe('');

  return Number((await readFile(pidFile, 'utf8')).trim());
};

it('kills a Plugin child process when the Plugin crashes', async () => {
  const { home, data } = await installed(
    spawning("throw new Error('crash after spawn');"),
    { capabilities: commands },
  );

  const { caller } = await startEngineTestHost({ home });

  expect(await caller.plugins.activate({ pluginId: 'probe' })).toMatchObject({
    state: 'crashed',
  });

  const pid = await childPid(data);

  await expect.poll(() => alive(pid), pollOptions).toBe(false);
});

it('kills a Plugin child process when the Plugin reloads', async () => {
  const { home, entry, data } = await installed(spawning(''), {
    dev: true,
    capabilities: commands,
  });

  const { caller } = await startEngineTestHost({ home });

  await caller.plugins.activate({ pluginId: 'probe' });

  const pid = await childPid(data);

  expect(alive(pid)).toBe(true);
  await appendFile(entry, '\n// reload\n');
  await expect.poll(() => alive(pid), pollOptions).toBe(false);
});

it('kills a command the Plugin is still running when the Plugin reloads', async () => {
  const { home, entry, data } = await installed(
    `export async function register(argo) {
      await argo.process.run(['sh', '-c', 'echo $$ > $DATA/pid; exec sleep 60'], { timeoutMs: 60000 });
    }`,
    { dev: true, capabilities: commands },
  );

  const { caller } = await startEngineTestHost({ home });

  void caller.plugins.activate({ pluginId: 'probe' });

  const pid = await childPid(data);

  expect(alive(pid)).toBe(true);
  await appendFile(entry, '\n// reload\n');
  await expect.poll(() => alive(pid), pollOptions).toBe(false);
});

it('kills a descendant of a Plugin child process when the Plugin crashes', async () => {
  const { home, data } = await installed(
    `
    export async function register(argo) {
      await argo.process.spawn(['sh', '-c', 'sleep 60 & echo $! > $DATA/pid; wait']);
      for (let i = 0; i < 100; i++) {
        if (await argo.fs.read('$DATA/pid').then((t) => t.trim(), () => '')) break;
        await argo.process.run(['sleep', '0.05']);
      }
      throw new Error('crash after spawn');
    }`,
    { capabilities: commands },
  );

  const { caller } = await startEngineTestHost({ home });

  await caller.plugins.activate({ pluginId: 'probe' });

  const pid = await childPid(data);

  await expect.poll(() => alive(pid), pollOptions).toBe(false);
});

it('aborts a Plugin request that is still waiting when the Plugin reloads', async () => {
  let received = false;
  let closed = false;

  const port = await httpsServer((request) => {
    received = true;
    request.socket.on('close', () => {
      closed = true;
    });
  });

  const { home, entry } = await installed(
    `export async function register(argo) { await argo.fetch('https://localhost:${port}/'); }`,
    {
      dev: true,
      capabilities: [
        {
          kind: 'fetch',
          host: `localhost:${port}`,
          reason: 'The fixture server',
        },
      ],
    },
  );

  const { caller } = await startEngineTestHost({
    home,
    pluginNetwork: await fixtureNetwork(),
  });

  void caller.plugins.activate({ pluginId: 'probe' });
  await expect.poll(() => received && !closed, pollOptions).toBe(true);
  await appendFile(entry, '\n// reload\n');
  await expect.poll(() => closed, pollOptions).toBe(true);
});

it('kills a Plugin child process when the Plugin is turned off', async () => {
  const { home, data } = await installed(spawning(''), {
    capabilities: commands,
  });

  const { caller } = await startEngineTestHost({ home });

  await caller.plugins.activate({ pluginId: 'probe' });

  const pid = await childPid(data);

  expect(alive(pid)).toBe(true);
  await caller.plugins.setEnabled({ pluginId: 'probe', enabled: false });
  await expect.poll(() => alive(pid), pollOptions).toBe(false);
});
