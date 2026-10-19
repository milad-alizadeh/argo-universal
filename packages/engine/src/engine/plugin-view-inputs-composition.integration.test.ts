import type {
  PartEvent,
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
  interaction: PartEvent,
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

const heard = (search: string, selection: string[], added: number): string =>
  JSON.stringify({ search, selection, added });

it(
  'keeps opted-in search, selection and primary Action events on the Connection that sent them',
  { timeout: 20_000 },
  async () => {
    const home = await createRuntimePlugins([
      { id: page.pluginId, fixture: 'view-inputs' },
    ]);

    const { url } = await startEngineTestHost({ home });
    const first = connectPluginApp(url, page);
    await expect.poll(() => first.messages.length, { timeout: 10_000 }).toBe(1);
    await first.client.plugins.dispatch.mutate(
      event(first.messages[0], 'page', {
        event: 'onChangeText',
        payload: 'Argo',
      }),
    );
    await expect.poll(() => first.messages.length, { timeout: 10_000 }).toBe(2);
    await first.client.plugins.dispatch.mutate(
      event(first.messages[1], 'page/list', {
        event: 'onSelectionChange',
        payload: ['984'],
      }),
    );
    await expect.poll(() => first.messages.length, { timeout: 10_000 }).toBe(3);
    await first.client.plugins.dispatch.mutate(
      event(first.messages[2], 'page#primaryAction/add', { event: 'onPress' }),
    );
    await expect
      .poll(() => first.messages.at(-1), { timeout: 10_000 })
      .toMatchObject({
        revision: 4,
        ops: [{ props: { children: heard('Argo', ['984'], 1) } }],
      });
    const second = connectPluginApp(url, page);
    await expect
      .poll(() => second.messages[0], { timeout: 10_000 })
      .toMatchObject({
        revision: 5,
        root: {
          type: 'Page',
          props: { title: 'Inputs', value: '' },
          slots: { primaryAction: [{ type: 'Action', key: 'add' }] },
          children: [
            { type: 'List.Section', key: 'list' },
            { props: { children: heard('', [], 0) } },
          ],
        },
      });
    await second.client.plugins.dispatch.mutate(
      event(second.messages[0], 'page/list', {
        event: 'onSelectionChange',
        payload: ['982'],
      }),
    );
    await expect
      .poll(() => second.messages.length, { timeout: 10_000 })
      .toBe(2);
    expect(first.messages).toHaveLength(4);
  },
);
