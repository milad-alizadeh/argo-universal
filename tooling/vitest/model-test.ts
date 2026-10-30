import type { AnyStateMachine, EventObject } from 'xstate';
import { modelCase } from './model-case';
import { unwalkedTransitions } from './model-coverage';
import { traversalOptions, walkEvents } from './model-options';
import { adjacencyOf, searchPaths } from './model-search';
import { stateKey } from './model-state';
import type {
  Model,
  Modelled,
  ModelActor,
  ModelEvent,
  ModelGraph,
  ModelOptions,
  ModelPaths,
  ModelSuite,
  ModelWalk,
  Walked,
} from './model-types';
import { requireDrivers } from './model-validate';

export { describeModel } from './model-describe';

export type { DelayEvent, ModelFixture } from './model-edges';

export type {
  DeclaredDelay,
  Model,
  ModelActor,
  ModelCase,
  ModelGraph,
  ModelSuite,
  ModelWalk,
  Vertex,
} from './model-types';

interface Search<TMachine extends AnyStateMachine, TEvent extends EventObject> {
  walk: ModelWalk<TMachine, TEvent>;
  events: ModelEvent<TEvent>[];
  options: ModelOptions<TMachine, TEvent>;
  paths: ModelPaths<TMachine, TEvent>;
}

function search<TMachine extends AnyStateMachine, TEvent extends EventObject>(
  walked: Walked<TMachine, TEvent>,
): Search<TMachine, TEvent> {
  const events = walkEvents(walked);
  const options = traversalOptions({ ...walked, events });
  const { machine, walk } = walked;

  return { walk, events, options, paths: searchPaths(machine, options, walk) };
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
    stateKey: (snapshot): string => stateKey(snapshot.value),
    eventKey: (event): string => event.type,
  });
}

function suiteOf<TMachine extends AnyStateMachine, TEvent extends EventObject>(
  modelled: Modelled<TMachine, TEvent>,
  { walk, paths }: Search<TMachine, TEvent>,
): ModelSuite {
  return {
    name: walk.name,
    cases: paths.map((path) => modelCase(modelled, path)),
  };
}

function modelOf<TMachine extends AnyStateMachine, TEvent extends EventObject>(
  modelled: Modelled<TMachine, TEvent>,
): Model {
  const { machine, graph, actor } = modelled;
  const searches = graph.walks.map((walk) => search({ machine, graph, walk }));

  for (const { events } of searches) requireDrivers(events, actor);

  return {
    suites: searches.map((found) => suiteOf(modelled, found)),
    unwalked: (): string[] => unwalked(machine, searches),
  };
}

// Walks the machine's graph and returns each generated path as a case that drives the real actor, with every state the path enters checked; `describeModel` runs them. A missing fixture, executor or declared delay throws here.
export function modelTest<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
>(
  machine: TMachine,
  graph: ModelGraph<TMachine, TEvent>,
  actor: ModelActor<TMachine, TEvent>,
): Model {
  return modelOf({ machine, graph, actor });
}
