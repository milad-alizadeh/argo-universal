import { useState } from '@argo/plugin-kit';
import type { IssueStatus } from './github-issues';
import { setIssueStatus } from './github-write';
import { useRecentStatuses } from './issue-changes';
import type { IssueDeps } from './issue-deps';
import { noRemoteMessage, type Project } from './issue-project';

type StatusContext = {
  deps: IssueDeps;
  projectId: string;
  number: number;
  refresh: () => Promise<void>;
  show: (status: IssueStatus | null) => void;
};

// Shows the new status at once and takes it back when GitHub refuses it.
async function send(
  context: StatusContext,
  change: { repository: string; status: IssueStatus },
): Promise<void> {
  const { deps, projectId, number, show } = context;

  show(change.status);

  try {
    await setIssueStatus(deps.fetch, { ...change, number, projectId });
  } catch (cause) {
    show(null);
    throw cause;
  }
}

async function changeStatus(
  context: StatusContext,
  repository: string | null,
  status: IssueStatus,
): Promise<void> {
  if (!repository) throw new Error(noRemoteMessage);

  await send(context, { repository, status });
  context.deps.changes.publish(context.number, status);
  await context.refresh().catch(() => null);
  context.show(null);
}

export type StatusChange = {
  // The status to show over GitHub's answer: the one just chosen, or one changed on another page.
  status: IssueStatus | null | undefined;
  onStatus: (status: IssueStatus) => Promise<void>;
};

type Target = { project: Pick<Project, 'id'>; number: number; deps: IssueDeps };

type Reading = { repository: string | null; refresh: () => Promise<void> };

export function useStatusChange(
  { project, number, deps }: Target,
  { repository, refresh }: Reading,
): StatusChange {
  const [shown, show] = useState<IssueStatus | null>(null);
  const recent = useRecentStatuses(deps.changes).get(number);
  const context = { deps, projectId: project.id, number, refresh, show };

  const onStatus = (status: IssueStatus): Promise<void> =>
    changeStatus(context, repository, status);

  return { status: shown ?? recent, onStatus };
}
