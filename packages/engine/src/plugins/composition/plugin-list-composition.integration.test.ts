import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { drawnRoot, pageAt } from '#mocks/plugin-pages';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

it('expands fixture List items into keyed rows, each pressing to its own selection', async () => {
  const home = await createRuntimePlugins([
    { id: 'list', fixture: 'list-selection', main: 'index.js' },
  ]);

  const { caller } = await startEngineTestHost({ home });

  await expect(
    drawnRoot(caller, pageAt('list', '/lists')),
  ).resolves.toMatchObject({
    type: 'List',
    children: [
      {
        type: 'ListItem',
        key: 'web',
        props: {
          title: 'Deploy web',
          selected: false,
          progress: { value: 0.4 },
          onPress: { pageState: { selected: 'web' } },
        },
        slots: {
          meta: [
            { type: 'Pill', props: { text: 'Healthy', tone: 'success' } },
            { type: 'Label', props: { text: '2/5 jobs' } },
          ],
        },
      },
      {
        type: 'ListItem',
        key: 'native',
        props: { title: 'Build native', selected: false },
      },
    ],
  });
  await expect(
    drawnRoot(caller, pageAt('list', '/lists', { selected: 'web' })),
  ).resolves.toMatchObject({
    children: [{ props: { selected: true } }, { props: { selected: false } }],
  });
}, 20_000);
