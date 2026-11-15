import { expect, it } from 'vitest';
import { PluginTestClock } from '../worker/test-clock';
import { TestControl } from './test-control';

// A runtime with one worker whose clock answers at once, as an idle worker does.
function control(): TestControl {
  const worker = new PluginTestClock(0);

  const runtime: TestControl = new TestControl({
    clock: new PluginTestClock(0),
    running: () => ['plugin'],
    tell: ({ id }) => {
      queueMicrotask(() =>
        runtime.settle({
          type: 'test.done',
          id,
          clock: { now: worker.now(), nextAt: worker.nextAt() },
        }),
      );
    },
  });

  return runtime;
}

it('waits for a Plugin call still being answered before it says the runtime is idle', async () => {
  const runtime = control();
  const answer = Promise.withResolvers<void>();
  const call = runtime.during(() => answer.promise);
  let idle = false;

  const waited = runtime.idle().then(() => {
    idle = true;
  });

  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(idle).toBe(false);

  answer.resolve();
  await call;
  await waited;
  expect(idle).toBe(true);
});

it('is idle at once when no Plugin call is in flight', async () => {
  await expect(control().idle()).resolves.toBeUndefined();
});
