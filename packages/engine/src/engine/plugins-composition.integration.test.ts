import { cp, mkdtemp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, onTestFinished } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { rejectedManifests } from '#mocks/plugin-manifests';

it('discovers first-party and user Plugin manifests through the Engine without starting their code', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'argo-plugins-'));
  onTestFinished(() => rm(directory, { recursive: true, force: true }));
  const home = join(directory, 'home');
  await mkdir(home);
  await cp(
    new URL('../../mocks/plugins/user', import.meta.url),
    join(home, 'plugins'),
    { recursive: true },
  );

  const { caller } = await startEngineTestHost({
    home,
    firstPartyPluginsDirectory: new URL(
      '../../mocks/plugins/first-party',
      import.meta.url,
    ).pathname,
  });

  expect(await caller.plugins.list()).toMatchObject({
    plugins: [
      {
        manifest: {
          id: 'fixture-tracker',
          contributes: { nav: [{ id: 'issues' }, { id: 'plans' }] },
        },
        firstParty: true,
        enabled: true,
      },
      { manifest: { id: 'fixture-hello' }, firstParty: false, enabled: true },
    ],
    errors: [],
  });
});

const brokenJson = 'broken-json';

it('reports malformed and incompatible manifests while keeping them out of Plugin navigation', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'argo-invalid-plugins-'));
  onTestFinished(() => rm(directory, { recursive: true, force: true }));
  const home = join(directory, 'home');
  await mkdir(home);

  const fixture = JSON.parse(
    await readFile(
      new URL('../../mocks/plugins/user/hello/plugin.json', import.meta.url),
      'utf8',
    ),
  );

  for (const { folder, patch } of rejectedManifests) {
    const plugin = join(home, 'plugins', folder);
    await mkdir(plugin, { recursive: true });
    await writeFile(
      join(plugin, 'plugin.json'),
      JSON.stringify({ ...fixture, id: folder, ...patch }),
    );
  }

  await mkdir(join(home, 'plugins', brokenJson));
  await writeFile(join(home, 'plugins', brokenJson, 'plugin.json'), '{');

  const { caller } = await startEngineTestHost({
    home,
    firstPartyPluginsDirectory: join(directory, 'missing'),
  });

  const result = await caller.plugins.list();
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
