import { expect, it } from 'vitest';
import type { PluginClock } from '../clock';
import type { PluginEvent } from '../protocol/runtime';
import { WorkerCalls } from '../runtime/worker-calls';
import { HeldSecrets } from '../services/held-secrets';
import { PluginOperations } from './plugin-operations';

const idleClock: PluginClock = {
  now: () => 0,
  delay: () => Promise.resolve(),
  schedule: () => () => null,
};

const request = {
  name: 'close',
  params: {},
  caller: { person: true },
} as const;

// The id of the Operation run the worker was last sent.
const lastRunId = (sent: PluginEvent[]): number => {
  const last = sent.at(-1);

  return last?.type === 'operation' ? last.id : -1;
};

// One run of `close` on Plugin `tracker`, which the worker answers with `answer`, and the Plugins heard to run.
async function runAnswered(
  answer: (id: number) => Parameters<PluginOperations['receive']>[1],
): Promise<string[]> {
  const sent: PluginEvent[] = [];

  const workers = new WorkerCalls({
    send: (_, event): void => void sent.push(event),
    clock: idleClock,
  });

  const operations = new PluginOperations(workers, new HeldSecrets());
  const heard: string[] = [];

  operations.onRan((pluginId) => heard.push(pluginId));
  workers.run('tracker', 1);

  const running = operations.run('tracker', request);

  operations.receive(
    { pluginId: 'tracker', generation: 1 },
    answer(lastRunId(sent)),
  );
  await running;

  return heard;
}

it('is heard to have run when its handler returned', async () => {
  expect(
    await runAnswered((id) => ({ action: 'result', id, result: null })),
  ).toEqual(['tracker']);
});

it('is heard to have run when its handler threw, as it may have written first', async () => {
  expect(
    await runAnswered((id) => ({ action: 'failed', id, error: 'nope' })),
  ).toEqual(['tracker']);
});
