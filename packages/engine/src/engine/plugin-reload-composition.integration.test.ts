import { readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { createRuntimePlugins, shippedFolder } from '#mocks/runtime-plugins';

it('reports a dev Plugin outside the first-party root and never starts it', async () => {
  const home = await createRuntimePlugins([
    { id: 'dev', fixture: 'dev', dev: true },
  ]);

  await rename(join(home, shippedFolder), join(home, 'plugins'));

  const { caller } = await startEngineTestHost({ home });

  expect(await caller.plugins.list()).toEqual({
    plugins: [],
    errors: [
      {
        directory: join(home, 'plugins/dev'),
        message: expect.stringContaining('not loaded'),
      },
    ],
  });
  await expect(caller.plugins.activate({ pluginId: 'dev' })).rejects.toThrow(
    'Unknown Plugin: dev',
  );
});

it('bundles and reloads a first-party dev Plugin, recovering after runtime and build errors', async () => {
  const home = await createRuntimePlugins([
    { id: 'dev', fixture: 'dev', dev: true },
  ]);

  const directory = join(home, shippedFolder);

  const { caller } = await startEngineTestHost({ home });

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
}, 20_000);
