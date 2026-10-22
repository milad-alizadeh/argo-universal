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

type AnyGraphOptions = GraphOptions<AnyActorLogic, EventObject>;

export function getShortestPaths<
  TLogic extends AnyActorLogic,
  TEvent extends GraphEventFromLogic<NoInfer<TLogic>> = EventFromLogic<TLogic>,
>(
  logic: TLogic,
  options?: GraphOptions<TLogic, TEvent>,
): StatePath<SnapshotOf<TLogic>, TEvent>[];
export function getShortestPaths(
  logic: AnyActorLogic,
  options?: AnyGraphOptions,
): StatePath<SnapshotOf<AnyActorLogic>, EventObject>[] {
  return graph.getShortestPaths(logic, options);
}

export function getSimplePaths<
  TLogic extends AnyActorLogic,
  TEvent extends GraphEventFromLogic<NoInfer<TLogic>> = EventFromLogic<TLogic>,
>(
  logic: TLogic,
  options?: GraphOptions<TLogic, TEvent>,
): StatePath<SnapshotOf<TLogic>, TEvent>[];
export function getSimplePaths(
  logic: AnyActorLogic,
  options?: AnyGraphOptions,
): StatePath<SnapshotOf<AnyActorLogic>, EventObject>[] {
  return graph.getSimplePaths(logic, options);
}

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
