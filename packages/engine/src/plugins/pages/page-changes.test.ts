import { expect, it } from 'vitest';
import type { PluginClock } from '../clock';
import { WorkerCalls } from '../runtime/worker-calls';
import { PageChanges } from './page-changes';

const idleClock: PluginClock = {
  now: () => 0,
  delay: () => Promise.resolve(),
  schedule: () => () => null,
};

type Changes = {
  changes: PageChanges;
  workers: WorkerCalls;
  scoped: string[];
};

function pageChanges(): Changes {
  const workers = new WorkerCalls({ send: (): null => null, clock: idleClock });
  const scoped: string[] = [];

  const changes = new PageChanges(
    workers,
    (): null => null,
    (pluginId): void => void scoped.push(pluginId),
  );

  return { changes, workers, scoped };
}

it('hands on what the running worker says changed, and marks no page itself', () => {
  const { changes, workers, scoped } = pageChanges();
  const marked: string[] = [];

  changes.listen((pluginId) => marked.push(pluginId));
  workers.run('tracker', 2);
  changes.changed({ pluginId: 'tracker', generation: 1 });
  changes.changed({ pluginId: 'tracker', generation: 2 });

  expect(scoped).toEqual(['tracker']);
  expect(marked).toEqual([]);
});

it('stops telling a listener that unsubscribed', () => {
  const { changes, workers } = pageChanges();
  const marked: string[] = [];

  const unsubscribe = changes.listen((pluginId) => marked.push(pluginId));

  workers.run('tracker', 1);
  unsubscribe();
  changes.restarted('tracker');

  expect(marked).toEqual([]);
});

it('hands on what an Operation of a running Plugin wrote', () => {
  const { changes, workers, scoped } = pageChanges();

  changes.changedBy('tracker');
  workers.run('tracker', 1);
  changes.changedBy('tracker');

  expect(scoped).toEqual(['tracker']);
});

it('tells its listeners when a new worker of a Plugin starts running, so its kept answers are drawn again', () => {
  const { changes, workers } = pageChanges();
  const marked: string[] = [];

  changes.listen((pluginId) => marked.push(pluginId));
  workers.run('tracker', 1);
  changes.restarted('tracker');

  expect(marked).toEqual(['tracker']);
});

it('names the Draft region the Agent is writing on the mark of the worker that follows', () => {
  const { changes, workers } = pageChanges();
  const marked: (string | undefined)[] = [];

  changes.listen((_pluginId, _addresses, region) => marked.push(region));
  workers.run('tracker', 1);

  const done = changes.drawing('tracker', 'list');

  changes.restarted('tracker');
  changes.restarted('tracker');
  done();

  expect(marked).toEqual(['list', undefined]);
});

it('forgets the region when the Draft swapped no worker', () => {
  const { changes, workers } = pageChanges();
  const marked: (string | undefined)[] = [];

  changes.listen((_pluginId, _addresses, region) => marked.push(region));
  workers.run('tracker', 1);
  changes.drawing('tracker', 'list')();
  changes.restarted('tracker');

  expect(marked).toEqual([undefined]);
});
