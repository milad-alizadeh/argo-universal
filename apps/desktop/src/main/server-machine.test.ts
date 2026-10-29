import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import {
  getShortestPaths,
  getSimplePaths,
  getAdjacencyMap,
} from '@repo/vitest/model-graph';
import { terminalPaths } from '@repo/vitest/model-paths';
import { describe, expect, it } from 'vitest';
import { matchesState } from 'xstate';
import type { StatePath, AdjacencyMap } from 'xstate/graph';
import { type ServerEvent } from './server-machine-model-events.mocks';
import { executors } from './server-machine-model-executors.mocks';
import { options, simplePathOptions } from './server-machine-model-graph.mocks';
import { states } from './server-machine-model-states.mocks';
import {
  machine,
  type ServerSnapshot,
  staleAddress,
} from './server-machine.mocks';

describe('server connection model', (): void => {
  const shortestPaths = terminalPaths(getShortestPaths(machine, options));

  const simplePaths = terminalPaths(
    getSimplePaths(machine, {
      ...simplePathOptions,
      filterEvents: (snapshot: ServerSnapshot, event: ServerEvent): boolean =>
        simplePathOptions.filterEvents(snapshot, event) &&
        !event.type.startsWith('counts.'),
    }),
  );

  describe.each([
    ['shortest path', shortestPaths],
    ['simple path', simplePaths],
  ])('%s', (_, paths): void => {
    it.each(
      paths.map(
        (path): [string, StatePath<ServerSnapshot, ServerEvent>] =>
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
            getAdjacencyMap: (): AdjacencyMap<ServerSnapshot, ServerEvent> =>
              getAdjacencyMap(machine, options),
          },
        ],
        paths: [...shortestPaths, ...simplePaths],
        stateKey: (snapshot): string => JSON.stringify(snapshot.value),
        eventKey: (event): typeof event.type => event.type,
      }),
    ).toEqual([]);
  });
});

function addressLabel(value: { pid: number } | null | undefined): string {
  if (value === staleAddress) return 'stale pid 200';

  return value == null ? 'none' : `pid ${value.pid}`;
}

function outputLabel(event: ServerEvent & { output: unknown }): string {
  const value = event.output;

  if (typeof value === 'boolean') return value ? 'running' : 'exited';

  return addressLabel(value);
}

function eventTitle(event: ServerEvent): string {
  const name = event.type
    .replace(/^xstate\.after\.(\w+)\..*$/, 'after $1')
    .replace(/^xstate\.(done|error)\.actor\.(\w+)$/, '$2 $1');

  return 'output' in event ? `${name} (${outputLabel(event)})` : name;
}

function title(path: StatePath<ServerSnapshot, ServerEvent>): string {
  return path.steps.map(({ event }) => eventTitle(event)).join(' → ');
}

async function walkPath(
  path: StatePath<ServerSnapshot, ServerEvent>,
): Promise<void> {
  for (const step of path.steps) {
    const execute = executors.get(step.event.type);

    if (!execute)
      throw new Error(`Missing Server executor for ${step.event.type}`);
    await execute(step);
    assertState(step.state);
  }
}

function assertState(snapshot: ServerSnapshot): void {
  states['*'](snapshot);

  for (const [key, check] of Object.entries(states))
    if (key !== '*') assertMatchingState(key, check, snapshot);
}

function assertMatchingState(
  key: string,
  check: (snapshot: ServerSnapshot) => void,
  snapshot: ServerSnapshot,
): void {
  if (matchesState(key, snapshot.value)) check(snapshot);
}
