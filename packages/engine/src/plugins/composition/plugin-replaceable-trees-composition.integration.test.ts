import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { currentPluginSurface } from '@repo/contracts/plugins/kit';
import { toolCallSlotId } from '@repo/contracts/plugins/replaceable';
import {
  toolCallSlotFixture,
  renderThrowReason,
  replacementTreeFixture,
  refusedTreeFixture,
} from '@repo/contracts/plugins/replaceable-fixtures';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { writeHookPlugins } from '#mocks/hook-plugins';
import { renderApp } from '#mocks/replaceable-app';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

const current = currentPluginSurface('web');

it.each([
  {
    scenario: 'replace',
    surface: current,
    body: `return jsx(Text, { children: 'Plugin replacement' })`,
    expected: {
      type: 'replacement',
      pluginId: 'tree',
      message: { type: 'snapshot', root: replacementTreeFixture },
    },
    fallbacks: 0,
  },
  {
    scenario: 'refuse',
    surface: current,
    body: `return jsx(Stack, { direction: 'column', children: [jsx(Text, ${JSON.stringify(refusedTreeFixture.children[0]?.props)}), jsx('FuturePart', {})] })`,
    expected: { type: 'core', input: toolCallSlotFixture },
    fallbacks: 1,
  },
  {
    scenario: 'missing tree',
    surface: current,
    body: '',
    expected: { type: 'core', input: toolCallSlotFixture },
    fallbacks: 1,
  },
  {
    scenario: 'throw',
    surface: current,
    body: `throw new Error('${renderThrowReason}')`,
    expected: { type: 'core', input: toolCallSlotFixture },
    fallbacks: 1,
  },
  {
    scenario: 'nested handler',
    surface: current,
    body: `return jsx(Text, { children: 'Go', data: { onPress: () => {} } })`,
    expected: { type: 'core', input: toolCallSlotFixture },
    fallbacks: 1,
  },
  {
    scenario: 'App below the wire minimum',
    surface: { platform: 'web' } as const,
    body: `return jsx(Text, { children: 'Plugin replacement' })`,
    expected: { type: 'core', input: toolCallSlotFixture },
    fallbacks: 1,
  },
])(
  'handles a $scenario tree at one Replaceable Slot',
  async ({ scenario, surface, body, expected, fallbacks }) => {
    const home = await createRuntimePlugins([]);

    await writeHookPlugins(home, [
      {
        id: 'tree',
        hooks: ['ui.render'],
        slots: [toolCallSlotId],
        source: `
    import { Text, Stack } from '@argo/plugin-kit';
    import { jsx } from '@argo/plugin-kit/jsx-runtime';
    function Replacement() { ${body} }
    export async function register(argo) { await argo.on('ui.render', () => ${renderAnswer(scenario)}); }
  `,
      },
    ]);
    const { url, caller } = await startEngineTestHost({ home });

    for (let count = 0; count < 2; count++) {
      const app = renderApp(url, toolCallSlotFixture, surface);
      await expect.poll(() => app.messages.length, { timeout: 10_000 }).toBe(1);
      const result = app.messages[0];

      expect(result).toMatchObject(expected);
      app.stop();
    }

    const log = await readFile(join(home, 'logs/plugins.log'), 'utf8');
    expect(
      log.split('\n').filter((line) => line.includes('core fallback')),
    ).toHaveLength(fallbacks);
    expect((await caller.plugins.list()).plugins[0]?.state).toBe('running');
  },
  20_000,
);

const renderAnswer = (scenario: string): string =>
  scenario === 'missing tree'
    ? `({ treePath: 'render:missing' })`
    : 'jsx(Replacement, {})';
