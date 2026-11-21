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

type DraftingHost = {
  host: Awaited<ReturnType<typeof startAcpEngine>>;
  loaded: string;
  edit: (text: string) => Promise<void>;
  endTurn: () => Promise<void>;
};

// A dev Plugin that has run once, with a Turn running that may be writing its sources.
async function draftingDuringATurn(): Promise<DraftingHost> {
  const host = await startAcpEngine({
    steps: [{ type: 'wait-for-cancel' }],
    installPlugins: (home) =>
      writeHookPlugins(home, [{ id: 'dev', source: source('initial') }]),
  });

  const { sessionId } = await host.caller.session.new(emptySessionInput);
  await host.caller.plugin.activate({ pluginId: 'dev' });
  await host.caller.session.prompt({
    sessionId,
    prompt: [{ type: 'text', text: 'Wait' }],
  });
  await waitForAcpSnapshot(
    host,
    sessionId,
    (snapshot) => snapshot.activeTurnId !== null,
  );

  const dataFolder = join(host.home, 'plugin-data/dev');

  return {
    host,
    loaded: join(dataFolder, 'loaded'),
    edit: (text) =>
      writeFile(
        join(host.home, shippedFolder, 'dev/index.mjs'),
        text.replace('$DATA', dataFolder),
      ),
    endTurn: async (): Promise<void> => {
      await host.caller.session.cancel({ sessionId });
      await waitForAcpSnapshot(
        host,
        sessionId,
        (snapshot) => snapshot.activeTurnId === null,
      );
    },
  };
}

it('swaps the worker on plugin.draft.show with a good build while a Turn runs', async () => {
  const { host, loaded, edit, endTurn } = await draftingDuringATurn();

  await edit(source('draft'));
  await host.caller.plugin.draft.show({ pluginId: 'dev', region: 'header' });

  expect(await readFile(loaded, 'utf8')).toBe('initial\ndraft\n');
  expect((await host.caller.plugin.list()).plugins[0]?.state).toBe('running');

  await endTurn();
  expect(await readFile(loaded, 'utf8')).toBe('initial\ndraft\n');
}, 30_000);

it('keeps the current worker and reports the error when plugin.draft.show builds a broken Plugin', async () => {
  const { host, loaded, edit } = await draftingDuringATurn();

  await edit('invalid intermediate source }');

  await expect(
    host.caller.plugin.draft.show({ pluginId: 'dev' }),
  ).rejects.toThrow(/Expected ";" but found/);
  expect(await readFile(loaded, 'utf8')).toBe('initial\n');
  expect((await host.caller.plugin.list()).plugins[0]?.state).toBe('running');
}, 30_000);

it('still waits for the Turn to end when the source changes without plugin.draft.show', async () => {
  const { host, loaded, edit, endTurn } = await draftingDuringATurn();

  await edit(source('final'));
  await expect.poll(() => deferredBuilds(host.home), processWait).toBe(1);
  expect(await readFile(loaded, 'utf8')).toBe('initial\n');

  await endTurn();
  await expect
    .poll(() => readFile(loaded, 'utf8'), processWait)
    .toBe('initial\nfinal\n');
}, 30_000);

async function deferredBuilds(home: string): Promise<number> {
  const log = await readFile(join(home, 'logs/plugins.log'), 'utf8').catch(
    () => '',
  );

  return log.match(/dev build deferred until Turn ends/g)?.length ?? 0;
}
