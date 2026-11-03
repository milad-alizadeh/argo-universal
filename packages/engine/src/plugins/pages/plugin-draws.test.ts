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
    log: () => null,
  });

it('tells its listeners when the running worker says what it shows changed', () => {
  const pages = draws();
  const marked: string[] = [];

  pages.onChanged((pluginId) => marked.push(pluginId));
  pages.ran('tracker', 2);
  pages.receive({ pluginId: 'tracker', generation: 1 }, { action: 'changed' });
  pages.receive({ pluginId: 'tracker', generation: 2 }, { action: 'changed' });

  expect(marked).toEqual(['tracker']);
});

it('stops telling a listener that unsubscribed', () => {
  const pages = draws();
  const marked: string[] = [];

  const unsubscribe = pages.onChanged((pluginId) => marked.push(pluginId));
  pages.ran('tracker', 1);
  unsubscribe();
  pages.receive({ pluginId: 'tracker', generation: 1 }, { action: 'changed' });

  expect(marked).toEqual([]);
});

it('tells its listeners when an Operation of a running Plugin ran', () => {
  const pages = draws();
  const marked: string[] = [];

  pages.onChanged((pluginId) => marked.push(pluginId));
  pages.changedBy('tracker');
  pages.ran('tracker', 1);
  pages.changedBy('tracker');

  expect(marked).toEqual(['tracker']);
});
