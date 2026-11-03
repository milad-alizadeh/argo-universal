import { expect, it } from 'vitest';
import { PluginDraws } from './plugin-draws';

const draws = (): PluginDraws =>
  new PluginDraws({
    send: () => null,
    clock: {
      now: () => 0,
      delay: () => Promise.resolve(),
      schedule: () => () => null,
    },
  });

it('tells its listeners when the running worker marks its Loader pages stale', () => {
  const pages = draws();
  const marked: string[] = [];

  pages.onStale((pluginId) => marked.push(pluginId));
  pages.ran('tracker', 2);
  pages.receive({ pluginId: 'tracker', generation: 1 }, { action: 'stale' });
  pages.receive({ pluginId: 'tracker', generation: 2 }, { action: 'stale' });

  expect(marked).toEqual(['tracker']);
});

it('stops telling a listener that unsubscribed', () => {
  const pages = draws();
  const marked: string[] = [];

  const unsubscribe = pages.onStale((pluginId) => marked.push(pluginId));
  pages.ran('tracker', 1);
  unsubscribe();
  pages.receive({ pluginId: 'tracker', generation: 1 }, { action: 'stale' });

  expect(marked).toEqual([]);
});
