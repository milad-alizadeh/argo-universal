import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { sessionRowSlotId, type SlotItems } from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { writeHookPlugins } from '#mocks/hook-plugins';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

const contexts = [
  { sessionId: 'first', projectId: 'argo' },
  { sessionId: 'second', projectId: 'argo' },
];

// A provider that names each item after how many batched calls it has answered.
const counting = (labels: string[], afterFirst = ''): string => `
  let calls = 0;
  export function register(argo) {
    argo.slots.register('${sessionRowSlotId}', ({ contexts }) => {
      calls += 1;
      if (calls === 1) { ${afterFirst} }
      return Object.fromEntries(contexts.map(({ sessionId }) =>
        [sessionId, ${JSON.stringify(labels)}.map((label) => ({ text: label + calls }))]));
    });
  }`;

const provider = (body: string): string => `
  export function register(argo) {
    argo.slots.register('${sessionRowSlotId}', ${body});
  }`;

// One Session row Slot item as the App reads it back, with the Plugin that sent it.
type Attributed = { pluginId: string; item: { text: string } };

const row = (pluginId: string, texts: string[]): Attributed[] =>
  texts.map((text) => ({ pluginId, item: { text } }));

type Merged = { items: Attributed[]; overflow: Attributed[] };

const merged = (counter: number): Merged => ({
  items: [
    ...row('counter', [`a${counter}`, `b${counter}`]),
    ...row('second', ['c1']),
  ],
  overflow: row('second', ['d1']),
});

const pluginLines = async (home: string): Promise<string[]> =>
  (await readFile(join(home, 'logs/plugins.log'), 'utf8').catch(() => ''))
    .split('\n')
    .filter((line) => line.includes(sessionRowSlotId));

it('merges Session row items in Plugin order, limits them, leaves failing Plugins out alone and asks again after a change', async () => {
  const home = await createRuntimePlugins([]);
  await writeHookPlugins(home, [
    {
      id: 'counter',
      slots: [sessionRowSlotId],
      order: 1,
      source: counting(
        ['a', 'b'],
        `setTimeout(() => argo.slots.changed('${sessionRowSlotId}'), 0);`,
      ),
    },
    {
      id: 'second',
      slots: [sessionRowSlotId],
      order: 2,
      source: counting(['c', 'd']),
    },
    {
      id: 'thrower',
      slots: [sessionRowSlotId],
      order: 3,
      source: provider(`() => { throw new Error('broken'); }`),
    },
    {
      id: 'off-schema',
      slots: [sessionRowSlotId],
      order: 4,
      source: provider(`() => ({ first: [{ text: 'x'.repeat(41) }] })`),
    },
    {
      id: 'late',
      slots: [sessionRowSlotId],
      order: 5,
      source: provider(`() => new Promise(() => {})`),
    },
  ]);
  const { createCaller } = await startEngineTestHost({ home });
  const controller = new AbortController();
  const app = createCaller({ signal: controller.signal });

  const list = (): Promise<AsyncIterator<SlotItems>> =>
    app.plugins
      .slotItems({ slotId: sessionRowSlotId, contexts })
      .then((items) => items[Symbol.asyncIterator]());

  const items = await list();

  // One call per Plugin for the whole list; the change refreshes the counter alone, and `second` stays kept.
  expect((await items.next()).value).toEqual({
    first: merged(1),
    second: merged(1),
  });
  expect((await items.next()).value).toEqual({
    first: merged(2),
    second: merged(2),
  });

  const again = await list();

  expect((await again.next()).value).toEqual({
    first: merged(2),
    second: merged(2),
  });
  controller.abort();

  const lines = await pluginLines(home);

  // Each failing Plugin is logged once, in whatever order their answers came.
  expect(lines).toHaveLength(3);
  expect(lines).toEqual(
    expect.arrayContaining([
      expect.stringContaining(
        'Plugin thrower: core fallback argo/session/row/v1: items provider threw',
      ),
      expect.stringContaining(
        'Plugin off-schema: core fallback argo/session/row/v1: items failed the Slot schema',
      ),
      expect.stringContaining(
        'Plugin late: core fallback argo/session/row/v1: items provider ran late',
      ),
    ]),
  );
}, 30_000);

it('answers no items and starts no Plugin when none declares the Slot', async () => {
  const home = await createRuntimePlugins([]);
  await writeHookPlugins(home, [{ id: 'elsewhere', source: counting(['a']) }]);
  const { createCaller } = await startEngineTestHost({ home });
  const app = createCaller({ signal: new AbortController().signal });

  const items = await app.plugins.slotItems({
    slotId: sessionRowSlotId,
    contexts,
  });

  for await (const answer of items) expect(answer).toEqual({});
  expect((await app.plugin.list()).plugins[0]?.state).not.toBe('running');
});
