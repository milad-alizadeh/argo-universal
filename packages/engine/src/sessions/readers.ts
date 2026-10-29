import type {
  SessionSubagentsInput,
  SessionSubagentsOutput,
  SessionBranchesInput,
  SessionBranchesOutput,
} from '@repo/contracts';
import { listComparisonBranches } from '@repo/git';
import type { OpenSessions } from './open-sessions';
import { createSubagentsReader } from './subagents';

export async function listSessionBranches(
  open: OpenSessions,
  { sessionId }: SessionBranchesInput,
): Promise<SessionBranchesOutput> {
  const session = open.readSession(sessionId);

  return { branches: await listComparisonBranches(session.checkout.path) };
}

export function createSessionAgentReader(
  open: OpenSessions,
): (params: SessionSubagentsInput) => SessionSubagentsOutput {
  const readSubagents = createSubagentsReader(open);

  return ({ sessionId }): SessionSubagentsOutput => {
    open.readSession(sessionId);

    return readSubagents(sessionId);
  };
}
