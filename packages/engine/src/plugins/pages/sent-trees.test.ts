import { expect, it } from 'vitest';
import { SentTrees } from './sent-trees';

const tree = { key: 'root', type: 'Text', props: {}, children: [], slots: {} };

const trees = (): SentTrees => new SentTrees({ generation: () => 1 });

const drawn = (path: string) => ({
  pluginId: 'counter',
  at: { path, pageState: {}, pages: 1 },
});

it('remembers the tree last sent for an address', () => {
  const sent = trees();

  sent.at(drawn('/a')).keep(tree);

  expect(sent.at(drawn('/a')).last).toEqual(tree);
});

it('forgets the oldest address once a Plugin has drawn more than it keeps', () => {
  const sent = trees();

  for (let page = 0; page < 1000; page += 1)
    sent.at(drawn(`/page-${page}`)).keep(tree);

  expect(sent.at(drawn('/page-0')).last).toBeUndefined();
  expect(sent.at(drawn('/page-999')).last).toEqual(tree);
});
