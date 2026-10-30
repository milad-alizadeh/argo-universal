import type { AnyStateMachine, EventObject } from 'xstate';
import { modelCase } from './model-case';
import { eventKeyOf, traversalOptions, walkEvents } from './model-options';
import { adjacencyOf, searchPaths } from './model-search';
import { stateKey } from './model-state';
import type {
  Model,
  Modelled,
  ModelActor,
  ModelOptions,
  ModelPaths,
  ModelSuite,
  WalkedGraph,
} from './model-types';
import { unwalkedTransitions } from './model-unwalked';
import { requireDrivers } from './model-validate';
import type { ModelEvent, ModelGraph, ModelWalk, Walked } from './model-walk';

export { describeModel } from './model-describe';

export { firedDelay } from './model-edges';

export type { DelayEvent, ModelFixture } from './model-edges';

export type {
  DeclaredDelay,
  Model,
  ModelActor,
  ModelCase,
  ModelSuite,
  WalkedGraph,
} from './model-types';

export type {
  Arrival,
  ModelGraph,
  ModelWalk,
  SnapshotOf,
  Vertex,
} from './model-walk';

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
  { machine, graph }: Omit<Walked<TMachine, TEvent>, 'walk'>,
  searches: Search<TMachine, TEvent>[],
): string[] {
  const { stateKey: key = (snapshot): string => stateKey(snapshot.value) } =
    graph;

  return unwalkedTransitions({
    models: searches.map(({ options }) => ({
      getAdjacencyMap: () => adjacencyOf(machine, options),
    })),
    paths: searches.flatMap(({ paths }) => paths),
    stateKey: key,
    eventKey: eventKeyOf(graph),
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
    unwalked: (): string[] => unwalked(modelled, searches),
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

// Walks the machine's graph without an actor, for a test that checks the generated paths themselves. A missing fixture throws here.
export function walkGraph<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
>(
  machine: TMachine,
  graph: ModelGraph<TMachine, TEvent>,
): WalkedGraph<TMachine, TEvent> {
  const searches = graph.walks.map((walk) => search({ machine, graph, walk }));

  return {
    paths: searches.flatMap(({ paths }) => paths),
    unwalked: (): string[] => unwalked({ machine, graph }, searches),
  };
}
