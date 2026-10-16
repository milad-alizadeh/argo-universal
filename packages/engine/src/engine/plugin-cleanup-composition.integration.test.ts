import { appendFile, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { expect, it, onTestFinished } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { installed, scratch } from '#mocks/probe-plugin';

const pollOptions = { timeout: 30_000 };

const alive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);

    return true;
  } catch {
    return false;
  }
};

// Starts a child that records its pid, waits for the record, then runs `after`.
const spawning = (pidFile: string, after: string): string => `
  export async function register(argo) {
    await argo.process.spawn(['sh', '-c', 'echo $$ > ${pidFile}; exec sleep 60']);
    for (let i = 0; i < 100; i++) {
      if (await argo.fs.read(${JSON.stringify(pidFile)}).then((t) => t.trim(), () => '')) break;
      await argo.process.run(['sleep', '0.05']);
    }
    ${after}
  }`;

const childPid = async (pidFile: string): Promise<number> => {
  await expect
    .poll(() => readFile(pidFile, 'utf8').catch(() => ''), pollOptions)
    .not.toBe('');

  return Number((await readFile(pidFile, 'utf8')).trim());
};

it('kills a Plugin child process when the Plugin crashes', async () => {
  const pidFile = join(await scratch(), 'pid');

  const { home } = await installed(
    spawning(pidFile, "throw new Error('crash after spawn');"),
  );

  const { caller } = await startEngineTestHost({ home });

  expect(await caller.plugins.activate({ pluginId: 'probe' })).toMatchObject({
    state: 'crashed',
  });

  const pid = await childPid(pidFile);

  await expect.poll(() => alive(pid), pollOptions).toBe(false);
});

it('kills a Plugin child process when the Plugin reloads', async () => {
  const pidFile = join(await scratch(), 'pid');

  const { home, entry } = await installed(spawning(pidFile, ''), {
    dev: true,
  });

  const { caller } = await startEngineTestHost({ home });

  await caller.plugins.activate({ pluginId: 'probe' });

  const pid = await childPid(pidFile);

  expect(alive(pid)).toBe(true);
  await appendFile(entry, '\n// reload\n');
  await expect.poll(() => alive(pid), pollOptions).toBe(false);
});

it('kills a command the Plugin is still running when the Plugin reloads', async () => {
  const pidFile = join(await scratch(), 'pid');

  const { home, entry } = await installed(
    `export async function register(argo) {
      await argo.process.run(['sh', '-c', 'echo $$ > ${pidFile}; exec sleep 60'], { timeoutMs: 60000 });
    }`,
    { dev: true },
  );

  const { caller } = await startEngineTestHost({ home });

  void caller.plugins.activate({ pluginId: 'probe' });

  const pid = await childPid(pidFile);

  expect(alive(pid)).toBe(true);
  await appendFile(entry, '\n// reload\n');
  await expect.poll(() => alive(pid), pollOptions).toBe(false);
});

it('kills a descendant of a Plugin child process when the Plugin crashes', async () => {
  const pidFile = join(await scratch(), 'pid');

  const { home } = await installed(`
    export async function register(argo) {
      await argo.process.spawn(['sh', '-c', 'sleep 60 & echo $! > ${pidFile}; wait']);
      for (let i = 0; i < 100; i++) {
        if (await argo.fs.read(${JSON.stringify(pidFile)}).then((t) => t.trim(), () => '')) break;
        await argo.process.run(['sleep', '0.05']);
      }
      throw new Error('crash after spawn');
    }`);

  const { caller } = await startEngineTestHost({ home });

  await caller.plugins.activate({ pluginId: 'probe' });

  const pid = await childPid(pidFile);

  await expect.poll(() => alive(pid), pollOptions).toBe(false);
});

it('aborts a Plugin request that is still waiting when the Plugin reloads', async () => {
  let closed = false;

  const server = createServer((request) => {
    request.socket.on('close', () => {
      closed = true;
    });
  });

  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  onTestFinished(() => void server.close());

  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;

  const { home, entry } = await installed(
    `export async function register(argo) { await argo.fetch('http://127.0.0.1:${port}/'); }`,
    { dev: true },
  );

  const { caller } = await startEngineTestHost({ home });

  void caller.plugins.activate({ pluginId: 'probe' });
  await expect.poll(() => server.listening && !closed, pollOptions).toBe(true);
  await appendFile(entry, '\n// reload\n');
  await expect.poll(() => closed, pollOptions).toBe(true);
});
