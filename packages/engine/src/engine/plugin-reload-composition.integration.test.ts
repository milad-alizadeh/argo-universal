import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

it.each([
  { firstParty: false, folder: 'plugins' },
  { firstParty: true, folder: 'shipped' },
])(
  'bundles and reloads a dev Plugin (first-party: $firstParty), recovering after runtime and build errors',
  async ({ firstParty, folder }) => {
    const home = await createRuntimePlugins([
      { id: 'dev', fixture: 'dev', dev: true },
    ]);

    const directory = join(home, folder);

    if (firstParty) {
      await rename(join(home, 'plugins'), directory);
      await rm(join(directory, 'dev/.argo-dev'));
    }

    const { caller } = await startEngineTestHost({
      home,
      firstPartyPluginsDirectory: join(home, 'shipped'),
    });

    const source = join(directory, 'dev/check.ts');

    expect(await caller.plugins.activate({ pluginId: 'dev' })).toMatchObject({
      state: 'crashed',
      error: 'Initial dev Plugin',
    });
    await writeFile(source, 'export function check(): void {}');
    await expect
      .poll(() => caller.plugins.list())
      .toMatchObject({ plugins: [{ state: 'running', error: null }] });

    await writeFile(source, 'not valid TypeScript }');
    await expect
      .poll(() => caller.plugins.list())
      .toMatchObject({ plugins: [{ state: 'crashed' }] });
    await writeFile(
      source,
      'export function check(): void { throw Error("Reloaded dev Plugin"); }',
    );
    await expect
      .poll(() => caller.plugins.list())
      .toMatchObject({
        plugins: [{ state: 'crashed', error: 'Reloaded dev Plugin' }],
      });
    expect(await caller.plugins.activate({ pluginId: 'dev' })).toMatchObject({
      error: 'Reloaded dev Plugin',
    });
    expect(await readFile(join(directory, 'dev/index.mjs'), 'utf8')).toContain(
      'import { check }',
    );
  },
  20_000,
);
