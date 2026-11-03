import type { WireJson } from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import type { PluginClock } from '../clock';
import { WorkerCalls } from '../runtime/worker-calls';
import { stack, svg } from '../views/draw-tree-fixtures';
import { PluginDraws } from './plugin-draws';

type Draws = { pages: PluginDraws; workers: WorkerCalls };

const idleClock: PluginClock = {
  now: () => 0,
  delay: () => Promise.resolve(),
  schedule: () => () => null,
};

function draws(log: (line: string) => void = (): null => null): Draws {
  const workers = new WorkerCalls({ send: (): null => null, clock: idleClock });

  return { pages: new PluginDraws(workers, log), workers };
}

it('draws a page without the SVG the sanitiser refused, and logs what it left out', async () => {
  const logs: string[] = [];
  const { pages, workers } = draws((line) => logs.push(line));
  const at = { path: '/map', pageState: {}, pages: 1 };

  workers.run('atlas', 1);

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
  const { pages, workers } = draws();
  const marked: string[] = [];

  pages.onChanged((pluginId) => marked.push(pluginId));
  workers.run('tracker', 2);
  pages.receive({ pluginId: 'tracker', generation: 1 }, { action: 'changed' });
  pages.receive({ pluginId: 'tracker', generation: 2 }, { action: 'changed' });

  expect(marked).toEqual(['tracker']);
});

it('stops telling a listener that unsubscribed', () => {
  const { pages, workers } = draws();
  const marked: string[] = [];

  const unsubscribe = pages.onChanged((pluginId) => marked.push(pluginId));
  workers.run('tracker', 1);
  unsubscribe();
  pages.receive({ pluginId: 'tracker', generation: 1 }, { action: 'changed' });

  expect(marked).toEqual([]);
});

it('tells its listeners when an Operation of a running Plugin ran', () => {
  const { pages, workers } = draws();
  const marked: string[] = [];

  pages.onChanged((pluginId) => marked.push(pluginId));
  pages.changedBy('tracker');
  workers.run('tracker', 1);
  pages.changedBy('tracker');

  expect(marked).toEqual(['tracker']);
});
