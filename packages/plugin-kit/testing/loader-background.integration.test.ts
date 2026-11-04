import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { dataFixture, dataPluginId, processWait } from '../mocks/data-fixture';
import {
  background,
  backgroundPage,
  completed,
  projectsAsked,
} from './loader-background-fixture';

it('sets a badge from what the Loader read, with no page open', async () => {
  const fixture = await dataFixture(backgroundPage(), background());
  const kit = await fixture.start({ projectPaths: { one: fixture.directory } });
  const controller = new AbortController();
  const badges = kit.badges(controller.signal);

  await expect.poll(() => completed(kit), processWait).toBe(1);
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

it('runs one pass for each added Project, with its id, and none for a removed Project', async () => {
  const fixture = await dataFixture(backgroundPage(), background());
  const one = join(fixture.directory, 'one');
  const two = join(fixture.directory, 'two');
  await mkdir(one);
  await mkdir(two);
  const kit = await fixture.start({ projectPaths: { one } });

  await expect.poll(() => completed(kit), processWait).toBe(1);
  await kit.clock.advance(1000);
  await kit.projects.add({
    id: 'two',
    name: 'Two',
    originUrl: null,
    path: two,
  });
  await expect.poll(() => completed(kit), processWait).toBe(2);
  await kit.clock.advance(299000);
  await expect.poll(() => completed(kit), processWait).toBe(3);
  await kit.projects.remove('one');
  await kit.clock.advance(1000);
  await expect.poll(() => completed(kit), processWait).toBe(4);
  await kit.clock.advance(299000);
  expect(await projectsAsked(fixture)).toEqual(['one', 'two', 'one', 'two']);
});

it('runs no Project-less pass and starts when the first Project is added', async () => {
  const fixture = await dataFixture(backgroundPage(), background());
  const kit = await fixture.start();

  await kit.clock.advance(600000);
  expect(await fixture.requests()).toEqual([]);
  await kit.projects.add({
    id: 'one',
    name: 'One',
    originUrl: null,
    path: fixture.directory,
  });
  await expect.poll(() => completed(kit), processWait).toBe(1);
  expect(await projectsAsked(fixture)).toEqual(['one']);
});
