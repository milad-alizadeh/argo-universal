import { ViewMessage } from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { connectPluginApp } from '#mocks/plugin-app';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

it(
  'dispatches the addressed secondary Action, rejects invalid paths and returns handler failures',
  { timeout: 20_000 },
  async () => {
    const page = { pluginId: 'controls', path: '/' };

    const home = await createRuntimePlugins([
      { id: page.pluginId, fixture: 'control-actions' },
    ]);

    const { url } = await startEngineTestHost({ home });
    const app = connectPluginApp(url, page);
    await expect.poll(() => app.messages.length, { timeout: 10_000 }).toBe(1);
    const view = ViewMessage.options[0].parse(app.messages[0]);

    if (!view.viewId) throw new Error('Expected view identity');

    const target = {
      ...page,
      viewId: view.viewId,
      revision: view.revision,
      key: '0/run',
      event: 'onAction' as const,
    };

    await expect(
      app.client.plugins.dispatch.mutate({
        ...target,
        payload: { path: ['actions', '7', 'onPress'] },
      }),
    ).rejects.toThrow('Plugin handler is no longer available');
    await expect(
      app.client.plugins.dispatch.mutate({
        ...target,
        payload: { path: ['actions', '2', 'onPress'] },
      }),
    ).rejects.toThrow('Secondary refused');
    await app.client.plugins.dispatch.mutate({
      ...target,
      payload: { path: ['actions', '1', 'onPress'] },
    });
    await expect
      .poll(() => app.messages.at(-1), { timeout: 10_000 })
      .toMatchObject({ revision: 2, ops: [{ props: { label: 'Second' } }] });
    await expect(
      app.client.plugins.dispatch.mutate({
        ...target,
        payload: { path: ['actions', '0', 'onPress'] },
      }),
    ).rejects.toThrow('Plugin view changed');
  },
);

it(
  'rejects a payload of the wrong control type before it reaches the Plugin',
  { timeout: 20_000 },
  async () => {
    const page = { pluginId: 'controls', path: '/' };

    const home = await createRuntimePlugins([
      { id: page.pluginId, fixture: 'control-actions' },
    ]);

    const { url } = await startEngineTestHost({ home });
    const app = connectPluginApp(url, page);
    await expect.poll(() => app.messages.length, { timeout: 10_000 }).toBe(1);
    const view = ViewMessage.options[0].parse(app.messages[0]);

    if (!view.viewId) throw new Error('Expected view identity');

    const target = {
      ...page,
      viewId: view.viewId,
      revision: view.revision,
      key: '0/switch',
      event: 'onValueChange' as const,
    };

    await expect(
      app.client.plugins.dispatch.mutate({ ...target, payload: 'enabled' }),
    ).rejects.toThrow('Invalid Plugin event payload');
    await app.client.plugins.dispatch.mutate({ ...target, payload: true });
    await expect
      .poll(() => app.messages.at(-1), { timeout: 10_000 })
      .toMatchObject({ revision: 2, ops: [{ props: { label: 'Enabled' } }] });
  },
);
