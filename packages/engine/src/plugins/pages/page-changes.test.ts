import { expect, it } from 'vitest';
import type { PluginClock } from '../clock';
import { WorkerCalls } from '../runtime/worker-calls';
import { PageChanges } from './page-changes';

const idleClock: PluginClock = {
  now: () => 0,
  delay: () => Promise.resolve(),
  schedule: () => () => null,
};

type Changes = { changes: PageChanges; workers: WorkerCalls };

function pageChanges(): Changes {
  const workers = new WorkerCalls({ send: (): null => null, clock: idleClock });

  return { changes: new PageChanges(workers, (): null => null), workers };
}

it('tells its listeners when the running worker says what it shows changed', () => {
  const { changes, workers } = pageChanges();
  const marked: string[] = [];

  changes.listen((pluginId) => marked.push(pluginId));
  workers.run('tracker', 2);
  changes.changed({ pluginId: 'tracker', generation: 1 });
  changes.changed({ pluginId: 'tracker', generation: 2 });

  expect(marked).toEqual(['tracker']);
});

it('stops telling a listener that unsubscribed', () => {
  const { changes, workers } = pageChanges();
  const marked: string[] = [];

  const unsubscribe = changes.listen((pluginId) => marked.push(pluginId));

  workers.run('tracker', 1);
  unsubscribe();
  changes.changed({ pluginId: 'tracker', generation: 1 });

  expect(marked).toEqual([]);
});

it('tells its listeners when an Operation of a running Plugin ran', () => {
  const { changes, workers } = pageChanges();
  const marked: string[] = [];

  changes.listen((pluginId) => marked.push(pluginId));
  changes.changedBy('tracker');
  workers.run('tracker', 1);
  changes.changedBy('tracker');

  expect(marked).toEqual(['tracker']);
});
