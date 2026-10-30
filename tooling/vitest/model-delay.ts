import { expect, vi } from 'vitest';
import { matchesState } from 'xstate';
import { delayName } from './model-edges';
import { stateKey } from './model-state';
import type { PathRun, PathStep, Running } from './model-types';

function actorOf(run: PathRun): Running {
  return run.actor ?? expect.unreachable('The path has not started its actor');
}

const reached = (actor: Running): string => stateKey(actor.getSnapshot().value);

// The state that set the delay, which XState names in the event after the delay; its timer runs only while the actor is inside it.
const timerOwner = ({ event, state }: PathStep): string =>
  state.machine
    .getStateNodeById(
      event.type.slice(`xstate.after.${delayName(event.type)}.`.length),
    )
    .path.join('.');

function expectHeld(actor: Running, step: PathStep): void {
  const owner = timerOwner(step);
  const { value } = actor.getSnapshot();

  expect(
    owner === '' || matchesState(owner, value),
    `${stateKey(value)} left ${owner} before its delay`,
  ).toBe(true);
  expect(stateKey(value)).not.toBe(stateKey(step.state.value));
}

/*
 * Holds the clock one millisecond short of the declared delay, where the actor must still be inside the state that set
 * it and short of the target, then crosses it, where the delayed transition must have run. Shorter timers inside that
 * state, such as a poll, may fire on the way.
 */
export async function fireDelay(run: PathRun, step: PathStep): Promise<void> {
  const actor = actorOf(run);
  const due = run.due.get(step.event.type);

  if (due === undefined)
    return expect.unreachable(`${step.event.type} was never set`);

  await vi.advanceTimersByTimeAsync(Math.max(due - 1 - Date.now(), 0));
  expectHeld(actor, step);
  await vi.advanceTimersByTimeAsync(1);
  expect(reached(actor)).toBe(stateKey(step.state.value));
}
