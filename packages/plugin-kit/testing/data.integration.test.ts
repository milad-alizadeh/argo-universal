import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { dataFixture } from '../mocks/data-fixture';
import { drawnText, processRead, textPages } from './query-pages';

const count = `async ({ read }) => (await read(${processRead})).stdout`;

it('shares a process Query between two pages of one Project', async () => {
  const fixture = await dataFixture(
    textPages({ '/a': { load: count }, '/b': { load: count } }),
  );

  const kit = await fixture.start();

  expect(await drawnText(kit, { path: '/a', projectId: 'one' })).toBe('1');
  expect(await drawnText(kit, { path: '/b', projectId: 'one' })).toBe('1');
  expect(await fixture.requests()).toHaveLength(1);
});

it("reads a shared Query again at each page's own interval", async () => {
  const fixture = await dataFixture(
    textPages({
      '/slow': { load: count, every: 20000 },
      '/fast': { load: count, every: 10000 },
    }),
  );

  const kit = await fixture.start();

  expect(await drawnText(kit, { path: '/slow' })).toBe('1');
  expect(await drawnText(kit, { path: '/fast' })).toBe('1');
  await kit.clock.advance(10_000);
  expect(await drawnText(kit, { path: '/slow' })).toBe('1');
  expect(await drawnText(kit, { path: '/fast' })).toBe('2');
  expect(await drawnText(kit, { path: '/slow' })).toBe('2');
  expect(await fixture.requests()).toHaveLength(2);
});

it('separates Projects and runs the Query in each declaring Project folder', async () => {
  const fixture = await dataFixture(textPages({ '/': { load: count } }));
  const one = join(fixture.directory, 'one');
  const two = join(fixture.directory, 'two');
  await mkdir(one);
  await mkdir(two);
  const kit = await fixture.start({ projectPaths: { one, two } });

  expect(await drawnText(kit, { path: '/', projectId: 'one' })).toBe('1');
  expect(await drawnText(kit, { path: '/', projectId: 'two' })).toBe('2');
  expect(await drawnText(kit, { path: '/', projectId: 'one' })).toBe('1');
  expect(
    (await fixture.requests()).map((line) => JSON.parse(line).cwd),
  ).toEqual([one, two]);
});
