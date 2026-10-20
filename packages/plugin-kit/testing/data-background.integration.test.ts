import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { dataFixture, dataPage } from '../mocks/data-fixture';

const completedLine = 'background pass completed';

it.each([299999, 300000, 300001])(
  'warms a page headlessly and clamps the background interval %i',
  async (interval) => {
    const fixture = await dataFixture(dataPage(undefined, '{ every: 1 }'), {
      background: { path: '/', interval },
    });

    const kit = await fixture.start({
      projectPaths: { one: fixture.directory },
    });

    await expect
      .poll(() => fixture.requests(), { timeout: 3000 })
      .toHaveLength(1);
    await expect.poll(() => kit.log()).toContain(completedLine);
    await kit.clock.advance(10_000);
    expect(await fixture.requests()).toHaveLength(1);
    const period = Math.max(interval, 300000);
    await kit.clock.advance(period - 10001);
    expect(await fixture.requests()).toHaveLength(1);
    await kit.clock.advance(1);
    await expect.poll(() => fixture.requests()).toHaveLength(2);
    await expect.poll(() => kit.log()).toContain(completedLine);

    const page = kit.slot({
      slotId: 'argo/project/details/v1',
      context: { projectId: 'one' },
    });

    await page.find('2');
    expect(JSON.stringify(page.trees[0])).toContain('"children":"2"');
    expect(await fixture.requests()).toHaveLength(2);
    expect(
      (await kit.log())
        .split('\n')
        .filter(
          (line) =>
            line.includes('background interval') && line.includes('clamped'),
        ),
    ).toHaveLength(interval < 300000 ? 1 : 0);
  },
);

it('starts one drifting pass for each added Project and releases a removed Project', async () => {
  const fixture = await dataFixture(dataPage(), {
    background: { path: '/', interval: 300000 },
  });

  const one = join(fixture.directory, 'one');
  const two = join(fixture.directory, 'two');
  await mkdir(one);
  await mkdir(two);
  const kit = await fixture.start({ projectPaths: { one } });
  await expect.poll(() => completed(kit)).toBe(1);
  await kit.clock.advance(1000);
  await kit.projects.add({
    id: 'two',
    name: 'Two',
    originUrl: null,
    path: two,
  });
  await expect.poll(() => completed(kit)).toBe(2);
  await kit.clock.advance(299000);
  await expect.poll(() => completed(kit)).toBe(3);
  expect(await fixture.requests()).toHaveLength(3);
  await kit.projects.remove('one');
  await kit.clock.advance(1000);
  await expect.poll(() => completed(kit)).toBe(4);
  await kit.clock.advance(299000);
  expect(await fixture.requests()).toHaveLength(4);
  await kit.projects.add({
    id: 'one',
    name: 'One',
    originUrl: null,
    path: one,
  });

  const readded = kit.slot({
    slotId: 'argo/project/details/v1',
    context: { projectId: 'one' },
  });

  await readded.find('5');
  expect(JSON.stringify(readded.trees)).not.toContain('"children":"3"');
  expect(
    (await fixture.requests()).map((line) => JSON.parse(line).cwd),
  ).toEqual([one, two, one, two, one]);
});

it('creates no Project-less pass and starts when the first Project is added', async () => {
  const fixture = await dataFixture(dataPage(), {
    background: { path: '/', interval: 300000 },
  });

  const kit = await fixture.start();
  await kit.clock.advance(600000);
  expect(await fixture.requests()).toEqual([]);
  await kit.projects.add({
    id: 'one',
    name: 'One',
    originUrl: null,
    path: fixture.directory,
  });
  await expect.poll(() => completed(kit)).toBe(1);
  expect(await fixture.requests()).toHaveLength(1);
});

async function completed(kit: { log: () => Promise<string> }): Promise<number> {
  return (await kit.log())
    .split('\n')
    .filter((line) => line.includes(completedLine)).length;
}

it('stops a refused background Query until the Plugin is opened', async () => {
  const fixture = await dataFixture(
    dataPage(
      "{api:'process',action:'run',argv:['undeclared-command']}",
      '{every:10000}',
    ),
    { background: { path: '/', interval: 300000 } },
  );

  const kit = await fixture.start({ projectPaths: { one: fixture.directory } });
  await expect.poll(() => completed(kit)).toBe(1);
  await kit.clock.advance(600000);
  expect(refusals(await kit.log())).toHaveLength(1);
  const page = kit.page('/', undefined, 'one');
  await page.ready();
  await expect.poll(async () => refusals(await kit.log())).toHaveLength(2);
});

function refusals(log: string): string[] {
  return log
    .split('\n')
    .filter((line) => line.includes('refused argo.process'));
}
