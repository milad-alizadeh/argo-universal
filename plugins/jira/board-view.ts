import type { LoaderInput } from '@argo/plugin-kit';
import type { JiraStatus } from './issue-fields';
import type { JiraReads } from './jira-reads';
import type { ProjectView } from './jira-setup';
import type { IssuesState } from './view-frame';

type Step = { read: LoaderInput['read']; reads: JiraReads; projectId: string };

type Issues = Extract<ProjectView, { kind: 'issues' }>;

/*
 * The Jira project's statuses, the board's columns. When Jira does not list them, the board still draws the statuses
 * its issues are in and may move to, so a failed read never hides a card.
 */
async function statusesOf(
  { read, reads, projectId }: Step,
  { site, project }: Issues,
): Promise<JiraStatus[]> {
  const target = { projectId, cloudId: site.cloudId, projectKey: project.key };
  const answer = await read(reads.statuses(target));

  return answer.ok ? answer.value : [];
}

// Only the board reads the statuses; the list and every other step need none.
export const boardStatuses = async (
  step: Step,
  { view: shown }: IssuesState,
  view: ProjectView,
): Promise<JiraStatus[]> =>
  shown === 'board' && view.kind === 'issues' ? statusesOf(step, view) : [];
