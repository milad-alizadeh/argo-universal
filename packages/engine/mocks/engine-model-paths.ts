import { terminalPaths } from '@repo/vitest/model-paths';
import { type StatePath, getShortestPaths } from 'xstate/graph';
import { type EngineEvent } from './engine-model-events';
import { options } from './engine-model-graph';
import { machine, type EngineSnapshot } from './engine-model-logic';

export const paths = terminalPaths(getShortestPaths(machine, options));

export const title = (path: StatePath<EngineSnapshot, EngineEvent>): string =>
  path.steps
    .map(({ event }): string =>
      event.type
        .replace(/^xstate\.after\.(\w+)\..*$/, 'after $1')
        .replace(/^xstate\.(done|error)\.actor\.(\w+)$/, '$2 $1'),
    )
    .join(' → ');
