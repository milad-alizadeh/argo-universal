import type { Argo, ListPage, LoaderInput } from '@argo/plugin-kit';
import { filtersOf } from './jira-filters';
import { projectIdOf } from './jira-paths';
import type { JiraIssue } from './jira-readers';
import type { JiraReads } from './jira-reads';
import {
  listIssues,
  loadProjectView,
  type ProjectView,
  type Step,
} from './jira-setup';
import type { ArgoProject } from './project-rows';
import type { IssuesState } from './view-frame';

export type ProjectData = { projects: ArgoProject[]; view: ProjectView };

type IssuesInput = LoaderInput<IssuesState>;

type ViewOf = (input: IssuesInput) => Promise<ProjectView>;

const stepOf = (reads: JiraReads, input: IssuesInput): Step => ({
  read: input.read,
  reads,
  projectId: projectIdOf(input),
  filters: filtersOf(input.state),
});

/*
 * A draw's Loader and paged list both need the step the Project is at, with the same input: it is worked out once per
 * draw, so the list's first page is the one the Loader read.
 */
function projectViews(reads: JiraReads): ViewOf {
  const views = new WeakMap<IssuesInput, Promise<ProjectView>>();

  return (input) => {
    const view = views.get(input) ?? loadProjectView(stepOf(reads, input));

    views.set(input, view);

    return view;
  };
}

async function loadProject(
  argo: Argo,
  viewOf: ViewOf,
  input: IssuesInput,
): Promise<ProjectData> {
  const [projects, view] = await Promise.all([
    argo.projects.list(),
    viewOf(input),
  ]);

  return { projects, view };
}

type ProjectLoader = {
  load: (input: IssuesInput) => Promise<ProjectData>;
  list: (
    input: IssuesInput,
    cursor: string | null,
  ) => Promise<ListPage<JiraIssue>>;
};

/*
 * The issues page's Loader and paged list (ADR-0050): the Loader reads the step the Project is at with the list's
 * first page, and the list reads each page after it, for the filters the Page state holds.
 */
export function projectLoader(argo: Argo, reads: JiraReads): ProjectLoader {
  const viewOf = projectViews(reads);

  return {
    load: (input) => loadProject(argo, viewOf, input),
    list: async (input, cursor) =>
      listIssues(stepOf(reads, input), await viewOf(input), cursor),
  };
}
