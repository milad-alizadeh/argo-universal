import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { currentPluginSurface } from '@repo/contracts/plugins/kit';
import {
  toolCallSlotId,
  type RenderFailureInput,
} from '@repo/contracts/plugins/replaceable';
import { toolCallSlotFixture } from '@repo/contracts/plugins/replaceable-fixtures';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { writeHookPlugins } from '#mocks/hook-plugins';
import { renderApp } from '#mocks/replaceable-app';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

const source = `
  import { Button } from '@argo/plugin-kit';
  import { jsx } from '@argo/plugin-kit/jsx-runtime';
  export async function register(argo) {
    await argo.on('ui.render', () => jsx(Button, { label: 'Count' }));
  }
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

it('answers with core once the replacing Plugin is turned off', async () => {
  const { url } = await startEngineTestHost({ home: await counterHome() });
  const surface = currentPluginSurface('desktop');
  const app = await renderApp(url, toolCallSlotFixture, surface);

  expect(app.answer).toMatchObject({
    type: 'replacement',
    pluginId: 'counter',
    root: { type: 'Button', props: { label: 'Count' } },
  });
  await app.client.plugin.setEnabled.mutate({
    pluginId: 'counter',
    enabled: false,
  });
  await expect(
    app.client.plugins.render.query(toolCallSlotFixture),
  ).resolves.toEqual({
    type: 'core',
    input: toolCallSlotFixture,
  });
}, 20_000);

it('logs an App drawing failure once', async () => {
  const home = await counterHome();
  const { url } = await startEngineTestHost({ home });

  const app = await renderApp(
    url,
    toolCallSlotFixture,
    currentPluginSurface('web'),
  );

  const report = {
    pluginId: 'counter',
    slotId: toolCallSlotId,
    reason: 'App drawing failed',
  } satisfies RenderFailureInput;

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
