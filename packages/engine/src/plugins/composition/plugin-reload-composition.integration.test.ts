import { mkdir, readFile, rename, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { processWait } from '#mocks/data-fixture';
import { startEngineTestHost } from '#mocks/engine';
import { createRuntimePlugins, shippedFolder } from '#mocks/runtime-plugins';

it('reports a dev Plugin outside the first-party root and never starts it', async () => {
  const home = await createRuntimePlugins([
    { id: 'dev', fixture: 'dev', dev: true },
  ]);

  await rename(join(home, shippedFolder), join(home, 'plugins'));

  const { caller } = await startEngineTestHost({ home });

  expect(await caller.plugin.list()).toEqual({
    plugins: [],
    errors: [
      {
        directory: join(home, 'plugins/dev'),
        message: expect.stringContaining('not loaded'),
      },
    ],
  });
  await expect(caller.plugin.activate({ pluginId: 'dev' })).rejects.toThrow(
    'Unknown Plugin: dev',
  );
});

const linkedId = 'linked-draft';

async function devLinkHome(): Promise<string> {
  const home = await createRuntimePlugins([
    {
      id: linkedId,
      fixture: 'healthy',
      drafts: [{ page: '/', states: ['populated'] }],
    },
    { id: 'copied', fixture: 'healthy' },
    { id: 'nested', fixture: 'healthy' },
  ]);

  const sources = join(home, 'sources');
  const plugins = join(home, 'plugins');

  await rename(join(home, shippedFolder), sources);
  await mkdir(join(plugins, 'collection'), { recursive: true });
  await symlink(join(sources, linkedId), join(plugins, linkedId));
  await symlink(join(sources, 'nested'), join(plugins, 'collection', 'nested'));
  await rename(join(sources, 'copied'), join(plugins, 'copied'));

  return home;
}

it('activates and shows a Draft linked into the isolated watch home', async () => {
  const home = await devLinkHome();

  const { caller } = await startEngineTestHost({
    home,
    watchPlugins: true,
    acceptLinkedDevPlugins: true,
  });

  const listed = await caller.plugin.list();

  expect(listed.plugins).toMatchObject([
    { manifest: { id: linkedId }, firstParty: false, dev: true },
  ]);
  expect(listed.errors.map(({ directory }) => directory)).toEqual([
    join(home, 'plugins', 'copied'),
    join(home, 'plugins', 'collection', 'nested'),
  ]);
  await expect(
    caller.plugin.activate({ pluginId: linkedId }),
  ).resolves.toMatchObject({
    state: 'running',
  });
  await expect(
    caller.plugin.draft.show({ pluginId: linkedId }),
  ).resolves.toEqual({
    ok: true,
  });
});

it.each([
  { watchPlugins: false, acceptLinkedDevPlugins: true },
  { watchPlugins: true, acceptLinkedDevPlugins: false },
])(
  'keeps linked Plugins out with watch=$watchPlugins and isolated home=$acceptLinkedDevPlugins',
  async (options) => {
    const { caller } = await startEngineTestHost({
      home: await devLinkHome(),
      ...options,
    });

    expect((await caller.plugin.list()).plugins).toEqual([]);
    await expect(
      caller.plugin.activate({ pluginId: linkedId }),
    ).rejects.toThrow('Unknown Plugin');
  },
);

it('bundles and reloads a first-party dev Plugin, recovering after runtime and build errors', async () => {
  const home = await createRuntimePlugins([
    { id: 'dev', fixture: 'dev', dev: true },
  ]);

  const directory = join(home, shippedFolder);

  const { caller } = await startEngineTestHost({ home });

  const source = join(directory, 'dev/check.ts');

  expect(await caller.plugin.activate({ pluginId: 'dev' })).toMatchObject({
    state: 'crashed',
    error: 'Initial dev Plugin',
  });
  await writeFile(source, 'export function check(): void {}');
  await expect
    .poll(() => caller.plugin.list(), processWait)
    .toMatchObject({ plugins: [{ state: 'running', error: null }] });

  await writeFile(source, 'not valid TypeScript }');
  await expect
    .poll(() => caller.plugin.list(), processWait)
    .toMatchObject({ plugins: [{ state: 'crashed' }] });
  await writeFile(
    source,
    'export function check(): void { throw Error("Reloaded dev Plugin"); }',
  );
  await expect
    .poll(() => caller.plugin.list(), processWait)
    .toMatchObject({
      plugins: [{ state: 'crashed', error: 'Reloaded dev Plugin' }],
    });
  expect(await caller.plugin.activate({ pluginId: 'dev' })).toMatchObject({
    error: 'Reloaded dev Plugin',
  });
  expect(await readFile(join(directory, 'dev/index.mjs'), 'utf8')).toContain(
    'import { check }',
  );
}, 20_000);
