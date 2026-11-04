import type { PluginTest } from '@argo/plugin-kit/testing';
import type { StaleMark } from '@repo/contracts/plugins/page-address';
import { expect, it } from 'vitest';
import { dataFixture, dataPluginId } from '../mocks/data-fixture';

type Declared = {
  name: string;
  label: string;
  description: string;
  tier: 'act';
  params: Record<never, never>;
};

const operation = (name: string, description: string): Declared => ({
  name,
  label: description,
  description,
  tier: 'act',
  params: {},
});

/*
 * One count drawn by a Loader page. `bumpAndSay` writes and says so with `argo.changed()`, as a Plugin's
 * own change listener would; `sayAndFail` says so, then fails.
 */
const source = `import { Text } from '@argo/plugin-kit';
let count = 0;
export function register(argo) {
  argo.operations.register('bumpAndSay', async () => {
    await Promise.resolve();
    count += 1;
    argo.changed();
    return { count };
  });
  argo.operations.register('sayAndFail', async () => {
    argo.changed();
    throw new Error('GitHub refused the write');
  });
  argo.pages.define('/', { load: () => count, render: (seen) => <Text>{'Count ' + seen}</Text> });
}`;

async function start(): Promise<PluginTest> {
  const fixture = await dataFixture(source, {
    operations: [
      operation('bumpAndSay', 'Adds one to the count and says it changed.'),
      operation('sayAndFail', 'Says the count changed, then fails.'),
    ],
  });

  return fixture.start();
}

// The next mark, or none if none comes soon after.
const nextMark = (
  stale: AsyncGenerator<StaleMark>,
): Promise<IteratorResult<StaleMark> | 'none'> =>
  Promise.race([
    stale.next(),
    new Promise<'none'>((settle) => setTimeout(() => settle('none'), 100)),
  ]);

const marked = { pluginId: dataPluginId };

it('marks the pages once when an Operation says argo.changed() as it writes', async () => {
  const kit = await start();
  const controller = new AbortController();

  await kit.pages.draw({ path: '/' });

  const stale = kit.pages.stale(controller.signal);

  await kit.pages.run({ operation: 'bumpAndSay', args: {} });

  expect((await stale.next()).value).toEqual(marked);
  expect(await nextMark(stale)).toBe('none');
  controller.abort();
});

it('still marks the pages when an Operation that said argo.changed() fails', async () => {
  const kit = await start();
  const controller = new AbortController();

  await kit.pages.draw({ path: '/' });

  const stale = kit.pages.stale(controller.signal);

  await expect(
    kit.pages.run({ operation: 'sayAndFail', args: {} }),
  ).rejects.toThrow(/GitHub refused the write/u);

  expect((await stale.next()).value).toEqual(marked);
  expect(await nextMark(stale)).toBe('none');
  controller.abort();
});
