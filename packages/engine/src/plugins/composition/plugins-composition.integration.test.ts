import {
  mkdtemp,
  mkdir,
  rm,
  readFile,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, onTestFinished } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { rejectedManifests } from '#mocks/plugin-manifests';

it('lists first-party Plugin manifests without starting their code, and reports user Plugins without loading them', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'argo-plugins-'));
  onTestFinished(() => rm(directory, { recursive: true, force: true }));
  const home = join(directory, 'home');
  await mkdir(home);
  const userPlugin = join(home, 'plugins', 'user-plugin');
  await writePlugin(userPlugin, 'user-plugin');
  await writeFile(
    join(userPlugin, 'index.js'),
    "throw new Error('Discovery must never run Plugin code');",
  );

  const { caller } = await startEngineTestHost({
    home,
    firstPartyPluginsDirectory: new URL(
      '../../../mocks/plugins/first-party',
      import.meta.url,
    ).pathname,
  });

  expect(await caller.plugin.list()).toMatchObject({
    plugins: [
      {
        manifest: {
          id: 'fixture-tracker',
          icon: { sf: 'ticket', sfFilled: 'ticket.fill' },
          contributes: { nav: [{ id: 'issues' }, { id: 'plans' }] },
        },
        firstParty: true,
        enabled: true,
      },
    ],
    errors: [
      {
        directory: userPlugin,
        message: expect.stringContaining('not loaded'),
      },
    ],
  });
});

const brokenJson = 'broken-json';

const manifestFile = 'plugin.json';

it('reports malformed and incompatible manifests while keeping them out of Plugin navigation', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'argo-invalid-plugins-'));
  onTestFinished(() => rm(directory, { recursive: true, force: true }));
  const home = join(directory, 'home');
  await mkdir(home);

  const fixture = JSON.parse(
    await readFile(
      new URL(
        '../../../mocks/plugins/first-party/tracker/plugin.json',
        import.meta.url,
      ),
      'utf8',
    ),
  );

  for (const { folder, patch } of rejectedManifests) {
    const plugin = join(home, 'plugins', folder);
    await mkdir(plugin, { recursive: true });
    await writeFile(
      join(plugin, manifestFile),
      JSON.stringify({ ...fixture, id: folder, ...patch }),
    );
  }

  await mkdir(join(home, 'plugins', brokenJson));
  await writeFile(join(home, 'plugins', brokenJson, manifestFile), '{');

  const { caller } = await startEngineTestHost({
    home,
    firstPartyPluginsDirectory: join(directory, 'missing'),
  });

  const result = await caller.plugin.list();
  expect(result.plugins).toEqual([]);
  expect(result.errors).toHaveLength(rejectedManifests.length + 1);

  for (const { folder, reason } of rejectedManifests) {
    expect(result.errors).toContainEqual({
      directory: join(home, 'plugins', folder),
      message: expect.stringContaining(reason),
    });
  }

  expect(result.errors).toContainEqual({
    directory: join(home, 'plugins', brokenJson),
    message: expect.any(String),
  });
});

it('admits Plugins in a root and one collection below it, follows symlinks, and keeps the first Plugin with an id', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'argo-plugin-layout-'));
  onTestFinished(() => rm(directory, { recursive: true, force: true }));
  const shipped = join(directory, 'shipped');
  const home = join(directory, 'home');
  const user = join(home, 'plugins');

  await writePlugin(join(shipped, 'shared'), 'shared');
  await writePlugin(join(user, 'shared'), 'shared');
  await writePlugin(join(shipped, 'collection', 'nested'), 'nested');
  await writePlugin(join(shipped, 'repo', 'packages', 'deep'), 'deep');
  await writePlugin(join(shipped, 'top'), 'top');
  await writePlugin(join(directory, 'elsewhere'), 'linked');
  await symlink(join(directory, 'elsewhere'), join(shipped, 'linked'));

  const { caller } = await startEngineTestHost({
    home,
    firstPartyPluginsDirectory: shipped,
  });

  const result = await caller.plugin.list();

  expect(
    result.plugins.map(({ manifest, firstParty }) => ({
      id: manifest.id,
      firstParty,
    })),
  ).toEqual([
    { id: 'linked', firstParty: true },
    { id: 'shared', firstParty: true },
    { id: 'top', firstParty: true },
    { id: 'nested', firstParty: true },
  ]);

  expect(result.errors).toEqual([
    {
      directory: join(user, 'shared'),
      message: 'Duplicate Plugin id: shared',
    },
  ]);
});

async function writePlugin(folder: string, id: string): Promise<void> {
  const fixture = JSON.parse(
    await readFile(
      new URL(
        '../../../mocks/plugins/first-party/tracker/plugin.json',
        import.meta.url,
      ),
      'utf8',
    ),
  );

  await mkdir(folder, { recursive: true });
  await writeFile(
    join(folder, manifestFile),
    JSON.stringify({ ...fixture, id }),
  );
  await writeFile(join(folder, 'index.js'), '');
}
