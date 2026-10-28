import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  sessionActivitySlotId,
  type SlotItems,
} from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { writeHookPlugins } from '#mocks/hook-plugins';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

const contexts = [
  { sessionId: 'first', projectId: 'argo' },
  { sessionId: 'second', projectId: 'argo' },
];

const provider = (body: string): string => `
  export function register(argo) {
    argo.slots.register('${sessionActivitySlotId}', ${body});
  }`;

// A Plugin that writes one Activity line for every Session it is asked about.
const activityLine = (text: string): string =>
  provider(
    `({ contexts }) => Object.fromEntries(contexts.map(({ sessionId }) => [sessionId, [{ text: '${text}' }]]))`,
  );

const activityLogLines = async (home: string): Promise<string[]> =>
  (await readFile(join(home, 'logs/plugins.log'), 'utf8').catch(() => ''))
    .split('\n')
    .filter((line) => line.includes(sessionActivitySlotId));

// The first answer that has every Plugin's line: a Plugin whose worker is still starting joins once it is up.
async function answerFrom(
  answers: AsyncIterable<SlotItems>,
  done: (answer: SlotItems) => boolean,
): Promise<SlotItems | undefined> {
  for await (const answer of answers) if (done(answer)) return answer;

  return undefined;
}

const bothLines = (answer: SlotItems): boolean =>
  Boolean(answer.first?.overflow.length);

it('answers each Session’s Activity line from every Plugin in order, the first shown and the rest behind it, and leaves a failing Plugin out alone', async () => {
  const home = await createRuntimePlugins([]);
  await writeHookPlugins(home, [
    {
      id: 'tracker',
      slots: [sessionActivitySlotId],
      order: 1,
      source: activityLine('Awaiting review'),
    },
    {
      id: 'thrower',
      slots: [sessionActivitySlotId],
      order: 2,
      source: provider(`() => { throw new Error('broken'); }`),
    },
    {
      id: 'deploys',
      slots: [sessionActivitySlotId],
      order: 3,
      source: activityLine('Deploying'),
    },
  ]);
  const { createCaller } = await startEngineTestHost({ home });
  const controller = new AbortController();
  const app = createCaller({ signal: controller.signal });

  const lines = await app.plugins.slotItems({
    slotId: sessionActivitySlotId,
    contexts,
  });

  // One line fits a row; the App shows the line of whichever Plugin this Device chose.
  const line: SlotItems[string] = {
    items: [{ pluginId: 'tracker', item: { text: 'Awaiting review' } }],
    overflow: [{ pluginId: 'deploys', item: { text: 'Deploying' } }],
  };

  expect(await answerFrom(lines, bothLines)).toEqual({
    first: line,
    second: line,
  });
  controller.abort();

  expect(await activityLogLines(home)).toEqual([
    expect.stringContaining(
      `Plugin thrower: core fallback ${sessionActivitySlotId}: items provider threw`,
    ),
  ]);
}, 30_000);
