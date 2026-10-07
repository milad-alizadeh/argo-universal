import { expect } from 'vitest';
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

export function expectEveryTransitionWalked<
  TSnapshot extends Snapshot<unknown>,
  TEvent extends EventObject,
>({ models, paths, stateKey, eventKey }: Walk<TSnapshot, TEvent>): void {
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
  expect(edges.size).toBeGreaterThan(0);
  expect([...edges].filter((edge) => !walked.has(edge))).toEqual([]);
  expect(paths.length).toBeLessThan(maximumPathCount);
}
