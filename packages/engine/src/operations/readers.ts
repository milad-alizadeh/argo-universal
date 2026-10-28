import type { readerOperations } from '@repo/contracts/operations';
import { createAgentMessageReader } from '../feed';
import {
  createSessionAgentReader,
  createSessionSnapshotReader,
  listSessionShells,
  listSessionBranches,
  readSessionChanges,
  readSessionDiff,
  type SessionList,
} from '../sessions';
import type { OperationImplementations, OperationsDeps } from './operations';

type HistoryId =
  | 'session.list'
  | 'session.get'
  | 'session.feed'
  | 'session.changes'
  | 'session.diff';

type DiscoveryReads = Pick<
  OperationImplementations,
  Exclude<keyof typeof readerOperations, HistoryId>
>;

export function createReadOperations(
  deps: OperationsDeps,
  sessionList: SessionList,
): Pick<OperationImplementations, keyof typeof readerOperations> {
  return {
    ...historyReads(deps, sessionList),
    ...discoveryReads(deps),
  };
}

function historyReads(
  deps: OperationsDeps,
  sessionList: SessionList,
): Pick<OperationImplementations, HistoryId> {
  const readSnapshot = createSessionSnapshotReader(deps);
  const readMessages = createAgentMessageReader(deps);

  return {
    'session.diff': (input) => readSessionDiff(deps, input),
    'session.changes': (input) => readSessionChanges(deps, input),
    'session.feed': async (input) => readMessages(input),
    'session.get': async (input) => readSnapshot(input),
    'session.list': (input) => sessionList.list(input),
  };
}

function discoveryReads(deps: OperationsDeps): DiscoveryReads {
  const listAgents = createSessionAgentReader(deps);

  return {
    'session.listAgents': async (input) => listAgents(input),
    'session.listShells': async (input) =>
      listSessionShells(deps, input.sessionId),
    'session.listBranches': (input) => listSessionBranches(deps, input),
  };
}
