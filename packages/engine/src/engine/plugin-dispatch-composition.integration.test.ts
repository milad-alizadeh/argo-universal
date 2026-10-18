import {
  type PluginDispatchInput,
  ViewMessage,
} from '@repo/contracts/plugins/wire';
import { applyPatch } from '@repo/contracts/plugins/wire-patch';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { connectPluginApp } from '#mocks/plugin-app';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

const page = { pluginId: 'dispatch', path: '/' };

function tap(view: ViewMessage | undefined, key: string): PluginDispatchInput {
  if (!view?.viewId) throw new Error('Expected a view identity');

  return {
    ...page,
    revision: view.revision,
    viewId: view.viewId,
    key,
    event: 'onPress',
  };
}

it(
  'refuses a tap captured before a reorder and keeps the keyed row handler after it',
  { timeout: 20_000 },
  async () => {
    const home = await createRuntimePlugins([
      { id: page.pluginId, fixture: 'dispatch' },
    ]);

    const { url } = await startEngineTestHost({ home });
    const app = connectPluginApp(url, page);
    await expect.poll(() => app.messages.length, { timeout: 10_000 }).toBe(1);
    await app.client.plugins.dispatch.mutate(tap(app.messages[0], '0/reverse'));
    await expect.poll(() => app.messages.length, { timeout: 10_000 }).toBe(2);
    const initial = ViewMessage.options[0].parse(app.messages[0]);
    const reordered = ViewMessage.options[1].parse(app.messages[1]);
    expect(
      applyPatch(initial.root, reordered.ops).children.map((node) => node.key),
    ).toEqual(['0', 'reverse', 'beta', 'alpha', 'fail', 'waiting']);

    await expect(
      app.client.plugins.dispatch.mutate(tap(app.messages[0], '0/alpha')),
    ).rejects.toThrow('Plugin view changed');
    await app.client.plugins.dispatch.mutate(tap(app.messages[1], '0/alpha'));
    await expect
      .poll(() => app.messages.at(-1), { timeout: 10_000 })
      .toMatchObject({ revision: 3, ops: [{ props: { label: 'alpha' } }] });
  },
);

it(
  'returns a handler error to the App without crashing the Plugin',
  { timeout: 20_000 },
  async () => {
    const home = await createRuntimePlugins([
      { id: page.pluginId, fixture: 'dispatch' },
    ]);

    const { url, caller } = await startEngineTestHost({ home });
    const app = connectPluginApp(url, page);
    await expect.poll(() => app.messages.length, { timeout: 10_000 }).toBe(1);
    await expect(
      app.client.plugins.dispatch.mutate(tap(app.messages[0], '0/fail')),
    ).rejects.toThrow('Handler refused');
    expect((await caller.plugins.list()).plugins[0]).toMatchObject({
      state: 'running',
      error: null,
    });
    await expect(
      app.client.plugins.dispatch.mutate(tap(app.messages[0], '0/alpha')),
    ).resolves.toEqual({ ok: true });
  },
);

it(
  'refuses dispatch from another Connection even when it knows the key and revision',
  { timeout: 20_000 },
  async () => {
    const home = await createRuntimePlugins([
      { id: page.pluginId, fixture: 'dispatch' },
    ]);

    const { url } = await startEngineTestHost({ home });
    const first = connectPluginApp(url, page);
    const second = connectPluginApp(url, page);
    await expect
      .poll(() => first.messages.length + second.messages.length, {
        timeout: 10_000,
      })
      .toBe(2);
    const current = tap(second.messages[0], '0/alpha');
    await expect(
      second.client.plugins.dispatch.mutate({
        ...tap(first.messages[0], '0/alpha'),
        revision: current.revision,
      }),
    ).rejects.toThrow('Plugin view changed');
  },
);

it(
  'keeps dispatch pending until the asynchronous handler settles',
  { timeout: 20_000 },
  async () => {
    const home = await createRuntimePlugins([
      { id: page.pluginId, fixture: 'dispatch' },
    ]);

    const { url } = await startEngineTestHost({ home });
    const app = connectPluginApp(url, page);
    await expect.poll(() => app.messages.length, { timeout: 10_000 }).toBe(1);
    let settled = false;

    const pending = app.client.plugins.dispatch
      .mutate(tap(app.messages[0], '0/waiting/wait'))
      .then(() => {
        settled = true;
      });

    await expect.poll(() => app.messages.length, { timeout: 10_000 }).toBe(2);
    expect(settled).toBe(false);
    await app.client.plugins.dispatch.mutate(
      tap(app.messages[1], '0/waiting/finish'),
    );
    await pending;
    expect(settled).toBe(true);
  },
);

it(
  'rejects pending dispatch when its Plugin is disabled',
  { timeout: 20_000 },
  async () => {
    const home = await createRuntimePlugins([
      { id: page.pluginId, fixture: 'dispatch' },
    ]);

    const { url, caller } = await startEngineTestHost({ home });
    const app = connectPluginApp(url, page);
    await expect.poll(() => app.messages.length, { timeout: 10_000 }).toBe(1);

    const pending = app.client.plugins.dispatch
      .mutate(tap(app.messages[0], '0/waiting/wait'))
      .catch((error: Error) => error);

    await expect.poll(() => app.messages.length, { timeout: 10_000 }).toBe(2);
    await caller.plugins.setEnabled({
      pluginId: page.pluginId,
      enabled: false,
    });
    expect(await pending).toBeInstanceOf(Error);
    expect(await pending).toMatchObject({
      message: 'Plugin view closed or restarted',
    });
  },
);
