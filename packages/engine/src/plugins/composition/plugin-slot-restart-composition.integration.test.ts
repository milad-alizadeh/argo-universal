import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { sessionRowSlotId, type SlotItems } from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { createRuntimePlugins, shippedFolder } from '#mocks/runtime-plugins';

const contexts = [{ sessionId: 'first', projectId: 'argo' }];

// Answers one pull request per Session until a reload declares `hang`, then never answers again.
const restarting = `
  export function register(argo) {
    argo.slots.register('${sessionRowSlotId}', ({ contexts }) =>
      typeof hang === 'undefined'
        ? Object.fromEntries(contexts.map(({ sessionId }) => [sessionId, [{ text: 'PR 2304' }]]))
        : new Promise(() => {}));
  }`;

const leftOutLines = async (home: string): Promise<string[]> =>
  (await readFile(join(home, 'logs/plugins.log'), 'utf8').catch(() => ''))
    .split('\n')
    .filter((line) => line.includes(`core fallback ${sessionRowSlotId}`));

it("keeps a Session row's items while its Plugin restarts and then runs late", async () => {
  const home = await createRuntimePlugins([
    {
      id: 'restarting',
      fixture: 'healthy',
      dev: true,
      slots: [sessionRowSlotId],
    },
  ]);

  const entry = join(home, shippedFolder, 'restarting', 'index.mjs');

  await writeFile(entry, restarting);

  const { createCaller } = await startEngineTestHost({ home });
  const controller = new AbortController();
  const app = createCaller({ signal: controller.signal });

  const firstAnswer = async (): Promise<SlotItems | undefined> => {
    const items = await app.plugins.slotItems({
      slotId: sessionRowSlotId,
      contexts,
    });

    return (await items[Symbol.asyncIterator]().next()).value;
  };

  const before = await firstAnswer();

  await appendFile(entry, '\nvar hang = true;\n');

  // Each new list asks the reloaded Plugin, which is not running yet or never answers; either is logged.
  await expect
    .poll(
      async () => {
        await firstAnswer();

        return leftOutLines(home);
      },
      { timeout: 20_000 },
    )
    .not.toEqual([]);

  expect(await firstAnswer()).toEqual(before);
  controller.abort();
}, 30_000);
