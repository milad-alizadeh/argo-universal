import type { PluginTest } from '@argo/plugin-kit/testing';
import type { StaleMark } from '@repo/contracts/plugins/page-address';
import { expect, it } from 'vitest';
import { dataFixture, dataPluginId } from '../mocks/data-fixture';

type Declared = {
  name: string;
  label: string;
  description: string;
  tier: 'act' | 'read';
  policy: 'allow';
  params: Record<never, never>;
};

const operation = (name: string, description: string): Declared => ({
  name,
  label: description,
  description,
  tier: 'act',
  policy: 'allow',
  params: {},
});

/*
 * One count drawn by a Loader page through a named read. `bumpAndSay` writes and says so with `argo.changed()`, as
 * a Plugin's own change listener would; `sayAndFail` writes and says so, then fails; `sayOnly` says so with nothing
 * written; `peek` is a read-tier Operation.
 */
const source = `import { Text } from '@argo/plugin-kit';
let count = 0;
export function register(argo) {
  const counted = argo.queries.define('count', async () => count);
  argo.operations.register('bumpAndSay', async () => {
    await Promise.resolve();
    count += 1;
    argo.changed();
    return { count };
  });
  argo.operations.register('sayAndFail', async () => {
    count += 1;
    argo.changed();
    throw new Error('GitHub refused the write');
  });
  argo.operations.register('sayOnly', async () => { argo.changed(); return null; });
  argo.operations.register('peek', async () => ({ count }));
  argo.pages.define('/', { load: ({ read }) => read(counted({})), render: (seen) => <Text>{'Count ' + seen}</Text> });
}`;

async function start(): Promise<PluginTest> {
  const fixture = await dataFixture(source, {
    operations: [
      operation('bumpAndSay', 'Adds one to the count and says it changed.'),
      operation('sayAndFail', 'Writes and says the count changed, then fails.'),
      operation('sayOnly', 'Says the count changed with nothing written.'),
      { ...operation('peek', 'Reads the count.'), tier: 'read' as const },
    ],
  });

  return fixture.start();
}

// A mark the stream is still waiting on when `nextMark` gives up on it, kept so the next read takes it and no mark is lost.
const pending = new WeakMap<
  AsyncGenerator<StaleMark>,
  Promise<IteratorResult<StaleMark>>
>();

const peek = (
  stale: AsyncGenerator<StaleMark>,
): Promise<IteratorResult<StaleMark>> => {
  const waiting = pending.get(stale) ?? stale.next();

  pending.set(stale, waiting);

  return waiting;
};

// The next mark, once it comes.
async function next(
  stale: AsyncGenerator<StaleMark>,
): Promise<IteratorResult<StaleMark>> {
  const mark = await peek(stale);

  pending.delete(stale);

  return mark;
}

// The next mark, or none if none comes soon after.
async function nextMark(
  stale: AsyncGenerator<StaleMark>,
): Promise<IteratorResult<StaleMark> | 'none'> {
  const mark = await Promise.race([
    peek(stale),
    new Promise<'none'>((settle) => setTimeout(() => settle('none'), 100)),
  ]);

  if (mark !== 'none') pending.delete(stale);

  return mark;
}

const marked = { pluginId: dataPluginId, addresses: [{ path: '/' }] };

// Past the window Argo coalesces a Plugin's changes in (ADR-0060).
const window = 250;

it('marks the address whose answer changed once when an Operation says argo.changed() as it writes', async () => {
  const kit = await start();
  const controller = new AbortController();

  await kit.pages.draw({ path: '/' });

  const stale = kit.pages.stale(controller.signal);

  await kit.pages.run({ operation: 'bumpAndSay', args: {} });
  await kit.clock.advance(window);

  expect((await next(stale)).value).toMatchObject(marked);
  expect(await nextMark(stale)).toBe('none');
  controller.abort();
});

it('still marks the address when an Operation that wrote and said argo.changed() fails', async () => {
  const kit = await start();
  const controller = new AbortController();

  await kit.pages.draw({ path: '/' });

  const stale = kit.pages.stale(controller.signal);

  await expect(
    kit.pages.run({ operation: 'sayAndFail', args: {} }),
  ).rejects.toThrow(/GitHub refused the write/u);
  await kit.clock.advance(window);

  expect((await next(stale)).value).toMatchObject(marked);
  expect(await nextMark(stale)).toBe('none');
  controller.abort();
});

it('marks nothing when argo.changed() is said and no answer differs, or a read-tier Operation runs', async () => {
  const kit = await start();
  const controller = new AbortController();

  await kit.pages.draw({ path: '/' });

  const stale = kit.pages.stale(controller.signal);

  await kit.pages.run({ operation: 'sayOnly', args: {} });
  await kit.pages.run({ operation: 'peek', args: {} });
  await kit.clock.advance(window);

  expect(await nextMark(stale)).toBe('none');

  // The window has passed and its read was served: a real write still marks, once, so nothing was marked before it.
  await kit.pages.run({ operation: 'bumpAndSay', args: {} });
  await kit.clock.advance(window);

  expect((await next(stale)).value).toMatchObject(marked);
  expect(await nextMark(stale)).toBe('none');
  controller.abort();
});
