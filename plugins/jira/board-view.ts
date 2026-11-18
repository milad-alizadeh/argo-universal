import { boardColumns } from './board-columns';
import type { JiraStatus } from './issue-fields';
import { targetOf, type Step } from './issue-scope';
import type { ProjectView } from './jira-setup';
import type { IssuesTarget } from './read-scope';
import type { IssuesState } from './view-frame';

export type BoardStatus = JiraStatus & { count?: number };

type Issues = Extract<ProjectView, { kind: 'issues' }>;

const countStatus =
  ({ read, reads, filters }: Step, target: IssuesTarget) =>
  async (status: JiraStatus): Promise<BoardStatus> => {
    const count = await read(
      reads.statusCount({ ...target, filters, statusId: status.id }),
    );

    return count.ok ? { ...status, count: count.value } : status;
  };

async function statusesOf(
  step: Step,
  { site, project }: Issues,
): Promise<BoardStatus[]> {
  const target = targetOf(step, site, project);
  const answer = await step.read(step.reads.statuses(target));

  return answer.ok
    ? Promise.all(boardColumns(answer.value, []).map(countStatus(step, target)))
    : [];
}

export const boardStatuses = async (
  step: Step,
  { view: shown }: IssuesState,
  view: ProjectView,
): Promise<BoardStatus[]> =>
  shown === 'board' && view.kind === 'issues' ? statusesOf(step, view) : [];
