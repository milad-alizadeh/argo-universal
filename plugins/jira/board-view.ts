import type { LoaderInput } from '@argo/plugin-kit';
import type { JiraReads } from './jira-reads';
import type { ProjectView } from './jira-setup';

type Step = { read: LoaderInput['read']; reads: JiraReads; projectId: string };

/*
 * The issues as the board draws them: with the Jira project's statuses, its columns. When Jira does not list them, the
 * board still draws the statuses its issues are in and may move to, so a failed read never hides a card.
 */
export async function withStatuses(
  { read, reads, projectId }: Step,
  view: ProjectView,
): Promise<ProjectView> {
  if (view.kind !== 'issues') return view;

  const answer = await read(
    reads.statuses({
      projectId,
      cloudId: view.site.cloudId,
      projectKey: view.project.key,
    }),
  );

  return { ...view, statuses: answer.ok ? answer.value : [] };
}
