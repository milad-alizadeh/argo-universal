import type {
  AnyMachineSnapshot,
  AnyStateMachine,
  EventObject,
  StateValue,
} from 'xstate';
import { modelEvents } from './model-edges';
import type { Check, ModelEvent, ModelOptions, Walked } from './model-types';

const allow = (): boolean => true;

// A done actor ignores events, but traversal still leaves a final state through the root `on`.
const isActive = (snapshot: AnyMachineSnapshot): boolean =>
  snapshot.status === 'active';

const isAccepted = (
  snapshot: AnyMachineSnapshot,
  event: EventObject,
): boolean => snapshot.can(event);

function acceptable<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
>({ model, walk }: Walked<TMachine, TEvent>): Check<TMachine, TEvent> {
  const checks = [
    isActive,
    isAccepted,
    model.permits ?? allow,
    walk.permits ?? allow,
  ];

  return (snapshot, event): boolean =>
    checks.every((check): boolean => check(snapshot, event));
}

const valueOf = (
  snapshot: AnyMachineSnapshot | undefined,
): StateValue | undefined => snapshot?.value;

// The state the step came from, so each way into a state is its own vertex.
const arrival = (
  event: EventObject | undefined,
  previous: AnyMachineSnapshot | undefined,
): string =>
  event ? `${JSON.stringify(valueOf(previous))} ${event.type}` : '';

function serialize<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
>(
  walked: Walked<TMachine, TEvent>,
): NonNullable<ModelOptions<TMachine, TEvent>['serializeState']> {
  const { vertex = walked.model.vertex, arrivals = true } = walked.walk;

  return (snapshot, event, previous): string =>
    JSON.stringify({
      vertex: vertex(snapshot),
      via: arrivals ? arrival(event, previous) : '',
    });
}

function walkEvents<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
>({ machine, model, walk }: Walked<TMachine, TEvent>): ModelEvent<TEvent>[] {
  return modelEvents(machine, [...model.fixtures, ...(walk.fixtures ?? [])]);
}

export function traversalOptions<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
>(walked: Walked<TMachine, TEvent>): ModelOptions<TMachine, TEvent> {
  return {
    input: walked.model.input,
    events: walkEvents(walked),
    filterEvents: acceptable(walked),
    serializeState: serialize(walked),
    limit: walked.model.limit ?? Infinity,
    stopWhen: walked.walk.stopWhen,
  };
}
