import type { AnyStateMachine, EventObject } from 'xstate';
import { modelCase } from './model-case';
import { unwalkedTransitions } from './model-coverage';
import { traversalOptions } from './model-options';
import { adjacencyOf, searchPaths } from './model-search';
import type {
  Model,
  ModelOptions,
  ModelPaths,
  ModelSpec,
  ModelWalk,
  Walked,
} from './model-types';

export type { DelayEvent } from './model-edges';

export type {
  Model,
  ModelCase,
  ModelSpec,
  ModelSuite,
  ModelWalk,
  Vertex,
} from './model-types';

interface Search<TMachine extends AnyStateMachine, TEvent extends EventObject> {
  walk: ModelWalk<TMachine, TEvent>;
  options: ModelOptions<TMachine, TEvent>;
  paths: ModelPaths<TMachine, TEvent>;
}

function search<TMachine extends AnyStateMachine, TEvent extends EventObject>(
  walked: Walked<TMachine, TEvent>,
): Search<TMachine, TEvent> {
  const options = traversalOptions(walked);
  const { machine, walk } = walked;

  return { walk, options, paths: searchPaths(machine, options, walk) };
}

function unwalked<TMachine extends AnyStateMachine, TEvent extends EventObject>(
  machine: TMachine,
  searches: Search<TMachine, TEvent>[],
): string[] {
  return unwalkedTransitions({
    models: searches.map(({ options }) => ({
      getAdjacencyMap: () => adjacencyOf(machine, options),
    })),
    paths: searches.flatMap(({ paths }) => paths),
    stateKey: (snapshot): string => JSON.stringify(snapshot.value),
    eventKey: (event): string => event.type,
  });
}

// Walks the machine's graph and returns each generated path as a case that drives the real actor, with every state the path enters checked; a test file runs them under `describe` and `it`.
export function modelTest<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
>(machine: TMachine, spec: ModelSpec<TMachine, TEvent>): Model {
  const searches = spec.walks.map((walk) =>
    search({ machine, model: spec, walk }),
  );

  return {
    suites: searches.map(({ walk, paths }) => ({
      name: walk.name,
      cases: paths.map((path) => modelCase(spec, path)),
    })),
    unwalked: (): string[] => unwalked(machine, searches),
  };
}
