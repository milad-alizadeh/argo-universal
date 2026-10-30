import type {
  SessionSubagentsInput,
  SessionSubagentsOutput,
  SessionBranchesInput,
  SessionBranchesOutput,
} from '@repo/contracts';
import { listComparisonBranches } from '@repo/git';
import type { SessionSources } from './session-sources';
import { createSubagentsReader } from './subagents';

type ReaderSources = Pick<
  SessionSources,
  'readSession' | 'database' | 'findFeed' | 'findWriter'
>;

export async function listSessionBranches(
  sources: ReaderSources,
  { sessionId }: SessionBranchesInput,
): Promise<SessionBranchesOutput> {
  const session = sources.readSession(sessionId);

  return { branches: await listComparisonBranches(session.checkout.path) };
}

export function createSessionAgentReader(
  sources: ReaderSources,
): (params: SessionSubagentsInput) => SessionSubagentsOutput {
  const readSubagents = createSubagentsReader(sources);

  return ({ sessionId }): SessionSubagentsOutput => {
    sources.readSession(sessionId);

    return readSubagents(sessionId);
  };
}
