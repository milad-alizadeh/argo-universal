import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

const examples = fileURLToPath(
  new URL('../../../../plugins/examples', import.meta.url),
);

const page = { pluginId: 'hello', path: '/lists' };

it('expands Hello List items into keyed rows and dispatches selection to the matching row', async () => {
  const home = await createRuntimePlugins([]);

  const { createCaller } = await startEngineTestHost({
    home,
    version: '0.0.0',
    firstPartyPluginsDirectory: examples,
  });

  const controller = new AbortController();
  const app = createCaller({ signal: controller.signal });
  const messages = (await app.plugins.view(page))[Symbol.asyncIterator]();

  try {
    const snapshot = (await messages.next()).value;
    expect(snapshot).toMatchObject({
      type: 'snapshot',
      root: {
        type: 'List',
        key: '0',
        children: [
          {
            type: 'ListItem',
            key: 'web',
            props: {
              title: 'Deploy web',
              selected: false,
              progress: { value: 0.4 },
            },
            slots: { meta: [{ type: 'Label', props: { text: '2/5 jobs' } }] },
          },
          {
            type: 'ListItem',
            key: 'native',
            props: { title: 'Build native', selected: false },
          },
        ],
      },
    });
    await app.plugins.dispatch({
      ...page,
      revision: 1,
      viewId: snapshot.viewId,
      key: '0/web',
      event: 'onPress',
    });
    expect((await messages.next()).value).toMatchObject({
      type: 'patch',
      ops: [{ op: 'setProps', key: ['web'], props: { selected: true } }],
    });
  } finally {
    controller.abort();
  }
}, 20_000);
