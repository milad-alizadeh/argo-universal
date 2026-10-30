import type { AnyStateMachine, EventObject } from 'xstate';
import { delayName, isDelayEvent } from './model-edges';
import type { DeclaredDelay, ModelActor, ModelEvent } from './model-types';

export function executorFor<TExecutor>(
  executors: Record<string, TExecutor>,
  type: string,
): TExecutor {
  const executor = executors[type];

  if (!executor) throw new Error(`Missing executor for ${type}`);

  return executor;
}

export function declaredDelay<TMachine extends AnyStateMachine>(
  delays: Record<string, DeclaredDelay<TMachine>>,
  type: string,
): DeclaredDelay<TMachine> {
  const declared = delays[delayName(type)];

  if (declared === undefined)
    throw new Error(`Missing declared delay for ${type}`);

  return declared;
}

function requireDriver<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
>(event: ModelEvent<TEvent>, actor: ModelActor<TMachine, TEvent>): void {
  if (isDelayEvent(event)) declaredDelay(actor.delays, event.type);
  else executorFor(actor.executors, event.type);
}

// A missing executor or declared delay fails when the model is built, as early as a missing fixture.
export function requireDrivers<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
>(events: ModelEvent<TEvent>[], actor: ModelActor<TMachine, TEvent>): void {
  for (const event of events) requireDriver(event, actor);
}
