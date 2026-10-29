import type {
  AnyActorLogic,
  DoneActorEvent,
  DoneStateEvent,
  ErrorActorEvent,
  EventFromLogic,
  EventObject,
  InputFrom,
  SnapshotEvent,
} from 'xstate';
import * as graph from 'xstate/graph';
import type { AdjacencyMap, StatePath, TraversalOptions } from 'xstate/graph';

/*
 * Stock xstate/graph types traversal with the logic's public events only. These wrappers also take the
 * framework events a model drives, and keep the logic's snapshot and input types; the runtime is unchanged.
 */

// The machine's public events plus invoked actors' done and error, snapshot, final-state and delayed events.
export type GraphEventFromLogic<TLogic extends AnyActorLogic> =
  | EventFromLogic<TLogic>
  | DoneActorEvent
  | ErrorActorEvent
  | SnapshotEvent
  | DoneStateEvent
  | (EventObject & { type: `xstate.after.${string}` });

type SnapshotOf<TLogic extends AnyActorLogic> = ReturnType<
  TLogic['transition']
>;

type GraphOptions<
  TLogic extends AnyActorLogic,
  TEvent extends EventObject,
> = TraversalOptions<SnapshotOf<TLogic>, TEvent, InputFrom<TLogic>>;

type ModelEvent<TLogic extends AnyActorLogic> = GraphEventFromLogic<
  NoInfer<TLogic>
>;

type AnyGraphOptions = GraphOptions<AnyActorLogic, EventObject>;

type GraphArguments<
  TLogic extends AnyActorLogic,
  TEvent extends EventObject,
> = [logic: TLogic, options?: GraphOptions<TLogic, TEvent>];

type AnyPaths = (
  logic: AnyActorLogic,
  options?: AnyGraphOptions,
) => StatePath<SnapshotOf<AnyActorLogic>, EventObject>[];

type TypedPaths = <
  TLogic extends AnyActorLogic,
  TEvent extends GraphEventFromLogic<NoInfer<TLogic>> = EventFromLogic<TLogic>,
>(
  logic: TLogic,
  options?: GraphOptions<TLogic, TEvent>,
) => StatePath<SnapshotOf<TLogic>, TEvent>[];

// Shortest and simple paths share one typed signature over the stock traversal.
function typedPaths(traverse: AnyPaths): TypedPaths {
  function paths<
    TLogic extends AnyActorLogic,
    TEvent extends ModelEvent<TLogic> = EventFromLogic<TLogic>,
  >(
    ...args: GraphArguments<TLogic, TEvent>
  ): StatePath<SnapshotOf<TLogic>, TEvent>[];
  function paths(
    logic: AnyActorLogic,
    options?: AnyGraphOptions,
  ): StatePath<SnapshotOf<AnyActorLogic>, EventObject>[] {
    return traverse(logic, options);
  }

  return paths;
}

export const getShortestPaths = typedPaths(graph.getShortestPaths);

export const getSimplePaths = typedPaths(graph.getSimplePaths);

export function getAdjacencyMap<
  TLogic extends AnyActorLogic,
  TEvent extends GraphEventFromLogic<NoInfer<TLogic>> = EventFromLogic<TLogic>,
>(
  logic: TLogic,
  options: GraphOptions<TLogic, TEvent>,
): AdjacencyMap<SnapshotOf<TLogic>, TEvent>;
export function getAdjacencyMap(
  logic: AnyActorLogic,
  options: AnyGraphOptions,
): AdjacencyMap<SnapshotOf<AnyActorLogic>, EventObject> {
  return graph.getAdjacencyMap(logic, options);
}
