import { readFile, writeFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { expect, it, onTestFinished } from 'vitest';
import { z } from 'zod';
import { startEngineTestHost } from '#mocks/engine';
import { installed, outFile, scratch } from '#mocks/probe-plugin';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

const mebibyte = 1_048_576;

const resultOf = async (work: string): Promise<z.core.util.JSONType> =>
  z.json().parse(JSON.parse(await readFile(join(work, outFile), 'utf8')));

function addressOf(server: Server): AddressInfo {
  const address = server.address();

  if (address === null || typeof address === 'string')
    throw new Error('Server is not listening on a port');

  return address;
}

it('refuses a Plugin that reaches for a Node global and lists why', async () => {
  const home = await createRuntimePlugins([
    { id: 'bad', fixture: 'require-fs' },
  ]);

  const { caller } = await startEngineTestHost({ home });

  expect(await caller.plugins.activate({ pluginId: 'bad' })).toMatchObject({
    state: 'crashed',
    error: expect.stringContaining('require'),
  });
  expect((await caller.plugins.list()).plugins).toMatchObject([
    { state: 'crashed', error: expect.stringContaining('require') },
  ]);
});

it('reads, writes, lists and stats files, and rejects a read over the cap', async () => {
  const work = await scratch();
  const nested = join(work, 'nested');
  const big = join(work, 'big.txt');

  await writeFile(big, 'x'.repeat(mebibyte + 1));

  const { home } = await installed(`
    export async function register(argo) {
      const file = ${JSON.stringify(join(nested, 'a.txt'))};
      await argo.fs.write(file, 'hello');
      const over = await argo.fs.read(${JSON.stringify(big)}).catch((e) => e.message);
      await argo.fs.write(${JSON.stringify(join(work, outFile))}, JSON.stringify({
        read: await argo.fs.read(file),
        list: await argo.fs.list(${JSON.stringify(nested)}),
        stat: await argo.fs.stat(file),
        over,
      }));
    }`);

  const { caller } = await startEngineTestHost({ home });

  await caller.plugins.activate({ pluginId: 'probe' });

  expect(await resultOf(work)).toMatchObject({
    read: 'hello',
    list: [{ name: 'a.txt', kind: 'file' }],
    stat: { kind: 'file', size: 5 },
    over: expect.stringContaining('read limit'),
  });
  expect(await readFile(join(home, 'logs/plugins.log'), 'utf8')).toContain(
    `Plugin probe: argo.fs.write ${join(nested, 'a.txt')}`,
  );
});

it('runs a command by argv with no shell, caps its output and its time', async () => {
  const work = await scratch();

  const { home } = await installed(`
    export async function register(argo) {
      const plain = await argo.process.run(['echo', '$HOME; echo injected']);
      const loud = await argo.process.run(['head', '-c', '2000000', '/dev/zero']);
      const slow = await argo.process.run(['sleep', '5'], { timeoutMs: 200 });
      const missing = await argo.process.run(['argo-no-such-command']).catch((e) => e.message);
      await argo.fs.write(${JSON.stringify(join(work, outFile))},
        JSON.stringify({ plain, loud: { ...loud, stdout: loud.stdout.length }, slow, missing }));
    }`);

  const { caller } = await startEngineTestHost({ home });

  await caller.plugins.activate({ pluginId: 'probe' });

  expect(await resultOf(work)).toMatchObject({
    plain: { stdout: '$HOME; echo injected\n', exitCode: 0, truncated: false },
    loud: { truncated: true, stdout: mebibyte },
    slow: { timedOut: true },
    missing: expect.stringContaining('ENOENT'),
  });
});

it('makes HTTP requests', async () => {
  const work = await scratch();

  const server = createServer((request, response) => {
    response.end(JSON.stringify({ method: request.method }));
  });

  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  onTestFinished(() => void server.close());

  const { home } = await installed(`
    export async function register(argo) {
      const response = await argo.fetch('http://127.0.0.1:${addressOf(server).port}/', { method: 'POST', body: 'x' });
      await argo.fs.write(${JSON.stringify(join(work, outFile))},
        JSON.stringify({ status: response.status, json: await response.json() }));
    }`);

  const { caller } = await startEngineTestHost({ home });

  await caller.plugins.activate({ pluginId: 'probe' });

  expect(await resultOf(work)).toEqual({
    status: 200,
    json: { method: 'POST' },
  });
});
