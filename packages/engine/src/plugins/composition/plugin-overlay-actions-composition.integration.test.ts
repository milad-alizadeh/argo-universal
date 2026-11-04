import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { drawnRoot, pageAt } from '#mocks/plugin-pages';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

it('draws an overlay open from Page state, with its Component events naming the next state', async () => {
  const home = await createRuntimePlugins([
    { id: 'overlays', fixture: 'overlay-actions' },
  ]);

  const { caller } = await startEngineTestHost({ home });

  await expect(
    drawnRoot(caller, pageAt('overlays', '/')),
  ).resolves.toMatchObject({
    children: [
      { props: { children: 'Waiting' } },
      { key: 'open', props: { onPress: { pageState: { open: true } } } },
      { type: 'Sheet', key: 'sheet', props: { open: false } },
    ],
  });
  await expect(
    drawnRoot(caller, pageAt('overlays', '/', { open: true })),
  ).resolves.toMatchObject({
    children: [
      {},
      {},
      {
        type: 'Sheet',
        props: {
          open: true,
          onOpenChange: { pageState: { open: { $payload: true } } },
        },
        children: [
          {
            key: 'fields',
            children: [
              {
                children: [
                  {
                    key: 'field',
                    props: {
                      onChangeText: {
                        pageState: { answer: { $payload: true } },
                      },
                    },
                  },
                ],
              },
            ],
          },
          {
            key: 'apply',
            props: {
              onPress: { pageState: { answer: 'Confirmed', open: false } },
            },
          },
        ],
      },
    ],
  });
}, 20_000);
