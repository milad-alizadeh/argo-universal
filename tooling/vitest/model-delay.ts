import { expect, vi } from 'vitest';
import type { InspectionEvent } from 'xstate';
import { stateKey } from './model-state';
import type { PathRun, PathStep, Running } from './model-types';

function actorOf(run: PathRun): Running {
  return run.actor ?? expect.unreachable('The path has not started its actor');
}

const reached = (actor: Running): string => stateKey(actor.getSnapshot().value);

const isSent = (
  inspected: InspectionEvent,
  actor: Running,
  type: string,
): boolean =>
  inspected.type === '@xstate.event' &&
  inspected.actorRef === actor &&
  inspected.event.type === type;

// Counts the delayed events the actor is sent; a delay that re-enters its own state shows nowhere else.
function countDelivered(actor: Running, type: string): () => number {
  let delivered = 0;

  const subscription = actor.system.inspect((inspected: InspectionEvent) => {
    if (isSent(inspected, actor, type)) delivered += 1;
  });

  return (): number => {
    subscription.unsubscribe();

    return delivered;
  };
}

// Holds the clock one millisecond short of the declared delay, where the delayed event must not have been sent, then crosses it, where it must have been and its transition must have run; timers due on the way fire in order.
export async function fireDelay(run: PathRun, step: PathStep): Promise<void> {
  const actor = actorOf(run);
  const due = run.due.get(step.event.type);

  if (due === undefined)
    return expect.unreachable(`${step.event.type} was never set`);

  const held = countDelivered(actor, step.event.type);
  await vi.advanceTimersByTimeAsync(Math.max(due - 1 - Date.now(), 0));
  const early = countDelivered(actor, step.event.type);
  expect(held(), `${step.event.type} came before its declared delay`).toBe(0);
  await vi.advanceTimersByTimeAsync(1);
  expect(early(), `${step.event.type} missed its declared delay`).toBe(1);
  expect(reached(actor)).toBe(stateKey(step.state.value));
}
