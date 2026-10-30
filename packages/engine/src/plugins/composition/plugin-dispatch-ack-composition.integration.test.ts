import {
  type PluginDispatchInput,
  type ViewMessage,
} from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { connectPluginApp } from '#mocks/plugin-app';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

const page = { pluginId: 'paged', path: '/' };

function more(view: ViewMessage | undefined): PluginDispatchInput {
  if (!view?.viewId) throw new Error('Expected a view identity');

  return {
    ...page,
    revision: view.revision,
    viewId: view.viewId,
    key: '0/more',
    event: 'onPress',
  };
}

it(
  'acknowledges a handler only after the view it changed has reached the App',
  { timeout: 20_000 },
  async () => {
    const home = await createRuntimePlugins([
      { id: page.pluginId, fixture: 'paged' },
    ]);

    const { url } = await startEngineTestHost({ home });
    const app = connectPluginApp(url, page);
    await expect.poll(() => app.messages.length, { timeout: 10_000 }).toBe(1);
    await app.client.plugins.dispatch.mutate(more(app.messages[0]));

    // A List asks again the moment its load is acknowledged, from the tree it holds then.
    expect(app.messages).toHaveLength(2);
    await app.client.plugins.dispatch.mutate(more(app.messages.at(-1)));
  },
);
