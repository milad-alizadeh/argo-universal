import type { WireJson } from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import { stack, svg } from '../views/draw-tree-fixtures';
import { PluginDraws } from './plugin-draws';

const draws = (log: (line: string) => void = () => null): PluginDraws =>
  new PluginDraws({
    send: () => null,
    clock: {
      now: () => 0,
      delay: () => Promise.resolve(),
      schedule: () => () => null,
    },
    log,
  });

it('draws a page without the SVG the sanitiser refused, and logs what it left out', async () => {
  const logs: string[] = [];
  const pages = draws((line) => logs.push(line));
  const at = { path: '/map', pageState: {}, pages: 1 };

  pages.ran('atlas', 1);

  const drawn = pages.draw('atlas', at);

  // The worker sends its tree as JSON.
  const root: WireJson = JSON.parse(
    JSON.stringify(stack([svg('<svg><script/></svg>', 'unsafe')])),
  );

  pages.receive(
    { pluginId: 'atlas', generation: 1 },
    { action: 'drawn', id: 0, root, pages: 1 },
  );

  expect(await drawn).toMatchObject({ ok: true, root: { children: [] } });
  expect(logs).toEqual([
    'Plugin atlas: refused /map node Stack#root/Svg#unsafe: element <script> refused',
  ]);
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
