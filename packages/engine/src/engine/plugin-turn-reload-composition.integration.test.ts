import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import { processWait } from '#mocks/data-fixture';
import { writeHookPlugins } from '#mocks/hook-plugins';
import { shippedFolder } from '#mocks/runtime-plugins';

const source = (version: string): string => `
  export async function register(argo) {
    const loaded = '$DATA/loaded';
    const previous = await argo.fs.read(loaded).catch(() => '');
    await argo.fs.write(loaded, previous + '${version}\\n');
  }`;

it('keeps a dev Plugin alive until all active Turns end and loads only its final edit', async () => {
  const host = await startAcpEngine({
    steps: [{ type: 'wait-for-cancel' }],
    installPlugins: (home) =>
      writeHookPlugins(home, [{ id: 'dev', source: source('initial') }]),
  });

  const { sessionId } = await host.caller.session.new(emptySessionInput);
  const second = await host.caller.session.new(emptySessionInput);
  await host.caller.plugin.activate({ pluginId: 'dev' });
  const loaded = join(host.home, 'plugin-data/dev/loaded');
  expect(await readFile(loaded, 'utf8')).toBe('initial\n');
  await host.caller.session.prompt({
    sessionId,
    prompt: [{ type: 'text', text: 'Wait' }],
  });
  await waitForAcpSnapshot(
    host,
    sessionId,
    (snapshot) => snapshot.activeTurnId !== null,
  );
  await host.caller.session.prompt({
    sessionId: second.sessionId,
    prompt: [{ type: 'text', text: 'Wait too' }],
  });
  await waitForAcpSnapshot(
    host,
    second.sessionId,
    (snapshot) => snapshot.activeTurnId !== null,
  );
  const entry = join(host.home, shippedFolder, 'dev/index.mjs');
  await writeFile(entry, 'invalid intermediate source }');
  await expect.poll(() => deferredBuilds(host.home), processWait).toBe(1);
  expect((await host.caller.plugin.list()).plugins[0]?.state).toBe('running');
  await writeFile(
    entry,
    source('final').replace('$DATA', join(host.home, 'plugin-data/dev')),
  );
  await expect.poll(() => deferredBuilds(host.home), processWait).toBe(2);
  expect(await readFile(loaded, 'utf8')).toBe('initial\n');
  await host.caller.session.cancel({ sessionId });
  await waitForAcpSnapshot(
    host,
    sessionId,
    (snapshot) => snapshot.activeTurnId === null,
  );
  expect(await readFile(loaded, 'utf8')).toBe('initial\n');
  await host.caller.session.cancel({ sessionId: second.sessionId });
  await waitForAcpSnapshot(
    host,
    second.sessionId,
    (snapshot) => snapshot.activeTurnId === null,
  );
  await expect
    .poll(() => readFile(loaded, 'utf8'), processWait)
    .toBe('initial\nfinal\n');
}, 30_000);

async function deferredBuilds(home: string): Promise<number> {
  const log = await readFile(join(home, 'logs/plugins.log'), 'utf8');

  return log.match(/dev build deferred until Turn ends/g)?.length ?? 0;
}
