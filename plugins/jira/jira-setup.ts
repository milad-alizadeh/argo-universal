import type { ListPage, LoaderInput } from '@argo/plugin-kit';
import type {
  IssuePage,
  JiraFailure,
  JiraIssue,
  JiraPerson,
  JiraProject,
} from './jira-client';
import type { IssueFilters } from './jira-filters';
import type { JiraReads } from './jira-reads';
import {
  storeQueries,
  storeReaders,
  type JiraSite,
  type ProjectChoice,
} from './jira-store';

/*
 * Where one Argo Project stands with Jira, in the order a person meets it: signed out, no site, no Jira project, a
 * failed read, or the project's issues the filters leave. Each step names the next one, and a step with one answer
 * takes it. The issues view holds the list's first page, which tells an empty list from a failed one; the kit's paged
 * list draws it and reads the pages after it.
 */
export type ProjectView =
  | { kind: 'signed-out'; message: string | null }
  | { kind: 'no-site'; sites: JiraSite[] }
  | { kind: 'no-project'; site: JiraSite; projects: JiraProject[] }
  | { kind: 'failed'; site: JiraSite; failure: JiraFailure }
  | {
      kind: 'issues';
      site: JiraSite;
      project: JiraProject;
      page: IssuePage;
      people: JiraPerson[];
    };

type Read = LoaderInput['read'];

type Step = {
  read: Read;
  reads: JiraReads;
  projectId: string;
  filters: IssueFilters;
};

// A chosen site still known, or the only one there is.
function siteFor(sites: JiraSite[], choice: ProjectChoice): JiraSite | null {
  const chosen = sites.find(({ cloudId }) => cloudId === choice.cloudId);

  if (chosen) return chosen;

  return sites.length === 1 ? (sites[0] ?? null) : null;
}

const failedView = (site: JiraSite, failure: JiraFailure): ProjectView =>
  failure.kind === 'signed-out'
    ? { kind: 'signed-out', message: failure.message }
    : { kind: 'failed', site, failure };

// The chosen Jira project on this site, or the only one the person can see.
async function projectFor(
  step: Step,
  site: JiraSite,
  choice: ProjectChoice,
): Promise<JiraProject | ProjectView> {
  if (choice.project && choice.cloudId === site.cloudId)
    return { id: choice.project.key, ...choice.project };

  const answer = await step.read(
    step.reads.projects({ projectId: step.projectId, cloudId: site.cloudId }),
  );

  if (!answer.ok) return failedView(site, answer.failure);

  const [only, ...others] = answer.value;

  return only && others.length === 0
    ? only
    : { kind: 'no-project', site, projects: answer.value };
}

const projectTarget = (step: Step, site: JiraSite, project: JiraProject) => ({
  projectId: step.projectId,
  cloudId: site.cloudId,
  projectKey: project.key,
});

// Who the assignee filter offers by name; without them it still offers Anyone, Me and Unassigned.
async function peopleFor(
  step: Step,
  site: JiraSite,
  project: JiraProject,
): Promise<JiraPerson[]> {
  const answer = await step.read(
    step.reads.people(projectTarget(step, site, project)),
  );

  return answer.ok ? answer.value : [];
}

async function issuesFor(
  step: Step,
  site: JiraSite,
  project: JiraProject,
): Promise<ProjectView> {
  const [answer, people] = await Promise.all([
    step.read(
      step.reads.issues({
        ...projectTarget(step, site, project),
        filters: step.filters,
        cursor: null,
      }),
    ),
    peopleFor(step, site, project),
  ]);

  return answer.ok
    ? { kind: 'issues', site, project, page: answer.value, people }
    : failedView(site, answer.failure);
}

const isView = (value: JiraProject | ProjectView): value is ProjectView =>
  'kind' in value;

export async function loadProjectView(step: Step): Promise<ProjectView> {
  const { read, reads, projectId } = step;

  if (!(await read(reads.account({ projectId }))))
    return { kind: 'signed-out', message: null };

  const sites = storeReaders.sites(await read(storeQueries.sites));
  const choice = storeReaders.choice(
    await read(storeQueries.choice(projectId)),
  );

  const site = siteFor(sites, choice);

  if (!site) return { kind: 'no-site', sites };

  const project = await projectFor(step, site, choice);

  return isView(project) ? project : issuesFor(step, site, project);
}

const end: ListPage<JiraIssue> = { items: [], cursor: null };

/*
 * One page of the list the kit pages through: the first is the one the view read, so a draw asks Jira for it once,
 * and each after it is read from the cursor Jira answered. A view with no list lists nothing; the page says why.
 */
export async function listIssues(
  step: Step,
  view: Promise<ProjectView>,
  cursor: string | null,
): Promise<ListPage<JiraIssue>> {
  const shown = await view;

  if (shown.kind !== 'issues') return end;

  if (cursor === null)
    return { items: shown.page.issues, cursor: shown.page.cursor };

  const answer = await step.read(
    step.reads.issues({
      ...projectTarget(step, shown.site, shown.project),
      filters: step.filters,
      cursor,
    }),
  );

  // A later page Jira refused fails its read, so it is never an answer here.
  return answer.ok
    ? { items: answer.value.issues, cursor: answer.value.cursor }
    : end;
}
