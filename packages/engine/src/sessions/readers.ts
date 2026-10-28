import type {
  SessionSubagentsInput,
  SessionSubagentsOutput,
  SessionBranchesInput,
  SessionBranchesOutput,
  SessionGetInput,
  SessionGetOutput,
} from '@repo/contracts';
import { listComparisonBranches } from '@repo/git';
import { findMachineActor } from '../lib/machine-actor';
import { readDefaultChangesSummary } from './changes-summary';
import type { SessionRouterDeps } from './router-deps';
import { sessionMachine } from './session-machine';
import { sessionActorId } from './session-system';
import { SessionSnapshotReader } from './snapshot/reader';
import { createSubagentsReader } from './subagents';

export function createSessionSnapshotReader(
  deps: SessionRouterDeps,
): (input: SessionGetInput) => Promise<SessionGetOutput> {
  const reader = new SessionSnapshotReader(deps);

  return async ({ sessionId }): Promise<SessionGetOutput> => {
    const snapshot = reader.read(
      sessionId,
      findMachineActor(
        deps.sessions.system,
        sessionActorId(sessionId),
        sessionMachine,
      ),
    ).snapshot;

    if (deps.findFeed(sessionId)) return snapshot;

    try {
      return {
        ...snapshot,
        changes: await readDefaultChangesSummary(
          deps.database,
          snapshot.projectId,
          snapshot.checkout.path,
        ),
      };
    } catch (error) {
      console.error(
        `Session ${sessionId}: stored Checkout totals unread`,
        error,
      );

      return snapshot;
    }
  };
}

export async function listSessionBranches(
  deps: Pick<SessionRouterDeps, 'readSession'>,
  { sessionId }: SessionBranchesInput,
): Promise<SessionBranchesOutput> {
  const session = deps.readSession(sessionId);

  return { branches: await listComparisonBranches(session.checkout.path) };
}

export function createSessionAgentReader(
  deps: SessionRouterDeps,
): (params: SessionSubagentsInput) => SessionSubagentsOutput {
  const readSubagents = createSubagentsReader(deps);

  return ({ sessionId }): SessionSubagentsOutput => {
    deps.readSession(sessionId);

    return readSubagents(sessionId);
  };
}
