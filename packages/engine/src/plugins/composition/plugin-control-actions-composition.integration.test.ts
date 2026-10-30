import { ViewMessage } from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { connectPluginApp } from '#mocks/plugin-app';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

it(
  'dispatches a keyed Action child of SplitButton, rejects unknown keys and returns handler failures',
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
      event: 'onPress' as const,
    };

    await expect(
      app.client.plugins.dispatch.mutate({ ...target, key: '0/run/missing' }),
    ).rejects.toThrow('Plugin handler is no longer available');
    await expect(
      app.client.plugins.dispatch.mutate({ ...target, key: '0/run/refuse' }),
    ).rejects.toThrow('Secondary refused');
    await app.client.plugins.dispatch.mutate({
      ...target,
      key: '0/run/second',
    });
    await expect
      .poll(() => app.messages.at(-1), { timeout: 10_000 })
      .toMatchObject({ revision: 2, ops: [{ props: { children: 'Second' } }] });
    // ADR-0031: the Action is still drawn, so a press from the tree the App holds runs it.
    await expect(
      app.client.plugins.dispatch.mutate({ ...target, key: '0/run/first' }),
    ).resolves.toEqual({ ok: true });
    await expect
      .poll(() => app.messages.at(-1), { timeout: 10_000 })
      .toMatchObject({ revision: 3, ops: [{ props: { children: 'First' } }] });
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
      key: '0/slider',
      event: 'onValueChange' as const,
    };

    await expect(
      app.client.plugins.dispatch.mutate({ ...target, payload: 'high' }),
    ).rejects.toThrow('Invalid Plugin event payload');
    await app.client.plugins.dispatch.mutate({ ...target, payload: 5 });
    await expect
      .poll(() => app.messages.at(-1), { timeout: 10_000 })
      .toMatchObject({
        revision: 2,
        ops: [{ props: { children: 'Level 5' } }],
      });
  },
);
