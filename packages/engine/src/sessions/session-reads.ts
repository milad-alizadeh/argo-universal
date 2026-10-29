import { createAgentMessageReader } from '../feed';
import type { Bound } from '../lib/bound';
import { readSessionChanges, readSessionDiff } from './change-readers';
import type { SessionList } from './list/session-list';
import { createSessionAgentReader, listSessionBranches } from './readers';
import type { SessionRouterDeps } from './router-deps';
import { listSessionShells } from './shells/list';
import { createSessionSnapshotReader } from './snapshot';

// What read Operations read of Sessions, bound to what Sessions read them with.
export type SessionReads = {
  list: SessionList['list'];
  get: ReturnType<typeof createSessionSnapshotReader>;
  feed: ReturnType<typeof createAgentMessageReader>;
  changes: Bound<typeof readSessionChanges>;
  diff: Bound<typeof readSessionDiff>;
  agents: ReturnType<typeof createSessionAgentReader>;
  shells: Bound<typeof listSessionShells>;
  branches: Bound<typeof listSessionBranches>;
};

export function createSessionReads(
  deps: SessionRouterDeps,
  sessionList: SessionList,
): SessionReads {
  return {
    list: (input) => sessionList.list(input),
    get: createSessionSnapshotReader(deps),
    feed: createAgentMessageReader(deps),
    changes: readSessionChanges.bind(null, deps),
    diff: readSessionDiff.bind(null, deps),
    agents: createSessionAgentReader(deps),
    shells: listSessionShells.bind(null, deps),
    branches: listSessionBranches.bind(null, deps),
  };
}
