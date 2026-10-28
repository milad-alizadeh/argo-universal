import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { sessionBarSlotId, type SlotItems } from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { writeHookPlugins } from '#mocks/hook-plugins';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

const contexts = [
  { sessionId: 'first', projectId: 'argo' },
  { sessionId: 'second', projectId: 'argo' },
];

// A provider that answers `items` for the first Session only.
const provider = (items: string): string => `
  export function register(argo) {
    argo.slots.register('${sessionBarSlotId}', () => ({ first: ${items} }));
  }`;

const bar = (text: string): string => JSON.stringify([{ text }]);

const pluginLines = async (home: string): Promise<string[]> =>
  (await readFile(join(home, 'logs/plugins.log'), 'utf8').catch(() => ''))
    .split('\n')
    .filter((line) => line.includes(sessionBarSlotId));

it('shows the first Plugin in Slot order on the Session bar, keeps the rest attributed for "+N", and leaves out a Plugin that sends two lines', async () => {
  const home = await createRuntimePlugins([]);

  await writeHookPlugins(home, [
    {
      id: 'deploys',
      slots: [sessionBarSlotId],
      order: 2,
      source: provider(bar('Preview ready')),
    },
    {
      id: 'issues',
      slots: [sessionBarSlotId],
      order: 1,
      source: provider(bar('#412 · In review')),
    },
    {
      id: 'coverage',
      slots: [sessionBarSlotId],
      order: 3,
      source: provider(bar('78% covered')),
    },
    {
      id: 'chatty',
      slots: [sessionBarSlotId],
      order: 0,
      source: provider(JSON.stringify([{ text: 'one' }, { text: 'two' }])),
    },
  ]);
  const { createCaller } = await startEngineTestHost({ home });
  const controller = new AbortController();
  const app = createCaller({ signal: controller.signal });

  const answers = await app.plugins.slotItems({
    slotId: sessionBarSlotId,
    contexts,
  });

  const first = await answers[Symbol.asyncIterator]().next();
  controller.abort();

  const merged: SlotItems = {
    first: {
      items: [{ pluginId: 'issues', item: { text: '#412 · In review' } }],
      overflow: [
        { pluginId: 'deploys', item: { text: 'Preview ready' } },
        { pluginId: 'coverage', item: { text: '78% covered' } },
      ],
    },
  };

  expect(first.value).toEqual(merged);
  expect(await pluginLines(home)).toEqual([
    expect.stringContaining(
      'Plugin chatty: core fallback argo/session/bar/v1: items failed the Slot schema',
    ),
  ]);
}, 30_000);
