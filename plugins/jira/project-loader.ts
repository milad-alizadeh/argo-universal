import type { Argo, ListPage, LoaderInput } from '@argo/plugin-kit';
import { boardStatuses, type BoardStatus } from './board-view';
import type { ListedItem } from './issue-pages';
import { filtersOf } from './jira-filters';
import { projectIdOf } from './jira-paths';
import type { JiraReads, Reading } from './jira-reads';
import {
  listIssues,
  loadProjectView,
  type ProjectView,
  type Step,
} from './jira-setup';
import type { ArgoProject } from './project-rows';
import type { IssuesState } from './view-frame';

// `statuses` are the board's columns, read only while the issues show as a board.
export type ProjectData = {
  projects: ArgoProject[];
  view: ProjectView;
  statuses: BoardStatus[];
};

type IssuesInput = LoaderInput<IssuesState>;

const stepOf = (reads: JiraReads, input: IssuesInput): Step => ({
  read: input.read,
  reads,
  projectId: projectIdOf(input),
  filters: filtersOf(input.state),
});

async function loadProject(
  argo: Argo,
  reads: JiraReads,
  input: IssuesInput,
): Promise<ProjectData> {
  const step = stepOf(reads, input);

  const [projects, view] = await Promise.all([
    argo.projects.list(),
    loadProjectView(step),
  ]);

  const statuses = await boardStatuses(step, input.state, view);

  return { projects, view, statuses };
}

// The step the Project is at, read again by the list through the same kept Queries, then one page of its issues.
async function listProject(
  reading: Reading,
  reads: JiraReads,
  { input, cursor }: { input: IssuesInput; cursor: string | null },
): Promise<ListPage<ListedItem>> {
  const step = stepOf(reads, input);
  const view = await loadProjectView(step);

  return listIssues(reading, { step, view }, cursor);
}

type ProjectLoader = {
  load: (input: IssuesInput) => Promise<ProjectData>;
  list: (
    input: IssuesInput,
    cursor: string | null,
  ) => Promise<ListPage<ListedItem>>;
};

/*
 * The issues page's Loader and paged list (ADR-0050): the Loader reads the step the Project is at and who the
 * assignee filter offers, and the list reads the issues a page at a time, for the filters the Page state holds.
 */
export const projectLoader = (
  reading: Reading,
  reads: JiraReads,
): ProjectLoader => ({
  load: (input) => loadProject(reading.argo, reads, input),
  list: (input, cursor) => listProject(reading, reads, { input, cursor }),
});
