import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { currentPluginSurface } from '@repo/contracts/plugins/kit';
import type { ReplaceableMessage } from '@repo/contracts/plugins/replaceable';
import { toolCallSlotId } from '@repo/contracts/plugins/replaceable';
import { toolCallSlotFixture } from '@repo/contracts/plugins/replaceable-fixtures';
import { PluginViewId } from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { writeHookPlugins } from '#mocks/hook-plugins';
import { renderApp } from '#mocks/replaceable-app';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

const source = `
  import { Button, useState } from '@argo/plugin-kit';
  import { jsx } from '@argo/plugin-kit/jsx-runtime';
  function Counter() {
    const [count, setCount] = useState(0);
    return jsx(Button, { label: 'Count ' + count, onPress: () => setCount(count + 1) });
  }
  export async function register(argo) { await argo.on('ui.render', () => jsx(Counter, {})); }
`;

async function counterHome(): Promise<string> {
  const home = await createRuntimePlugins([]);
  await writeHookPlugins(home, [
    {
      id: 'counter',
      hooks: ['ui.render'],
      renders: [toolCallSlotId],
      source,
    },
  ]);

  return home;
}

it('retains a replacement handler and restores core when its Plugin is turned off', async () => {
  const { url } = await startEngineTestHost({ home: await counterHome() });

  const app = renderApp(
    url,
    toolCallSlotFixture,
    currentPluginSurface('desktop'),
  );

  await expect
    .poll(() => app.messages[0], { timeout: 10_000 })
    .toMatchObject({ type: 'replacement' });
  const first = requiredReplacement(app.messages[0]);
  const viewId = PluginViewId.parse(first.message.viewId);

  const target = {
    pluginId: first.pluginId,
    path: first.path,
    viewId,
    revision: first.message.revision,
    key: '0',
    event: 'onPress' as const,
  };

  await app.client.plugins.dispatch.mutate(target);
  await expect
    .poll(() => app.messages[1], { timeout: 10_000 })
    .toMatchObject({
      type: 'replacement',
      message: { root: { type: 'Button', props: { label: 'Count 1' } } },
    });
  await app.client.plugin.setEnabled.mutate({
    pluginId: 'counter',
    enabled: false,
  });
  await expect
    .poll(() => app.messages.at(-1), { timeout: 10_000 })
    .toEqual({ type: 'core', input: toolCallSlotFixture });
  await expect(app.client.plugins.dispatch.mutate(target)).rejects.toThrow(
    'Plugin view changed',
  );
}, 20_000);

it('accepts drawing failure reports only from the Connection that owns the replacement and logs once', async () => {
  const home = await counterHome();
  const { url } = await startEngineTestHost({ home });
  const surface = currentPluginSurface('web');
  const app = renderApp(url, toolCallSlotFixture, surface);
  const stranger = renderApp(url, toolCallSlotFixture, surface);
  await expect
    .poll(() => app.messages[0], { timeout: 10_000 })
    .toMatchObject({ type: 'replacement' });
  const first = requiredReplacement(app.messages[0]);
  const viewId = PluginViewId.parse(first.message.viewId);

  const report = {
    pluginId: first.pluginId,
    path: first.path,
    viewId,
    revision: first.message.revision,
    reason: 'App drawing failed',
  };

  await stranger.client.plugins.renderFailed.mutate(report);
  expect(await readFile(join(home, 'logs/plugins.log'), 'utf8')).not.toContain(
    'core fallback',
  );
  await app.client.plugins.renderFailed.mutate(report);
  await app.client.plugins.renderFailed.mutate(report);
  const log = await readFile(join(home, 'logs/plugins.log'), 'utf8');

  expect(
    log.split('\n').filter((line) => line.includes('core fallback')),
  ).toHaveLength(1);
  expect(log).toContain(
    'Plugin counter: core fallback argo/feed/tool-call/v1: App drawing failed',
  );
}, 20_000);

function requiredReplacement(
  message: ReplaceableMessage | undefined,
): Extract<ReplaceableMessage, { type: 'replacement' }> {
  if (message?.type !== 'replacement') throw new Error('Expected replacement');

  return message;
}
