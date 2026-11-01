import { rename } from 'node:fs/promises';
import { join } from 'node:path';
import { sessionRowSlotId } from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { writeHookPlugins } from '#mocks/hook-plugins';
import { createRuntimePlugins, shippedFolder } from '#mocks/runtime-plugins';

const contexts = [
  { sessionId: 'first', projectId: 'argo' },
  { sessionId: 'second', projectId: 'argo' },
];

// A provider that names each item after how many batched calls it has answered.
const counting = (labels: string[]): string => `
  let calls = 0;
  export function register(argo) {
    argo.slots.register('${sessionRowSlotId}', ({ contexts }) => {
      calls += 1;
      return Object.fromEntries(contexts.map(({ sessionId }) =>
        [sessionId, ${JSON.stringify(labels)}.map((label) => ({ text: label + calls }))]));
    });
  }`;

const row = (
  pluginId: string,
  texts: string[],
): { pluginId: string; item: { text: string } }[] =>
  texts.map((text) => ({ pluginId, item: { text } }));

it('orders items by Plugin id, not by the folder a Plugin sits in', async () => {
  const home = await createRuntimePlugins([]);

  await writeHookPlugins(home, [
    { id: 'alpha', slots: [sessionRowSlotId], source: counting(['a']) },
    { id: 'beta', slots: [sessionRowSlotId], source: counting(['b']) },
  ]);

  await rename(
    join(home, shippedFolder, 'alpha'),
    join(home, shippedFolder, 'zeta'),
  );

  const { createCaller } = await startEngineTestHost({ home });
  const app = createCaller({ signal: new AbortController().signal });

  const items = (
    await app.plugins.slotItems({ slotId: sessionRowSlotId, contexts })
  )[Symbol.asyncIterator]();

  expect((await items.next()).value).toEqual({
    first: {
      items: [...row('alpha', ['a1']), ...row('beta', ['b1'])],
      overflow: [],
    },
    second: {
      items: [...row('alpha', ['a1']), ...row('beta', ['b1'])],
      overflow: [],
    },
  });
}, 30_000);
