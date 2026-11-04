import type { PluginEvent } from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import type { PluginClock } from '../clock';
import { WorkerCalls, type CallOutcome, type KindCalls } from './worker-calls';

type Answer = { id: number; text: string };

const manualClock = (): PluginClock & { fire: () => void } => {
  const timers = new Set<() => void>();

  return {
    now: () => 0,
    delay: async () => {},
    schedule: (callback) => {
      timers.add(callback);

      return () => timers.delete(callback);
    },
    fire: () => {
      for (const timer of timers) timer();
    },
  };
};

// What a caller gets: the answer's text, or why the call ended without one.
const said = (outcome: CallOutcome<Answer>): string =>
  'answered' in outcome ? outcome.answered.text : outcome.ended;

type Calls = KindCalls<null, Answer, string>;

type Table = {
  workers: WorkerCalls;
  sent: PluginEvent[];
  clock: ReturnType<typeof manualClock>;
  kind: (name: string) => Calls;
};

function workerCalls(): Table {
  const sent: PluginEvent[] = [];
  const clock = manualClock();

  const workers = new WorkerCalls({
    clock,
    send: (_pluginId, event): void => void sent.push(event),
  });

  const kind = (name: string): Calls =>
    workers.kind({
      event: (id, _request: null): PluginEvent => ({
        type: 'operation',
        id,
        name,
        params: {},
        caller: {},
      }),
      limitMs: 1000,
      result: said,
    });

  return { workers, sent, clock, kind };
}

it('answers each call from the generation it went to, by its kind and id', async () => {
  const { workers, sent, kind } = workerCalls();
  const first = kind('first');
  const second = kind('second');

  workers.run('tracker', 1);

  const asked = first.call('tracker', null);
  const other = second.call('tracker', null);

  second.answer({ pluginId: 'tracker', generation: 1 }, { id: 0, text: 'two' });
  first.answer({ pluginId: 'tracker', generation: 1 }, { id: 0, text: 'one' });

  expect(await asked).toBe('one');
  expect(await other).toBe('two');
  expect(sent).toHaveLength(2);
});

it('ignores an answer from an ended worker generation', async () => {
  const { workers, kind, clock } = workerCalls();
  const calls = kind('draw');

  workers.run('tracker', 1);
  workers.release('tracker');
  workers.run('tracker', 2);

  const asked = calls.call('tracker', null);

  calls.answer({ pluginId: 'tracker', generation: 1 }, { id: 0, text: 'old' });
  calls.answer({ pluginId: 'other', generation: 2 }, { id: 0, text: 'other' });
  clock.fire();

  expect(await asked).toBe('late');
});

it('fails every waiting call of every kind when its generation stops', async () => {
  const { workers, kind } = workerCalls();
  const first = kind('first');
  const second = kind('second');

  workers.run('tracker', 1);
  workers.run('atlas', 1);

  const waiting = [first.call('tracker', null), second.call('tracker', null)];
  const elsewhere = first.call('atlas', null);

  workers.release('tracker');
  expect(await Promise.all(waiting)).toEqual(['stopped', 'stopped']);

  workers.run('atlas', 2);
  expect(await elsewhere).toBe('stopped');

  const closing = first.call('atlas', null);

  workers.close();
  expect(await closing).toBe('stopped');
});

it('sends nothing to a Plugin that is not running', async () => {
  const { workers, sent, kind } = workerCalls();

  expect(await kind('draw').call('tracker', null)).toBe('notRunning');

  workers.run('tracker', 1);
  workers.release('tracker');
  expect(await kind('draw').call('tracker', null)).toBe('notRunning');
  expect(sent).toEqual([]);
});

it('tells its watchers when a generation runs or ends', () => {
  const { workers } = workerCalls();
  const heard: string[] = [];

  workers.watch((pluginId) =>
    heard.push(`${pluginId}:${workers.generation(pluginId) ?? 'ended'}`),
  );
  workers.run('tracker', 1);
  workers.run('tracker', 1);
  workers.release('tracker');
  workers.release('tracker');

  expect(heard).toEqual(['tracker:1', 'tracker:ended']);
});
