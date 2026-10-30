import type { EventObject, Snapshot } from 'xstate';
import {
  adjacencyMapToArray,
  type StatePath,
  type TestModel,
} from 'xstate/graph';

// More paths than this means a split or a filter.
const maximumPathCount = 1000;

type Walk<TSnapshot extends Snapshot<unknown>, TEvent extends EventObject> = {
  // The adjacency of every model is unioned; each of its edges must be walked.
  models: Pick<TestModel<TSnapshot, TEvent, unknown>, 'getAdjacencyMap'>[];
  // Every path the file walks, whatever generated it.
  paths: StatePath<TSnapshot, TEvent>[];
  // Each file keeps its own keys: they encode what its machine counts as the same state and event.
  stateKey: (snapshot: TSnapshot) => string;
  eventKey: (event: TEvent) => string;
};

type Key<TSnapshot, TEvent> = (
  from: TSnapshot,
  event: TEvent,
  to: TSnapshot,
) => string;

function pathEdges<
  TSnapshot extends Snapshot<unknown>,
  TEvent extends EventObject,
>(path: StatePath<TSnapshot, TEvent>, key: Key<TSnapshot, TEvent>): string[] {
  return path.steps.slice(1).map((step, index): string => {
    const from = path.steps[index];

    if (!from) throw new Error('A path step has no previous step.');

    return key(from.state, step.event, step.state);
  });
}

function modelEdges<
  TSnapshot extends Snapshot<unknown>,
  TEvent extends EventObject,
>(
  models: Walk<TSnapshot, TEvent>['models'],
  key: Key<TSnapshot, TEvent>,
): Set<string> {
  return new Set(
    models.flatMap((model): string[] =>
      adjacencyMapToArray(model.getAdjacencyMap()).map(
        ({ state, event, nextState }): string => key(state, event, nextState),
      ),
    ),
  );
}

function assertWalk(paths: number, edges: number): void {
  if (edges === 0) throw new Error('The models have no transitions to walk.');

  if (paths >= maximumPathCount)
    throw new Error(
      `${paths} paths reach the cap of ${maximumPathCount}; split the model or filter its events.`,
    );
}

// Each transition of the models that no path walks, as "from event to"; a test expects none.
export function unwalkedTransitions<
  TSnapshot extends Snapshot<unknown>,
  TEvent extends EventObject,
>({ models, paths, stateKey, eventKey }: Walk<TSnapshot, TEvent>): string[] {
  const key = (from: TSnapshot, event: TEvent, to: TSnapshot): string =>
    `${stateKey(from)} ${eventKey(event)} ${stateKey(to)}`;

  const edges = modelEdges(models, key);

  const walked = new Set(
    paths.flatMap((path): string[] => pathEdges(path, key)),
  );

  assertWalk(paths.length, edges.size);

  return [...edges].filter((edge): boolean => !walked.has(edge));
}
