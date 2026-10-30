import type { AnyMachineSnapshot, AnyStateMachine, EventObject } from 'xstate';
import * as graph from 'xstate/graph';
import type { AdjacencyMap, StatePath, TraversalOptions } from 'xstate/graph';
import type { DelayEvent } from './model-edges';
import { terminalPaths } from './model-paths';
import type {
  ModelOptions,
  ModelPaths,
  ModelWalk,
  SnapshotOf,
} from './model-types';

type AnyOptions = TraversalOptions<AnyMachineSnapshot, EventObject, unknown>;

// The stock search types its events by the machine's public ones; a model also sends done, error and delayed events.
export function searchPaths<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
>(
  machine: TMachine,
  options: ModelOptions<TMachine, TEvent>,
  walk: ModelWalk<TMachine, TEvent>,
): ModelPaths<TMachine, TEvent>;
export function searchPaths(
  machine: AnyStateMachine,
  options: AnyOptions,
  walk: { search: 'shortest' | 'simple' },
): StatePath<AnyMachineSnapshot, EventObject>[] {
  const search =
    walk.search === 'shortest' ? graph.getShortestPaths : graph.getSimplePaths;

  return terminalPaths(search(machine, options));
}

export function adjacencyOf<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
>(
  machine: TMachine,
  options: ModelOptions<TMachine, TEvent>,
): AdjacencyMap<SnapshotOf<TMachine>, TEvent | DelayEvent>;
export function adjacencyOf(
  machine: AnyStateMachine,
  options: AnyOptions,
): AdjacencyMap<AnyMachineSnapshot, EventObject> {
  return graph.getAdjacencyMap(machine, options);
}
