import type {
  PluginDispatchInput,
  ViewMessage,
} from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { connectPluginApp, pluginTap } from '#mocks/plugin-app';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

const page = { pluginId: 'settling', path: '/' };

const press = (
  view: ViewMessage | undefined,
  key: string,
): PluginDispatchInput => pluginTap(view, { ...page, key });

// The page the App holds when its first rows draw, then the same page once it has settled by itself.
async function settlingPage(): Promise<{
  app: ReturnType<typeof connectPluginApp>;
  held: ViewMessage | undefined;
}> {
  const home = await createRuntimePlugins([
    { id: page.pluginId, fixture: 'settling' },
  ]);

  const { url } = await startEngineTestHost({ home });
  const app = connectPluginApp(url, page);
  await expect.poll(() => app.messages.length, { timeout: 10_000 }).toBe(1);
  const held = app.messages[0];

  await expect.poll(() => app.messages.length, { timeout: 10_000 }).toBe(2);

  return { app, held };
}

it(
  'runs a load the List asked for from the tree it holds while the page settles on its own',
  { timeout: 20_000 },
  async () => {
    const { app, held } = await settlingPage();

    // The List asked for the next page from the tree it was given; that tree still draws More.
    await expect(
      app.client.plugins.dispatch.mutate(press(held, '0/more')),
    ).resolves.toEqual({ ok: true });
    await expect
      .poll(() => JSON.stringify(app.messages), { timeout: 10_000 })
      .toContain('fetched 60');
  },
);

it(
  'refuses a press from the tree the App holds when settling took that node out',
  { timeout: 20_000 },
  async () => {
    const { app, held } = await settlingPage();

    await expect(
      app.client.plugins.dispatch.mutate(press(held, '0/retry')),
    ).rejects.toThrow('Plugin handler is no longer available');
  },
);
