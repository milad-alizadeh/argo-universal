import { expect, vi } from 'vitest';
import type { AnyActorRef, StateValue } from 'xstate';
import type { DelayEvent } from './model-edges';

// The actor of the running test.
export type Running = AnyActorRef;

// More timers than this before the state is reached means the delayed transition never ran.
const timerLimit = 8;

const sameValue = (left: StateValue, right: StateValue): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

// When the actor's own scheduler will send the delayed event: its start plus its delay, however the machine declared it.
function dueAt(running: Running, event: DelayEvent): number {
  const scheduled = Object.values(
    running.system.getSnapshot()._scheduledEvents,
  ).find((candidate): boolean => candidate.event.type === event.type);

  if (!scheduled) return expect.unreachable(`${event.type} is not scheduled`);

  return scheduled.startedAt + scheduled.delay;
}

// Fires timers in order until the delayed transition has run, on the very tick it is due; an earlier delay may fire on the way.
export async function fireDelay(
  running: Running,
  step: { event: DelayEvent; state: { value: StateValue } },
): Promise<void> {
  const due = dueAt(running, step.event);

  for (let fired = 0; fired < timerLimit; fired++) {
    await vi.advanceTimersToNextTimerAsync();

    if (sameValue(running.getSnapshot().value, step.state.value))
      return expect(Date.now()).toBe(due);
  }

  expect.unreachable(`${JSON.stringify(step.state.value)} was never reached`);
}
