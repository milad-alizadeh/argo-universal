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

export type IssueDetailState = {
  issue: Issue | null;
  message: string;
  // Shows the new status at once, and the old one again when the Tracker refuses it.
  onStatus: (status: IssueStatus) => Promise<void>;
};

type SetIssue = Async<Issue>['set'];

export function useIssueDetail(source: DetailSource): IssueDetailState {
  const { value, error, set } = useIssue(source);

  const onStatus = useCallback(
    (status: IssueStatus) => changeStatus(source, set, status),
    [source, set],
  );

  return {
    issue: value ?? null,
    message: error ?? 'Loading Issue…',
    onStatus,
  };
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
