import { cp, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, onTestFinished } from 'vitest';
import { dataFixture, dataPluginId } from '#mocks/data-fixture';
import { startEngineTestHost } from '#mocks/engine';

it('starts a Plugin with a nav item at Server startup, so the first draw of its page finds it running', async () => {
  const fixture = await dataFixture(
    `import {Text} from '@argo/plugin-kit';
  export function register(argo) {
    argo.pages.define('/', { load: () => null, render: () => <Text>page</Text> });
  }`,
    { nav: [{ id: 'inbox', title: 'Inbox', path: '/' }] },
  );

  const host = await startEngineTestHost({
    home: await shippedHome(fixture.directory),
  });

  const stateOf = async (): Promise<string | undefined> => {
    const { plugins } = await host.caller.plugin.list();

    return plugins.find(({ manifest }) => manifest.id === dataPluginId)?.state;
  };

  await expect.poll(stateOf, { timeout: 15_000 }).toBe('running');
}, 20_000);

async function shippedHome(fixture: string): Promise<string> {
  const home = await mkdtemp(join(tmpdir(), 'argo-nav-start-engine-'));
  onTestFinished(() => rm(home, { recursive: true, force: true }));
  await mkdir(join(home, 'shipped'));
  await cp(fixture, join(home, 'shipped', dataPluginId), { recursive: true });

  return home;
}
