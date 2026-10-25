import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { currentPluginSurface } from '@repo/contracts/plugins/kit';
import {
  messageSlotFixture,
  rewrittenMessage,
} from '@repo/contracts/plugins/replaceable-fixtures';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { writeHookPlugins } from '#mocks/hook-plugins';
import { renderApp } from '#mocks/replaceable-app';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

const treeSource = (body: string): string => `
  import { Text } from '@argo/plugin-kit';
  import { jsx } from '@argo/plugin-kit/jsx-runtime';
  export async function register(argo) {
    await argo.on('ui.render', async (ctx, e, next) => { ${body} });
  }`;

it('runs ui.render Hooks by declared order and logs the props change and the shadowed Plugin', async () => {
  const { slotId } = messageSlotFixture;
  const home = await createRuntimePlugins([]);
  await writeHookPlugins(home, [
    {
      id: 'a-late',
      hooks: ['ui.render'],
      slots: [slotId],
      order: 20,
      source: treeSource(`return jsx(Text, { children: 'Late tree' });`),
    },
    {
      id: 'b-early',
      hooks: ['ui.render'],
      slots: [slotId],
      order: 10,
      source: treeSource(`
        await next(${JSON.stringify(rewrittenMessage())});
        return jsx(Text, { children: 'Early tree' });`),
    },
  ]);
  const { url } = await startEngineTestHost({ home });

  const app = renderApp(url, messageSlotFixture, currentPluginSurface('web'));

  await expect
    .poll(() => app.messages[0], { timeout: 15_000 })
    .toMatchObject({
      type: 'replacement',
      message: { root: { props: { children: 'Early tree' } } },
    });

  const lines = async (): Promise<string[]> =>
    (await readFile(join(home, 'logs/plugins.log'), 'utf8'))
      .split('\n')
      .filter((line) => line.includes(slotId));

  await expect
    .poll(lines, { timeout: 5000 })
    .toEqual(
      expect.arrayContaining([
        expect.stringContaining(`Plugin b-early: changed ${slotId} props`),
        expect.stringContaining(
          `Plugin a-late: ${slotId} shadowed by Plugin b-early's tree`,
        ),
      ]),
    );
}, 20_000);
