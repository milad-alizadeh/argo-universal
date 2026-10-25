import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { currentPluginSurface } from '@repo/contracts/plugins/kit';
import { toolCallSlotFixture } from '@repo/contracts/plugins/replaceable-fixtures';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { writeHookPlugins } from '#mocks/hook-plugins';
import { renderApp } from '#mocks/replaceable-app';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

it('retains a downstream replacement when an outer Hook exhausts its budget on an argo call', async () => {
  const home = await createRuntimePlugins([]);
  await writeHookPlugins(home, [
    {
      id: 'a-delay',
      hooks: ['ui.render'],
      renders: [toolCallSlotFixture.slotId],
      capabilities: [{ kind: 'process:exec', command: 'sleep', args: ['31'] }],
      source: `export async function register(argo) {
        await argo.on('ui.render', async (ctx, e, next) => {
          const answer = await next(e);
          await argo.process.run(['sleep', '31'], { timeoutMs: 40000 });
          return answer;
        });
      }`,
    },
    {
      id: 'b-tree',
      hooks: ['ui.render'],
      renders: [toolCallSlotFixture.slotId],
      source: `import { Text } from '@argo/plugin-kit';
        import { jsx } from '@argo/plugin-kit/jsx-runtime';
        export async function register(argo) {
          await argo.on('ui.render', () => jsx(Text, { children: 'Retained tree' }));
        }`,
    },
  ]);
  const { url } = await startEngineTestHost({ home });

  const app = renderApp(url, toolCallSlotFixture, currentPluginSurface('web'));

  await expect
    .poll(() => app.messages[0], { timeout: 15_000 })
    .toMatchObject({
      type: 'replacement',
      message: { root: { props: { children: 'Retained tree' } } },
    });
  const log = await readFile(join(home, 'logs/plugins.log'), 'utf8');

  expect(
    log.split('\n').filter((line) => line.includes('10000 ms budget')),
  ).toEqual([
    expect.stringContaining(
      'Plugin a-delay: core fallback argo/feed/tool-call/v1: ui.render Hook: missed its 10000 ms budget',
    ),
  ]);
}, 20_000);
