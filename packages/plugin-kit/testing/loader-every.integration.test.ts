import { expect, it } from 'vitest';
import { dataFixture } from '../mocks/data-fixture';

// A Loader page drawn again on a clock (ADR-0050), reading the fixture's count through a described Query.
const everyPage = (every?: number): string => `
import { Text } from '@argo/plugin-kit';
export function register(argo) {
  argo.pages.define('/', {
    ${every === undefined ? '' : `every: ${every},`}
    load: ({ read }) => read({ api: 'process', action: 'run', argv: ['query-fixture'] }),
    render: (run) => <Text>{run.stdout}</Text>,
  });
}`;

type Kit = Awaited<ReturnType<Awaited<ReturnType<typeof dataFixture>>['start']>>;

async function hashOf(kit: Kit): Promise<string> {
  const answer = await kit.pages.draw({ path: '/' });

  if (answer.kind === 'failed') throw new Error(answer.error);

  return answer.hash;
}

it.each([9999, 10000, 10001])(
  'draws again on the clamped interval for every=%i, reading its Query once the answer is that old',
  async (every) => {
    const fixture = await dataFixture(everyPage(every));
    const kit = await fixture.start();
    const period = Math.max(every, 10000);

    const known = await hashOf(kit);

    await kit.clock.advance(period - 1);
    expect(await kit.pages.draw({ path: '/', known })).toMatchObject({
      kind: 'unchanged',
      every: period,
    });
    expect(await fixture.requests()).toHaveLength(1);

    await kit.clock.advance(1);
    expect(await kit.pages.draw({ path: '/', known })).toMatchObject({
      kind: 'tree',
      every: period,
      root: { props: { children: '2' } },
    });
    expect(await fixture.requests()).toHaveLength(2);
    expect(
      (await kit.log()).split('\n').filter((line) => line.includes('clamped')),
    ).toHaveLength(every < 10000 ? 1 : 0);
  },
);

it('keeps the Query answer of a page with no interval until a write', async () => {
  const fixture = await dataFixture(everyPage());
  const kit = await fixture.start();
  const known = await hashOf(kit);

  await kit.clock.advance(60000);

  const again = await kit.pages.draw({ path: '/', known });

  expect(again).toMatchObject({ kind: 'unchanged' });
  expect(again).not.toHaveProperty('every');
  expect(await fixture.requests()).toHaveLength(1);
});

it('refuses an interval that is not a whole number of ms', async () => {
  const kit = await (await dataFixture(everyPage(0.5))).start();

  expect(await kit.pages.draw({ path: '/' })).toMatchObject({
    kind: 'failed',
    error: expect.stringMatching(/every is a whole number of ms/),
  });
});
