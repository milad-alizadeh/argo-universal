import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import {
  getAdjacencyMap,
  getShortestPaths,
  getSimplePaths,
} from '@repo/vitest/model-graph';
import { terminalPaths } from '@repo/vitest/model-paths';
import { describe, expect, it } from 'vitest';
import { matchesState } from 'xstate';
import type { AdjacencyMap, StatePath } from 'xstate/graph';
import { executors, states } from './machine-model-checks.mocks';
import {
  machine,
  options,
  type SupervisorSnapshot,
  type SupervisorEvent,
} from './machine-model.mocks';

const title = (path: StatePath<SupervisorSnapshot, SupervisorEvent>): string =>
  path.steps
    .map(({ event }): string =>
      event.type.replace(/^xstate\.after\.(\w+)\..*$/, 'after $1'),
    )
    .join(' → ');

describe('supervisor model', (): void => {
  const shortestPaths = terminalPaths(getShortestPaths(machine, options));

  const simplePaths = terminalPaths(
    getSimplePaths(machine, {
      ...options,
      stopWhen: (snapshot): boolean => snapshot.context.crashTimes.length >= 2,
    }),
  );

  describe.each([
    ['shortest path', shortestPaths],
    ['simple path, up to two crashes', simplePaths],
  ])('%s', (_, paths): void => {
    it.each(
      paths.map(
        (path): [string, StatePath<SupervisorSnapshot, SupervisorEvent>] =>
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
            getAdjacencyMap: (): AdjacencyMap<
              SupervisorSnapshot,
              SupervisorEvent
            > => getAdjacencyMap(machine, options),
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
  path: StatePath<SupervisorSnapshot, SupervisorEvent>,
): Promise<void> {
  for (const step of path.steps) {
    const execute = executors.get(step.event.type);

    if (!execute)
      throw new Error(`Missing Supervisor executor for ${step.event.type}`);
    await execute(step);

    assertModelState(step.state);
  }
}

function assertModelState(snapshot: SupervisorSnapshot): void {
  for (const [key, assertState] of Object.entries(states)) {
    if (matchesState(key, snapshot.value)) assertState(snapshot);
  }
}
