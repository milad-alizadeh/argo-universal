import { readFile, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { processWait } from '#mocks/data-fixture';
import { killPluginHost, pluginHostPids } from '#mocks/plugin-host-log';
import { startPluginRuntime } from '#mocks/plugin-runtime-host';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

const validSource = 'export function check(): void {}';

const devFolder = 'shipped/dev';

it.each(['../private.json', './linked.json'])(
  'refuses a dev import of %s before its contents reach a worker',
  async (path) => {
    const home = await createRuntimePlugins([
      { id: 'dev', fixture: 'healthy', dev: true },
    ]);

    const directory = join(home, devFolder);
    const secret = join(home, 'shipped/private.json');
    await writeFile(secret, '{"secret":"SYNTHETIC_OUTSIDE_FILE"}');
    await symlink(secret, join(directory, 'linked.json'));
    await writeFile(
      join(directory, 'index.mjs'),
      `import data from '${path}'; export function register() { throw Error(data.secret); }`,
    );
    const runtime = startPluginRuntime(home);

    expect(
      await runtime.activate({
        entry: { pluginId: 'dev', directory, main: 'index.mjs' },
      }),
    ).toMatchObject({
      state: 'crashed',
      error: expect.stringContaining(
        'Plugin entry imports must stay in its folder',
      ),
    });
    expect(
      await readFile(join(home, 'logs/plugins.log'), 'utf8'),
    ).not.toContain('SYNTHETIC_OUTSIDE_FILE');
  },
);

it('loads imports within the Plugin folder while preserving a failed rebuild across host recovery', async () => {
  const home = await createRuntimePlugins([
    { id: 'dev', fixture: 'dev', dev: true },
  ]);

  const directory = join(home, devFolder);
  const source = join(directory, 'check.ts');
  await writeFile(source, validSource);
  const runtime = startPluginRuntime(home);

  const location = {
    entry: { pluginId: 'dev', directory, main: 'index.mjs' },
  };

  expect(await runtime.activate(location)).toMatchObject({ state: 'running' });
  await writeFile(source, 'not valid TypeScript }');
  await expect.poll(() => runtime.status('dev').state).toBe('crashed');
  const failed = runtime.status('dev');
  await killPluginHost(home);
  await expect.poll(() => pluginHostPids(home), processWait).toHaveLength(2);

  expect(await runtime.activate(location)).toEqual(failed);
  await writeFile(source, validSource);
  await expect
    .poll(() => runtime.status('dev'), processWait)
    .toEqual({ state: 'running', hanging: false, error: null });
}, 15_000);

it('builds a Plugin once, without watching its sources, when the Server is not in dev', async () => {
  const home = await createRuntimePlugins([
    { id: 'dev', fixture: 'dev', dev: true },
  ]);

  const directory = join(home, devFolder);
  const source = join(directory, 'check.ts');
  await writeFile(source, validSource);
  let rebuilds = 0;

  const runtime = startPluginRuntime(
    home,
    {},
    { rebuilt: () => (rebuilds += 1), watch: false },
  );

  const location = {
    entry: { pluginId: 'dev', directory, main: 'index.mjs' },
  };

  expect(await runtime.activate(location)).toMatchObject({ state: 'running' });
  await writeFile(source, 'not valid TypeScript }');
  await new Promise((resolve) => setTimeout(resolve, 1500));

  expect(runtime.status('dev').state).toBe('running');
  expect(rebuilds).toBe(1);
}, 15_000);
