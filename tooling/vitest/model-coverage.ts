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
  // biome-ignore lint/suspicious/noExplicitAny: a model's input type does not matter here.
  models: TestModel<TSnapshot, TEvent, any>[];
  // Every path the file walks, whatever generated it.
  paths: StatePath<TSnapshot, TEvent>[];
  // Each file keeps its own keys: they encode what its machine counts as the same state and event.
  stateKey: (snapshot: TSnapshot) => string;
  eventKey: (event: TEvent) => string;
};

// Each transition of the models that no path walks, as "from event to"; a test expects none.
export function unwalkedTransitions<
  TSnapshot extends Snapshot<unknown>,
  TEvent extends EventObject,
>({ models, paths, stateKey, eventKey }: Walk<TSnapshot, TEvent>): string[] {
  const key = (from: TSnapshot, event: TEvent, to: TSnapshot) =>
    `${stateKey(from)} ${eventKey(event)} ${stateKey(to)}`;
  const edges = new Set(
    models.flatMap((model) =>
      adjacencyMapToArray(model.getAdjacencyMap()).map(
        ({ state, event, nextState }) => key(state, event, nextState),
      ),
    ),
  );
  const walked = new Set(
    paths.flatMap((path) =>
      path.steps.slice(1).map((step, index) => {
        const from = path.steps[index];
        if (!from) throw new Error('A path step has no previous step.');
        return key(from.state, step.event, step.state);
      }),
    ),
  );
  if (edges.size === 0)
    throw new Error('The models have no transitions to walk.');
  if (paths.length >= maximumPathCount)
    throw new Error(
      `${paths.length} paths reach the cap of ${maximumPathCount}; split the model or filter its events.`,
    );
  return [...edges].filter((edge) => !walked.has(edge));
}
