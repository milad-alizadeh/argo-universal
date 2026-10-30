import type { AnyMachineSnapshot, AnyStateMachine, EventObject } from 'xstate';
import { isDelayEvent, modelEvents } from './model-edges';
import { stateKey } from './model-state';
import type { ModelOptions } from './model-types';
import type {
  Arrival,
  Check,
  ModelEvent,
  ModelGraph,
  Walked,
} from './model-walk';

const allow = (): boolean => true;

// A done actor ignores events, but traversal still leaves a final state through the root `on`.
const isActive = (snapshot: AnyMachineSnapshot): boolean =>
  snapshot.status === 'active';

const isAccepted = (
  snapshot: AnyMachineSnapshot,
  event: EventObject,
): boolean => snapshot.can(event);

function takes<TMachine extends AnyStateMachine, TEvent extends EventObject>(
  accepts: ModelGraph<TMachine, TEvent>['accepts'],
): Check<TMachine, TEvent> {
  if (!accepts) return isAccepted;

  return (snapshot, event): boolean =>
    isDelayEvent(event)
      ? isAccepted(snapshot, event)
      : accepts(snapshot, event);
}

function acceptable<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
>({ graph, walk }: Walked<TMachine, TEvent>): Check<TMachine, TEvent> {
  const checks = [
    isActive,
    takes(graph.accepts),
    graph.permits ?? allow,
    walk.permits ?? allow,
  ];

  return (snapshot, event): boolean =>
    checks.every((check): boolean => check(snapshot, event));
}

const typeOf = (event: EventObject): string => event.type;

export const eventKeyOf = <
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
>(
  graph: ModelGraph<TMachine, TEvent>,
): ((event: ModelEvent<TEvent>) => string) => graph.eventKey ?? typeOf;

// The state the step came from, so each way into a state is its own vertex.
function cameFrom<TMachine extends AnyStateMachine, TEvent extends EventObject>(
  graph: ModelGraph<TMachine, TEvent>,
): Arrival<TMachine, TEvent> {
  const eventKey = eventKeyOf(graph);

  return (_, event, previous): string =>
    `${stateKey(previous.value)} ${eventKey(event)}`;
}

function arrivalOf<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
>({ graph, walk }: Walked<TMachine, TEvent>): Arrival<TMachine, TEvent> {
  if (walk.arrivals === false) return (): string => '';

  return walk.arrival ?? cameFrom(graph);
}

function serialize<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
>(
  walked: Walked<TMachine, TEvent>,
): NonNullable<ModelOptions<TMachine, TEvent>['serializeState']> {
  const { vertex = walked.graph.vertex } = walked.walk;
  const arrival = arrivalOf(walked);

  return (snapshot, event, previous): string =>
    JSON.stringify({
      vertex: vertex(snapshot),
      via: event && previous ? arrival(snapshot, event, previous) : '',
    });
}

export function walkEvents<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
>({ machine, graph, walk }: Walked<TMachine, TEvent>): ModelEvent<TEvent>[] {
  const fixtures = [...graph.fixtures, ...(walk.fixtures ?? [])];

  return modelEvents(machine, fixtures, graph.omitted);
}

// A walk with the events it drives.
export type Eventful<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
> = Walked<TMachine, TEvent> & { events: ModelEvent<TEvent>[] };

// The search tells events apart by the model's key only when the model names one; by their whole value otherwise.
const eventSerializer = <
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
>({
  eventKey,
}: ModelGraph<TMachine, TEvent>): Pick<
  ModelOptions<TMachine, TEvent>,
  'serializeEvent'
> => (eventKey ? { serializeEvent: eventKey } : {});

// Where the walk starts: the model's snapshot when it names one, the machine's initial snapshot for the walk's input otherwise.
const start = <TMachine extends AnyStateMachine, TEvent extends EventObject>({
  graph,
  walk,
}: Walked<TMachine, TEvent>): Pick<
  ModelOptions<TMachine, TEvent>,
  'input' | 'fromState'
> => ({
  input: walk.input ?? graph.input,
  ...(graph.from && { fromState: graph.from }),
});

export function traversalOptions<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
>(walked: Eventful<TMachine, TEvent>): ModelOptions<TMachine, TEvent> {
  const { graph, walk } = walked;

  return {
    ...start(walked),
    ...eventSerializer(graph),
    events: walked.events,
    filterEvents: acceptable(walked),
    serializeState: serialize(walked),
    limit: graph.limit ?? Infinity,
    stopWhen: walk.stopWhen,
  };
}
