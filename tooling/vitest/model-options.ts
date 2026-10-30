import type { AnyMachineSnapshot, AnyStateMachine, EventObject } from 'xstate';
import { modelEvents } from './model-edges';
import { stateKey } from './model-state';
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
>({ graph, walk }: Walked<TMachine, TEvent>): Check<TMachine, TEvent> {
  const checks = [
    isActive,
    isAccepted,
    graph.permits ?? allow,
    walk.permits ?? allow,
  ];

  return (snapshot, event): boolean =>
    checks.every((check): boolean => check(snapshot, event));
}

// The state the step came from, so each way into a state is its own vertex.
const arrival = (
  event: EventObject | undefined,
  previous: AnyMachineSnapshot | undefined,
): string =>
  event && previous ? `${stateKey(previous.value)} ${event.type}` : '';

function serialize<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
>(
  walked: Walked<TMachine, TEvent>,
): NonNullable<ModelOptions<TMachine, TEvent>['serializeState']> {
  const { vertex = walked.graph.vertex, arrivals = true } = walked.walk;

  return (snapshot, event, previous): string =>
    JSON.stringify({
      vertex: vertex(snapshot),
      via: arrivals ? arrival(event, previous) : '',
    });
}

export function walkEvents<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
>({ machine, graph, walk }: Walked<TMachine, TEvent>): ModelEvent<TEvent>[] {
  return modelEvents(machine, [...graph.fixtures, ...(walk.fixtures ?? [])]);
}

// A walk with the events it drives.
export type Eventful<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
> = Walked<TMachine, TEvent> & { events: ModelEvent<TEvent>[] };

export function traversalOptions<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
>(walked: Eventful<TMachine, TEvent>): ModelOptions<TMachine, TEvent> {
  return {
    input: walked.graph.input,
    events: walked.events,
    filterEvents: acceptable(walked),
    serializeState: serialize(walked),
    limit: walked.graph.limit ?? Infinity,
    stopWhen: walked.walk.stopWhen,
  };
}
