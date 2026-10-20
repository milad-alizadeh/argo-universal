import { cp, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { PluginBadge } from '@repo/contracts/plugins/runtime';
import { project } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { expect, it, onTestFinished } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import {
  dataFixture,
  dataPluginId,
} from '../../../plugin-kit/mocks/data-fixture';
import { writeDatabaseJobAndWaitForCommit } from '../storage';

const laterProject = 'later-project';

type Caller = Awaited<ReturnType<typeof startEngineTestHost>>['caller'];

it('starts Project background passes at Server startup and after Writer membership changes', async () => {
  const fixture = await dataFixture(
    `import {Text,useData,useEffect} from '@argo/plugin-kit';
  export function register(argo) {
    let count = 0;
    argo.pages.register('/', ({context:{projectId}}) => {
      const {data} = useData({api:'storage',queries:[{sql:'SELECT ?',params:[projectId],method:'values'}]});
      useEffect(() => { if (data) void argo.nav.badge('inbox',++count); }, [data]);
      return <Text>{projectId}</Text>;
    });
  }`,
    {
      nav: [{ id: 'inbox', title: 'Inbox', path: '/' }],
      background: { path: '/', interval: 300000 },
    },
  );

  const home = await mkdtemp(join(tmpdir(), 'argo-background-engine-'));
  onTestFinished(() => rm(home, { recursive: true, force: true }));
  await mkdir(join(home, 'shipped'));
  await cp(fixture.directory, join(home, 'shipped', dataPluginId), {
    recursive: true,
  });
  const host = await startEngineTestHost({ home });
  const controller = new AbortController();
  onTestFinished(() => controller.abort());
  const watching = host.createCaller({ signal: controller.signal });
  await expect
    .poll(() => currentBadges(watching))
    .toEqual([{ pluginId: dataPluginId, id: 'inbox', count: 1 }]);
  await writeDatabaseJobAndWaitForCommit(host.databaseWriter, {
    describe: () => 'add Project fixture',
    commit: (transaction) => {
      transaction
        .insert(project)
        .values({ id: laterProject, name: 'Later', path: fixture.directory })
        .run();
    },
  });
  await expect
    .poll(() => currentBadges(watching))
    .toEqual([{ pluginId: dataPluginId, id: 'inbox', count: 2 }]);
  await writeDatabaseJobAndWaitForCommit(host.databaseWriter, {
    describe: () => 'remove Project fixture',
    commit: (transaction) => {
      transaction.delete(project).where(eq(project.id, laterProject)).run();
    },
  });
  await writeDatabaseJobAndWaitForCommit(host.databaseWriter, {
    describe: () => 'restore Project fixture',
    commit: (transaction) => {
      transaction
        .insert(project)
        .values({ id: laterProject, name: 'Later', path: fixture.directory })
        .run();
    },
  });
  await expect
    .poll(() => currentBadges(watching))
    .toEqual([{ pluginId: dataPluginId, id: 'inbox', count: 3 }]);
  await host.caller.plugins.setEnabled({
    pluginId: dataPluginId,
    enabled: false,
  });
  expect(await currentBadges(watching)).toEqual([]);
  await host.caller.plugins.setEnabled({
    pluginId: dataPluginId,
    enabled: true,
  });
  await expect
    .poll(() => currentBadges(watching))
    .toEqual([{ pluginId: dataPluginId, id: 'inbox', count: 2 }]);
});

async function currentBadges(caller: Caller): Promise<PluginBadge[]> {
  const stream = (await caller.plugins.badges())[Symbol.asyncIterator]();
  const current = await stream.next();
  await stream.return?.();

  return current.value ?? [];
}
