import { useCallback, useEffect, useState } from '@argo/plugin-kit';
import { githubError } from './github-errors';
import type { Issue, IssueStatus } from './github-issues';
import { openClient, type Project } from './issue-client';
import type { IssueDeps } from './issue-deps';

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

type SetIssue = (update: (issue: Issue | null) => Issue | null) => void;

export function useIssueDetail(source: DetailSource): IssueDetailState {
  const [issue, setIssue] = useState<Issue | null>(null);
  const [message, setMessage] = useState('Loading Issue…');

  useEffect(() => {
    void showIssue(source, { setIssue, setMessage });
  }, [source]);

  const onStatus = useCallback(
    (status: IssueStatus) => changeStatus(source, setIssue, status),
    [source],
  );

  return { issue, message, onStatus };
}

type Setters = { setIssue: SetIssue; setMessage: (message: string) => void };

async function showIssue(
  source: DetailSource,
  { setIssue, setMessage }: Setters,
): Promise<void> {
  try {
    const client = await openClient({ ...source, ...source.deps });
    const issue = await client.getIssue(source.number);

    setIssue(() => issue);
  } catch (error) {
    setMessage(githubError(error));
  }
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
  const client = await openClient({ ...source, ...source.deps });

  await client.setStatus(source.number, status);
  source.deps.changes.publish(source.number);
}
