import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import { getAdjacencyMap } from '@repo/vitest/model-graph';
import { describe, expect, it } from 'vitest';
import { matchesState } from 'xstate';
import type { AdjacencyMap, StatePath } from 'xstate/graph';
import { machine, type WriterSnapshot } from './writer-fixture.mocks';
import { executors, expectRefusals, states } from './writer-model-checks.mocks';
import {
  budgetOptions,
  shortestPaths,
  simplePaths,
  type WriterEvent,
} from './writer-model.mocks';

const title = (path: StatePath<WriterSnapshot, WriterEvent>): string =>
  path.steps
    .map(({ event }): string =>
      `${event.type}${event.job?.refusable ? ' refusable' : ''}`
        .replace(/^xstate\.after\.(\w+)\..*$/, 'after $1')
        .replace(/^xstate\.(done|error)\.actor\.(\w+)$/, '$2 $1'),
    )
    .join(' → ');

describe('database writer model', (): void => {
  describe.each([
    ['shortest path', shortestPaths],
    ['simple path', simplePaths],
  ])('%s', (_, paths): void => {
    it.each(
      paths.map(
        (path): [string, StatePath<WriterSnapshot, WriterEvent>] =>
          [title(path), path] as const,
      ),
    )('%s', async (_, path): Promise<void> => {
      expect.hasAssertions();
      await walkPath(path);
    });
  });

  it('the generated paths walk every transition', (): void => {
    expect(
      unwalkedTransitions({
        models: [
          {
            getAdjacencyMap: (): AdjacencyMap<WriterSnapshot, WriterEvent> =>
              getAdjacencyMap(machine, budgetOptions),
          },
        ],
        paths: [...shortestPaths, ...simplePaths],
        stateKey: (snapshot): string => JSON.stringify(snapshot.value),
        eventKey: (event): typeof event.type => event.type,
      }),
    ).toEqual([]);
  });
});

async function walkPath(
  path: StatePath<WriterSnapshot, WriterEvent>,
): Promise<void> {
  for (const step of path.steps) {
    const execute = executors[step.event.type];

    if (!execute) throw new Error(`No Writer executor for ${step.event.type}`);
    await execute(step);
    expectRefusals();

    assertModelState(step.state);
  }
}

function assertModelState(snapshot: WriterSnapshot): void {
  for (const [key, assertState] of Object.entries(states)) {
    if (matchesState(key, snapshot.value)) assertState(snapshot);
  }
}
