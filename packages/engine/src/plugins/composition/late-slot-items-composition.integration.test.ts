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

// Answers its first call, says it changed, then never answers again.
const slowing = `
  let calls = 0;
  export function register(argo) {
    argo.slots.register('${sessionRowSlotId}', ({ contexts }) => {
      calls += 1;
      if (calls > 1) return new Promise(() => {});
      setTimeout(() => argo.changed(), 0);
      return Object.fromEntries(contexts.map(({ sessionId }) => [sessionId, [{ text: 'first' }]]));
    });
  }`;

const lateLines = async (home: string): Promise<string[]> =>
  (await readFile(join(home, 'logs/plugins.log'), 'utf8').catch(() => ''))
    .split('\n')
    .filter((line) => line.includes('ran late'));

const shown = {
  items: [{ pluginId: 'slowing', item: { text: 'first' } }],
  overflow: [],
};

it('keeps what a Plugin last answered when its answer after a change runs late, and logs it', async () => {
  const home = await createRuntimePlugins([]);
  await writeHookPlugins(home, [
    { id: 'slowing', slots: [sessionRowSlotId], source: slowing },
  ]);
  const { createCaller } = await startEngineTestHost({ home });
  const controller = new AbortController();
  const app = createCaller({ signal: controller.signal });

  const first = async (): Promise<SlotItems | undefined> => {
    const items = await app.plugins.slotItems({
      slotId: sessionRowSlotId,
      contexts,
    });

    return (await items[Symbol.asyncIterator]().next()).value;
  };

  expect(await first()).toEqual({ first: shown, second: shown });
  // The change has landed by the time the late call it asked for has run out.
  await new Promise((resolve) => setTimeout(resolve, 200));
  expect(await first()).toEqual({ first: shown, second: shown });
  expect(await lateLines(home)).toEqual([
    expect.stringContaining(
      'Plugin slowing: core fallback argo/session/row/v1: items provider ran late',
    ),
  ]);
  controller.abort();
}, 30_000);
