import { appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';

const completedLine = 'background pass completed';

const processWait = { timeout: 3000 };

import { dataFixture, dataPage, dataPluginId } from '../mocks/data-fixture';

it('sets a nav badge from the completed headless Query before unmounting', async () => {
  const fixture = await dataFixture(
    `import {Text,useData,useEffect} from '@argo/plugin-kit';
    export function register(argo) {
      argo.pages.register('/', () => {
        const {data} = useData({api:'process',action:'run',argv:['query-fixture']});
        useEffect(() => { if (data) void argo.nav.badge('inbox',Number(data.stdout)); }, [data]);
        return <Text>{data?.stdout ?? 'empty'}</Text>;
      });
    }`,
    {
      nav: [{ id: 'inbox', title: 'Inbox', path: '/' }],
      background: { path: '/', interval: 300000 },
    },
  );

  const kit = await fixture.start({ projectPaths: { one: fixture.directory } });
  const controller = new AbortController();
  const badges = kit.badges(controller.signal);
  await expect.poll(() => kit.log(), processWait).toContain(completedLine);
  expect((await badges.next()).value).toEqual([
    { pluginId: dataPluginId, id: 'inbox', count: 1 },
  ]);
  await kit.clock.advance(300000);
  await expect
    .poll(async () => (await badges.next()).value)
    .toEqual([{ pluginId: dataPluginId, id: 'inbox', count: 2 }]);
  controller.abort();
  await badges.return([]);
});

it('unmounts a background page at its sixty-second budget with a Query still in flight', async () => {
  const fixture = await dataFixture(
    dataPage(
      "{api:'process',action:'run',argv:['query-fixture'],timeoutMs:120000}",
    ),
    { background: { path: '/', interval: 300000 } },
  );

  await appendFile(
    join(fixture.directory, 'query-fixture'),
    '\nsetInterval(() => {}, 1000);\n',
  );
  const kit = await fixture.start({ projectPaths: { one: fixture.directory } });
  await expect.poll(() => fixture.requests(), processWait).toHaveLength(1);
  await kit.clock.advance(59999);
  expect(await kit.log()).not.toContain(completedLine);
  await kit.clock.advance(1);
  await expect
    .poll(() => kit.log(), processWait)
    .toContain('background pass reached 60000 ms');
  await expect.poll(() => kit.log(), processWait).toContain(completedLine);
  expect(await fixture.requests()).toHaveLength(1);
});

it('refuses an unregistered background path during normal Plugin activation', async () => {
  const fixture = await dataFixture(dataPage(), {
    background: { path: '/missing', interval: 300000 },
  });

  const kit = await fixture.start({ projectPaths: { one: fixture.directory } });
  await expect
    .poll(() => kit.log(), processWait)
    .toContain('Background path /missing is not a registered page');
  expect(await fixture.requests()).toEqual([]);
  await expect(kit.page().ready()).rejects.toThrow(
    'Background path /missing is not a registered page',
  );
});
