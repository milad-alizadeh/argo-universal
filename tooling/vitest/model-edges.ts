import type { AnyStateMachine, EventObject } from 'xstate';
import { type DirectedGraphNode, toDirectedGraph } from 'xstate/graph';

const delayPrefix = 'xstate.after.';

// A delayed transition's event, named by its delay and the state that holds it; XState generates the rest.
export type DelayEvent = EventObject & { type: `xstate.after.${string}` };

export const isDelayEvent = (event: EventObject): event is DelayEvent =>
  event.type.startsWith(delayPrefix);

// The name the machine's `delays` give a delay, from the event XState generates for it.
export const delayName = (type: string): string =>
  type.slice(delayPrefix.length).split('.').at(0) ?? '';

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

// One fixture list names the events a machine's edges need; delayed events need none, their delay names them.
export function modelEvents<TEvent extends EventObject>(
  machine: AnyStateMachine,
  fixtures: TEvent[],
): (TEvent | DelayEvent)[] {
  return graphEventTypes(machine).flatMap((type): (TEvent | DelayEvent)[] => {
    const matching = fixtures.filter((event): boolean => event.type === type);
    const delayed = { type };

    if (matching.length > 0) return matching;

    if (isDelayEvent(delayed)) return [delayed];
    throw new Error(`Missing graph fixture for ${type}`);
  });
}
