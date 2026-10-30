import type {
  PluginDispatchInput,
  ViewMessage,
} from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { connectPluginApp, pluginTap } from '#mocks/plugin-app';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

const page = { pluginId: 'settling', path: '/' };

const more = (view: ViewMessage | undefined): PluginDispatchInput =>
  pluginTap(view, { ...page, key: '0/more' });

const drawn = (messages: ViewMessage[]): string => JSON.stringify(messages);

it(
  'runs a load the List asked for from the tree it holds while the page settles on its own',
  { timeout: 20_000 },
  async () => {
    const home = await createRuntimePlugins([
      { id: page.pluginId, fixture: 'settling' },
    ]);

    const { url } = await startEngineTestHost({ home });
    const app = connectPluginApp(url, page);
    await expect.poll(() => app.messages.length, { timeout: 10_000 }).toBe(1);
    const held = app.messages[0];

    // The page moves on by itself, as a fetched page replacing a cached one does.
    await expect.poll(() => app.messages.length, { timeout: 10_000 }).toBe(2);

    // The List asked for the next page from the tree it was given; that tree still draws More.
    await expect(
      app.client.plugins.dispatch.mutate(more(held)),
    ).resolves.toEqual({ ok: true });
    await expect
      .poll(() => drawn(app.messages), { timeout: 10_000 })
      .toContain('fetched 60');
  },
);
