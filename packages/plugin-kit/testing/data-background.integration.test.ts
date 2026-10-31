import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { dataFixture, dataPage, processWait } from '../mocks/data-fixture';

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

    await expect.poll(() => fixture.requests(), processWait).toHaveLength(1);
    await expect.poll(() => kit.log(), processWait).toContain(completedLine);
    await kit.clock.advance(10_000);
    expect(await fixture.requests()).toHaveLength(1);
    const period = Math.max(interval, 300000);
    await kit.clock.advance(period - 10001);
    expect(await fixture.requests()).toHaveLength(1);
    await kit.clock.advance(1);
    await expect.poll(() => fixture.requests(), processWait).toHaveLength(2);
    await expect.poll(() => kit.log(), processWait).toContain(completedLine);

    const page = kit.page('/', undefined, 'one');

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
  expect(await fixture.requests()).toHaveLength(3);
  await kit.projects.remove('one');
  await kit.clock.advance(1000);
  await expect.poll(() => completed(kit), processWait).toBe(4);
  await kit.clock.advance(299000);
  expect(await fixture.requests()).toHaveLength(4);
  await kit.projects.add({
    id: 'one',
    name: 'One',
    originUrl: null,
    path: one,
  });

  const readded = kit.page('/', undefined, 'one');

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
  await expect.poll(() => completed(kit), processWait).toBe(1);
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
  await expect.poll(() => completed(kit), processWait).toBe(1);
  await kit.clock.advance(600000);
  expect(refusals(await kit.log())).toHaveLength(1);
  const page = kit.page('/', undefined, 'one');
  await page.ready();
  await expect
    .poll(async () => refusals(await kit.log()), processWait)
    .toHaveLength(2);
});

function refusals(log: string): string[] {
  return log
    .split('\n')
    .filter((line) => line.includes('refused argo.process'));
}

it('activates a crashed Plugin again on the next background interval', async () => {
  const fixture = await dataFixture(
    "export function register() { throw new Error('cannot start'); }",
    { background: { path: '/', interval: 300000 } },
  );

  const kit = await fixture.start({ projectPaths: { one: fixture.directory } });
  await expect
    .poll(() => kit.log(), processWait)
    .toContain('background pass failed');
  await writeFile(join(fixture.directory, 'index.tsx'), dataPage());
  await kit.clock.advance(300000);
  await expect.poll(() => completed(kit), processWait).toBe(1);
  expect(await fixture.requests()).toHaveLength(1);
});
