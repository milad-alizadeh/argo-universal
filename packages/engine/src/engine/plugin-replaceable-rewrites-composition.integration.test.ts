import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { currentPartVersions } from '@repo/contracts/plugins/kit';
import {
  messageSlotFixture,
  rewrittenMessage,
  traySlotFixture,
} from '@repo/contracts/plugins/replaceable-fixtures';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { writeHookPlugins } from '#mocks/hook-plugins';
import { renderApp } from '#mocks/replaceable-app';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

it.each([
  {
    name: 'message',
    input: messageSlotFixture,
    rewrite: rewrittenMessage(),
    expected: rewrittenMessage(),
  },
  {
    name: 'new Shell action',
    input: traySlotFixture,
    rewrite: {
      ...traySlotFixture,
      props: {
        ...traySlotFixture.props,
        status: { shells: { count: 1, running: true } },
      },
    },
    expected: traySlotFixture,
  },
  {
    name: 'new Subagent action',
    input: traySlotFixture,
    rewrite: {
      ...traySlotFixture,
      props: {
        ...traySlotFixture.props,
        status: { subagents: { count: 1, running: true } },
      },
    },
    expected: traySlotFixture,
  },
])(
  'validates the $name rewrite before drawing core',
  async ({ input, rewrite, expected }) => {
    const home = await createRuntimePlugins([]);
    await writeHookPlugins(home, [
      {
        id: 'rewrite',
        hooks: ['ui.render'],
        slots: [input.slotId],
        source: `export async function register(argo) {
      await argo.on('ui.render', (ctx, e, next) => next(${JSON.stringify(rewrite)}));
    }`,
      },
    ]);
    const { url } = await startEngineTestHost({ home });

    const app = renderApp(url, input, {
      platform: 'web',
      parts: currentPartVersions,
    });

    await expect
      .poll(() => app.messages[0], { timeout: 10_000 })
      .toEqual({ type: 'core', input: expected });
  },
  20_000,
);

it('retains a replacement while an outer Hook waits on a slow argo call', async () => {
  const home = await createRuntimePlugins([]);
  await writeHookPlugins(home, [
    {
      id: 'a-delay',
      hooks: ['ui.render'],
      slots: [traySlotFixture.slotId],
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
      slots: [traySlotFixture.slotId],
      source: `import { Text } from '@argo/plugin-kit';
        import { jsx } from '@argo/plugin-kit/jsx-runtime';
        export async function register(argo) {
          await argo.on('ui.render', () => jsx(Text, { children: 'Retained tree' }));
        }`,
    },
  ]);
  const { url } = await startEngineTestHost({ home });

  const app = renderApp(url, traySlotFixture, {
    platform: 'web',
    parts: currentPartVersions,
  });

  await expect
    .poll(() => app.messages[0], { timeout: 50_000 })
    .toMatchObject({
      type: 'replacement',
      message: { root: { props: { children: 'Retained tree' } } },
    });
  expect(await readFile(join(home, 'logs/plugins.log'), 'utf8')).not.toContain(
    'core fallback',
  );
}, 60_000);
