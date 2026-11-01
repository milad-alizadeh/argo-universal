import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { dataFixture, dataPage, processPage } from '../mocks/data-fixture';

it('shares a process Query between two pages of one Project', async () => {
  const fixture = await dataFixture(processPage);
  const kit = await fixture.start();

  const first = kit.page('/', undefined, 'one');

  await first.find('1');

  const second = kit.page('/', undefined, 'one');

  await second.find('1');
  expect(await fixture.requests()).toHaveLength(1);
});

it('uses the smallest live period, stops at the last release and refreshes an overdue warm entry', async () => {
  const source = processPage
    .replace(
      "argo.pages.register('/', Data);",
      `argo.pages.register('/slow', () => <Data every={20000} />); argo.pages.register('/fast', () => <Data every={10000} />);`,
    )
    .replace('function Data()', 'function Data({ every })')
    .replace(
      "argv: ['query-fixture'] });",
      "argv: ['query-fixture'] }, { every });",
    );

  const fixture = await dataFixture(source);
  const kit = await fixture.start();
  const slow = kit.page('/slow');
  await slow.find('1');
  const fast = kit.page('/fast');
  await fast.find('1');
  await kit.clock.advance(10_000);
  await slow.find('2');
  fast.close();
  await kit.clock.advance(10_000);
  expect(await fixture.requests()).toHaveLength(2);
  await kit.clock.advance(10_000);
  await slow.find('3');
  slow.close();
  await kit.clock.advance(3_600_000);
  expect(await fixture.requests()).toHaveLength(3);
  const reopened = kit.page('/slow');
  await reopened.find('4');
  expect(JSON.stringify(reopened.trees[0])).toContain('"children":"3"');
});

it('separates Projects and runs the Query in each declaring Project folder', async () => {
  const fixture = await dataFixture(processPage);
  const one = join(fixture.directory, 'one');
  const two = join(fixture.directory, 'two');
  await mkdir(one);
  await mkdir(two);
  const kit = await fixture.start({ projectPaths: { one, two } });

  const first = kit.page('/', undefined, 'one');

  await first.find('1');

  const second = kit.page('/', undefined, 'two');

  await second.find('2');
  expect(
    (await fixture.requests()).map((line) => JSON.parse(line).cwd),
  ).toEqual([one, two]);
});

it.each([9999, 10000, 10001])(
  'polls at the clamped boundary for every=%i',
  async (every) => {
    const fixture = await dataFixture(
      dataPage(undefined, `{ every: ${every} }`),
    );

    const kit = await fixture.start();
    const page = kit.page();
    await page.find('1');
    const period = every === 10001 ? 10001 : 10000;
    await kit.clock.advance(period - 1);
    expect(await fixture.requests()).toHaveLength(1);
    await kit.clock.advance(1);
    await page.find('2');
    expect(await fixture.requests()).toHaveLength(2);
    expect(
      (await kit.log()).split('\n').filter((line) => line.includes('clamped')),
    ).toHaveLength(every < 10000 ? 1 : 0);
  },
);
