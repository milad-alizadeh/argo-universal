import { isDeepStrictEqual } from 'node:util';
import type { AnyMachineSnapshot, AnyStateMachine, EventObject } from 'xstate';
import * as graph from 'xstate/graph';
import type { AdjacencyMap, StatePath, TraversalOptions } from 'xstate/graph';
import type { DelayEvent } from './model-edges';
import type { ModelOptions, ModelPaths } from './model-types';
import type { ModelWalk, SnapshotOf } from './model-walk';

type AnyOptions = TraversalOptions<AnyMachineSnapshot, EventObject, unknown>;

type AnyPath = StatePath<AnyMachineSnapshot, EventObject>;

const isPrefixOf = (path: AnyPath, other: AnyPath): boolean =>
  path.steps.every((step, index) =>
    isDeepStrictEqual(step.event, other.steps[index]?.event),
  );

// The paths that are not a prefix of another, as TestModel keeps them.
function terminalPaths(paths: AnyPath[]): AnyPath[] {
  const ranked = [...paths].sort(
    (left, right) => right.steps.length - left.steps.length,
  );

  return ranked.filter(
    (path, index) =>
      !ranked.slice(0, index).some((other) => isPrefixOf(path, other)),
  );
}

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
  walk: { search: 'shortest' | 'simple'; prefixes?: boolean },
): AnyPath[] {
  const search =
    walk.search === 'shortest' ? graph.getShortestPaths : graph.getSimplePaths;

  const paths = search(machine, options);

  return walk.prefixes ? paths : terminalPaths(paths);
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
