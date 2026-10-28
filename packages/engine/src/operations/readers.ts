import type { readerOperations } from '@repo/contracts/operations';
import { createAgentMessageReader } from '../feed';
import { listProjectBranches } from '../projects';
import {
  createSessionAgentReader,
  createSessionSnapshotReader,
  listSessionShells,
  listSessionBranches,
  readSessionChanges,
  readSessionDiff,
  type SessionRouterDeps,
  type SessionList,
} from '../sessions';
import type { OperationImplementations } from './operations';

export function createReadOperations(
  deps: SessionRouterDeps,
  sessionList: SessionList,
): Pick<OperationImplementations, keyof typeof readerOperations> {
  const listAgents = createSessionAgentReader(deps);
  const readSnapshot = createSessionSnapshotReader(deps);
  const readMessages = createAgentMessageReader(deps);

  return {
    'session.diff': (input) => readSessionDiff(deps, input),
    'session.changes': (input) => readSessionChanges(deps, input),
    'session.feed': async (input) => readMessages(input),
    'session.get': async (input) => readSnapshot(input),
    'session.list': (input) => sessionList.list(input),
    'session.listAgents': async (input) => listAgents(input),
    'session.listShells': async (input) =>
      listSessionShells(deps, input.sessionId),
    'session.listBranches': (input) => listSessionBranches(deps, input),
    'project.listBranches': (input) =>
      listProjectBranches(deps.database, input),
  };
}
