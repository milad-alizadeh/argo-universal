import type { SessionList } from './list/session-list';
import { createNativeStarts, type NativeStarts } from './native-starts';
import { createOperationCalls, type OperationCalls } from './operation-call';
import type { SessionRouterDeps } from './router-deps';
import {
  createSessionCommands,
  type SessionCommands,
} from './session-commands';
import {
  createSessionDirectory,
  type SessionDirectory,
} from './session-directory';
import { createSessionReads, type SessionReads } from './session-reads';
import { createSessionWorkSource, type SessionWorkSource } from './work-source';

// What Operations reach Sessions through, so they never hold what Sessions run with.
export type SessionPorts = {
  directory: SessionDirectory;
  work: SessionWorkSource;
  calls: OperationCalls;
  commands: SessionCommands;
  reads: SessionReads;
  starts: NativeStarts;
};

export function createSessionPorts(
  deps: SessionRouterDeps,
  sessionList: SessionList,
): SessionPorts {
  return {
    directory: createSessionDirectory(deps),
    work: createSessionWorkSource(deps),
    calls: createOperationCalls(deps),
    commands: createSessionCommands(deps),
    reads: createSessionReads(deps, sessionList),
    starts: createNativeStarts(deps),
  };
}
