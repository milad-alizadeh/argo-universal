import type {
  SessionSubagentsInput,
  SessionSubagentsOutput,
  SessionBranchesInput,
  SessionBranchesOutput,
} from '@repo/contracts';
import { listComparisonBranches } from '@repo/git';
import type { SessionRouterDeps } from './router-deps';
import { createSubagentsReader } from './subagents';

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
