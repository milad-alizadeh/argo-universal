import { useCallback } from '@argo/plugin-kit';
import { githubError } from './github-errors';
import type { Issue, IssueStatus } from './github-issues';
import { openDepsClient, type Project } from './issue-client';
import type { IssueDeps } from './issue-deps';
import { useAsync, type Async } from './use-async';

export type DetailSource = {
  project: Project;
  number: number;
  deps: IssueDeps;
};

// A Session an Agent attached to this Issue, named as the App names it.
export type AttachedSession = {
  sessionId: string;
  title: string;
  branch: string | null;
};

export type IssueDetailState = {
  issue: Issue | null;
  message: string;
  // The Sessions attached to this Issue; empty until they load, and when none are.
  sessions: AttachedSession[];
  // Shows the new status at once, and the old one again when the Tracker refuses it.
  onStatus: (status: IssueStatus) => Promise<void>;
};

type SetIssue = Async<Issue>['set'];

export function useIssueDetail(source: DetailSource): IssueDetailState {
  const { value, error, set } = useIssue(source);
  const sessions = useAttachedSessions(source);

  const onStatus = useCallback(
    (status: IssueStatus) => changeStatus(source, set, status),
    [source, set],
  );

  return { ...loaded(value, error), sessions: sessions.value ?? [], onStatus };
}

// The Issue once it loads; until then, and when it fails, the line the page shows instead.
const loaded = (
  value: Issue | undefined,
  error: string | undefined,
): Pick<IssueDetailState, 'issue' | 'message'> => ({
  issue: value ?? null,
  message: error ?? 'Loading Issue…',
});

// The Sessions this Plugin stored for the Issue, each named by the App; one that has since gone is left out.
function useAttachedSessions(source: DetailSource): Async<AttachedSession[]> {
  return useAsync(
    useCallback(async () => {
      const { storage, getSession } = source.deps;

      const attached = await storage.issueSessions({
        projectId: source.project.id,
        number: source.number,
      });

      const found = await Promise.all(
        attached.map(({ sessionId }) => namedSession(getSession, sessionId)),
      );

      return found.flat();
    }, [source]),
  );
}

async function namedSession(
  getSession: DetailSource['deps']['getSession'],
  sessionId: string,
): Promise<AttachedSession[]> {
  const session = await getSession(sessionId).catch(() => null);

  if (!session) return [];

  return [{ sessionId, title: session.title, branch: session.branch }];
}

function useIssue(source: DetailSource): Async<Issue> {
  return useAsync(
    useCallback(async () => {
      const client = await openDepsClient(source);

      return client.getIssue(source.number);
    }, [source]),
  );
}

async function changeStatus(
  source: DetailSource,
  setIssue: SetIssue,
  status: IssueStatus,
): Promise<void> {
  const showStatus = (to: IssueStatus): void =>
    setIssue((issue) => issue && { ...issue, status: to });

  showStatus(status);

  try {
    await sendStatus(source, status);
  } catch (error) {
    showStatus(status === 'open' ? 'closed' : 'open');
    throw new Error(githubError(error));
  }
}

async function sendStatus(
  source: DetailSource,
  status: IssueStatus,
): Promise<void> {
  const client = await openDepsClient(source);

  await client.setStatus(source.number, status);
  source.deps.changes.publish(source.number);
}
