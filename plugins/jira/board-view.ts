import type { LoaderInput } from '@argo/plugin-kit';
import type { JiraReads } from './jira-reads';
import type { ProjectView } from './jira-setup';
import type { IssuesState } from './view-frame';

type Step = { read: LoaderInput['read']; reads: JiraReads; projectId: string };

type Issues = Extract<ProjectView, { kind: 'issues' }>;

/*
 * The issues as the board draws them: with the Jira project's statuses, its columns. When Jira does not list them, the
 * board still draws the statuses its issues are in and may move to, so a failed read never hides a card.
 */
async function withStatuses(
  { read, reads, projectId }: Step,
  view: Issues,
): Promise<ProjectView> {
  const { site, project } = view;
  const target = { projectId, cloudId: site.cloudId, projectKey: project.key };
  const answer = await read(reads.statuses(target));

  return { ...view, statuses: answer.ok ? answer.value : [] };
}

// Only the board reads the statuses; the list and every other step stand as they are.
export const boardView = (
  step: Step,
  { view: shown }: IssuesState,
  view: ProjectView,
): Promise<ProjectView> | ProjectView =>
  shown === 'board' && view.kind === 'issues' ? withStatuses(step, view) : view;
