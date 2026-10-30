import { expect, vi } from 'vitest';
import { stateKey } from './model-state';
import type { PathRun, PathStep, Running } from './model-types';

function actorOf(run: PathRun): Running {
  return run.actor ?? expect.unreachable('The path has not started its actor');
}

const reached = (actor: Running): string => stateKey(actor.getSnapshot().value);

// Holds the clock one millisecond short of the declared delay, where the state must not have changed, then crosses it, where the delayed transition must have run; timers due on the way fire in order.
export async function fireDelay(run: PathRun, step: PathStep): Promise<void> {
  const actor = actorOf(run);
  const due = run.due.get(step.event.type);

  if (due === undefined)
    return expect.unreachable(`${step.event.type} was never set`);

  await vi.advanceTimersByTimeAsync(Math.max(due - 1 - Date.now(), 0));
  expect(reached(actor)).not.toBe(stateKey(step.state.value));
  await vi.advanceTimersByTimeAsync(1);
  expect(reached(actor)).toBe(stateKey(step.state.value));
}
