import { useCallback, useMemo, useState } from '@argo/plugin-kit';
import { issueQuery, mapIssueDetail } from './github-documents';
import type { Issue, IssueStatus } from './github-issues';
import { githubRepositoryFromOrigin } from './github-repository';
import { setIssueStatus } from './github-write';
import { useRecentStatuses } from './issue-changes';
import type { IssueDeps } from './issue-deps';
import { noRemoteMessage, type Project } from './issue-project';
import { useCall } from './use-call';
import {
  readMessage,
  signInNeed,
  useGitHub,
  type SignInNeed,
} from './use-github';

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
  // The Issue as far as it is known: the row's title and status at once, the whole Issue once GitHub answers.
  issue: Issue | null;
  // Whether `issue` is GitHub's own answer, or still only what the row said.
  settled: boolean;
  message: string;
  // The Sessions attached to this Issue; empty until they load, and when none are.
  sessions: AttachedSession[];
  // Shows the new status at once, and the old one again when GitHub refuses it.
  onStatus: (status: IssueStatus) => Promise<void>;
  signIn: SignInNeed | null;
  refresh: () => Promise<void>;
};

export function useIssueDetail(source: DetailSource): IssueDetailState {
  const { project, number, deps } = source;
  const repository = githubRepositoryFromOrigin(project.originUrl);

  const query = useMemo(
    () => (repository ? issueQuery(repository, number) : null),
    [repository, number],
  );

  const { read, refresh } = useGitHub(
    { projectId: project.id, query },
    mapIssueDetail,
  );

  const [shownStatus, showStatus] = useState<IssueStatus>();
  const recent = useRecentStatuses(deps.changes);
  const sessions = useAttachedSessions(source);

  const onStatus = useCallback(
    async (status: IssueStatus): Promise<void> => {
      if (!repository) throw new Error(noRemoteMessage);

      showStatus(status);

      try {
        await setIssueStatus(deps.fetch, {
          repository,
          number,
          status,
          projectId: project.id,
        });
      } catch (cause) {
        showStatus(undefined);
        throw cause;
      }

      deps.changes.publish(number, status);
      await refresh().catch(() => undefined);
      showStatus(undefined);
    },
    [deps, project.id, repository, number, refresh],
  );

  const base =
    read.kind === 'ok' ? read.value : deps.seeds.of(project.id, number);
  const status = shownStatus ?? recent.get(number);

  return {
    issue: base ? { ...base, status: status ?? base.status } : null,
    settled: read.kind === 'ok',
    message: repository ? (readMessage(read) ?? '') : noRemoteMessage,
    sessions: sessions.value ?? [],
    onStatus,
    signIn: query ? signInNeed(read) : null,
    refresh,
  };
}

// The Sessions this Plugin stored for the Issue, each named by the App; one that has since gone is left out.
function useAttachedSessions({
  project,
  number,
  deps,
}: DetailSource): ReturnType<typeof useCall<AttachedSession[]>> {
  const { storage, getSession } = deps;

  return useCall(
    useCallback(async () => {
      const attached = await storage.issueSessions({
        projectId: project.id,
        number,
      });

      const found = await Promise.all(
        attached.map(({ sessionId }) => namedSession(getSession, sessionId)),
      );

      return found.flat();
    }, [storage, getSession, project.id, number]),
  );
}

async function namedSession(
  getSession: IssueDeps['getSession'],
  sessionId: string,
): Promise<AttachedSession[]> {
  const session = await getSession(sessionId).catch(() => null);

  if (!session) return [];

  return [{ sessionId, title: session.title, branch: session.branch }];
}
