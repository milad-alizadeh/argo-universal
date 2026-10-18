import { currentPartVersions } from '@repo/contracts/plugins/kit';
import {
  ViewMessage,
  type PluginDispatchInput,
} from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { connectPluginApp } from '#mocks/plugin-app';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

it(
  'sanitizes embedded content and keeps its callback identity after a sibling is removed',
  { timeout: 20_000 },
  async () => {
    const page = { pluginId: 'overlays', path: '/' };

    const home = await createRuntimePlugins([
      { id: page.pluginId, fixture: 'overlay-actions' },
    ]);

    const { url } = await startEngineTestHost({ home });
    const app = connectPluginApp(url, page, currentPartVersions);
    await expect.poll(() => app.messages.length, { timeout: 10_000 }).toBe(1);
    const view = ViewMessage.options[0].parse(app.messages[0]);

    if (!view.viewId) throw new Error('Expected view identity');
    expect(JSON.stringify(view.root)).not.toContain('<script>');

    const base = {
      ...page,
      viewId: view.viewId,
      key: '0/open',
      event: 'onAction' as const,
    };

    const edit = {
      ...base,
      revision: view.revision,
      payload: {
        path: ['onPress', 'content', 'children', '1', 'props', 'onChangeText'],
        value: 'Atlas',
      },
    } satisfies PluginDispatchInput;

    await expect(
      app.client.plugins.dispatch.mutate({
        ...edit,
        payload: { ...edit.payload, value: false },
      }),
    ).rejects.toThrow('Invalid input');
    await app.client.plugins.dispatch.mutate(edit);
    await expect
      .poll(() => app.messages.at(-1), { timeout: 10_000 })
      .toMatchObject({ revision: 2, ops: [{ props: { children: 'Atlas' } }] });
    const latest = ViewMessage.parse(app.messages.at(-1));
    await app.client.plugins.dispatch.mutate({
      ...base,
      revision: latest.revision,
      payload: { path: ['onPress', 'onConfirm'] },
    });
    await expect
      .poll(() => app.messages.at(-1), { timeout: 10_000 })
      .toMatchObject({
        revision: 3,
        ops: [{ props: { children: 'Confirmed' } }],
      });
  },
);
