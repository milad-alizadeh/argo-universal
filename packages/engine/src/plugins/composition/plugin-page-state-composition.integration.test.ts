import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { drawnRoot, pageAt } from '#mocks/plugin-pages';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

const heard = (search: string, selection: string[], added: number): string =>
  JSON.stringify({ search, selection, added });

it('binds search and selection into Page state, and draws each App the address it asks for', async () => {
  const home = await createRuntimePlugins([
    { id: 'inputs', fixture: 'view-inputs' },
  ]);

  const { createCaller } = await startEngineTestHost({ home });

  const [first, second] = [0, 1].map(() =>
    createCaller({ signal: new AbortController().signal }),
  );

  if (!first || !second) throw new Error('Expected two Connections');

  const searched = pageAt('inputs', '/', {
    search: 'Argo',
    selection: ['984'],
    added: 1,
  });

  await expect(drawnRoot(first, searched)).resolves.toMatchObject({
    type: 'Screen',
    props: {
      title: 'Inputs',
      value: 'Argo',
      onChangeText: { bind: 'search' },
    },
    slots: {
      primaryAction: [
        {
          type: 'Action',
          key: 'add',
          props: { onPress: { pageState: { added: 2 } } },
        },
      ],
    },
    children: [
      {
        type: 'List.Section',
        key: 'list',
        props: { onSelectionChange: { bind: 'selection' } },
      },
      { props: { children: heard('Argo', ['984'], 1) } },
    ],
  });
  await expect(drawnRoot(second, pageAt('inputs', '/'))).resolves.toMatchObject(
    {
      props: { value: '' },
      children: [{ key: 'list' }, { props: { children: heard('', [], 0) } }],
    },
  );
}, 20_000);
