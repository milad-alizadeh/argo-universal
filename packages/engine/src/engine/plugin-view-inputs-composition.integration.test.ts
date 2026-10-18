import type {
  PluginInteraction,
  PluginDispatchInput,
  ViewMessage,
} from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { connectPluginApp } from '#mocks/plugin-app';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

const page = { pluginId: 'inputs', path: '/' };

function event(
  view: ViewMessage | undefined,
  key: string,
  interaction: PluginInteraction,
): PluginDispatchInput {
  if (!view?.viewId) throw new Error('Expected a view identity');

  return {
    ...page,
    revision: view.revision,
    viewId: view.viewId,
    key,
    ...interaction,
  };
}

it(
  'keeps opted-in search and selection events on the Connection that sent them',
  { timeout: 20_000 },
  async () => {
    const home = await createRuntimePlugins([
      { id: page.pluginId, fixture: 'view-inputs' },
    ]);

    const { url } = await startEngineTestHost({ home });
    const first = connectPluginApp(url, page);
    await expect.poll(() => first.messages.length, { timeout: 10_000 }).toBe(1);
    await first.client.plugins.dispatch.mutate(
      event(first.messages[0], '0/page', {
        event: 'onSearchTextChange',
        payload: 'Argo',
      }),
    );
    await expect.poll(() => first.messages.length, { timeout: 10_000 }).toBe(2);
    await first.client.plugins.dispatch.mutate(
      event(first.messages[1], '0/list', {
        event: 'onSelectionChange',
        payload: ['984'],
      }),
    );
    await expect
      .poll(() => first.messages.at(-1), { timeout: 10_000 })
      .toMatchObject({
        revision: 3,
        ops: [{ props: { label: '{"search":"Argo","selection":["984"]}' } }],
      });
    const second = connectPluginApp(url, page);
    await expect
      .poll(() => second.messages[0], { timeout: 10_000 })
      .toMatchObject({
        revision: 4,
        root: {
          children: [
            {},
            {},
            { props: { label: '{"search":"","selection":[]}' } },
          ],
        },
      });
    await second.client.plugins.dispatch.mutate(
      event(second.messages[0], '0/list', {
        event: 'onSelectionChange',
        payload: ['982'],
      }),
    );
    await expect
      .poll(() => second.messages.length, { timeout: 10_000 })
      .toBe(2);
    expect(first.messages).toHaveLength(3);
  },
);
