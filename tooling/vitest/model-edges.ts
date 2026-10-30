import type {
  AnyStateMachine,
  DoneActorEvent,
  ErrorActorEvent,
  EventFromLogic,
  EventObject,
  SnapshotEvent,
} from 'xstate';
import { type DirectedGraphNode, toDirectedGraph } from 'xstate/graph';

const delayPrefix = 'xstate.after.';

// A delayed transition's event, named by its delay and the state that holds it; XState generates the rest.
export type DelayEvent = EventObject & { type: `xstate.after.${string}` };

// What a fixture may send: the machine's public events, and its invoked actors' done, error and snapshot events.
export type ModelFixture<TMachine extends AnyStateMachine> =
  | EventFromLogic<TMachine>
  | DoneActorEvent
  | ErrorActorEvent
  | SnapshotEvent;

export const isDelayEvent = (event: EventObject): event is DelayEvent =>
  event.type.startsWith(delayPrefix);

// The name the machine's `delays` give a delay, from the event XState generates for it.
export const delayName = (type: string): string =>
  type.slice(delayPrefix.length).split('.').at(0) ?? '';

// The delay a delayed event fires for, as the machine's `delays` name it.
export const firedDelay = (event: EventObject): string | undefined =>
  isDelayEvent(event) ? delayName(event.type) : undefined;

const eventTypes = (node: DirectedGraphNode): string[] => [
  ...node.edges.map((edge): string => edge.label.text),
  ...node.children.flatMap(eventTypes),
];

// The machine raises `xstate.done.state.*` itself, so a model must not send it.
const isRaised = (type: string): boolean =>
  type.startsWith('xstate.done.state.');

// Every event type with an edge in the machine, however deep the state that handles it.
export const graphEventTypes = (machine: AnyStateMachine): string[] =>
  [...new Set(eventTypes(toDirectedGraph(machine)))].filter(
    (type): boolean => !isRaised(type),
  );

// An edge's event descriptor: the type itself, `*`, or a wildcard such as `xstate.done.actor.*`.
const isWildcardOf = (descriptor: string, type: string): boolean =>
  descriptor.endsWith('.*') && type.startsWith(descriptor.slice(0, -1));

const describes = (descriptor: string, type: string): boolean =>
  descriptor === type || descriptor === '*' || isWildcardOf(descriptor, type);

// The fixtures an edge needs; a delayed event needs none, its delay names it.
function edgeEvents<TEvent extends EventObject>(
  descriptor: string,
  fixtures: TEvent[],
): (TEvent | DelayEvent)[] {
  const matching = fixtures.filter(({ type }) => describes(descriptor, type));
  const delayed = { type: descriptor };

  if (matching.length > 0) return matching;

  if (isDelayEvent(delayed)) return [delayed];
  throw new Error(`Missing graph fixture for ${descriptor}`);
}

// One fixture list names the events a machine's edges need, each once, but those the model omits.
export const modelEvents = <TEvent extends EventObject>(
  machine: AnyStateMachine,
  fixtures: TEvent[],
  omitted: string[] = [],
): (TEvent | DelayEvent)[] => [
  ...new Set(
    graphEventTypes(machine)
      .filter((type) => !omitted.includes(type))
      .flatMap((type) => edgeEvents(type, fixtures)),
  ),
];
