import type { ListPage, LoaderInput, NamedQuery } from '@argo/plugin-kit';
import type { JiraAnswer, JiraFailure } from './jira-client';
import type { IssueFilters } from './jira-filters';
import type {
  IssuePage,
  JiraIssue,
  JiraPerson,
  JiraProject,
} from './jira-readers';
import type { JiraReads, ProjectTarget } from './jira-reads';
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

export type Step = {
  read: Read;
  reads: JiraReads;
  projectId: string;
  filters: IssueFilters;
};

const signedOutView = (message: string | null): ProjectView => ({
  kind: 'signed-out',
  message,
});

const onlyOne = <Value>(values: Value[]): Value | null =>
  values.length === 1 ? (values.at(0) ?? null) : null;

// A chosen site still known, or the only one there is.
const siteFor = (sites: JiraSite[], choice: ProjectChoice): JiraSite | null =>
  sites.find(({ cloudId }) => cloudId === choice.cloudId) ?? onlyOne(sites);

const failedView = (site: JiraSite, failure: JiraFailure): ProjectView =>
  failure.kind === 'signed-out'
    ? signedOutView(failure.message)
    : { kind: 'failed', site, failure };

const chosenProject = (
  site: JiraSite,
  choice: ProjectChoice,
): JiraProject | null =>
  choice.project && choice.cloudId === site.cloudId
    ? { id: choice.project.key, ...choice.project }
    : null;

const projectsOf = (
  { reads, projectId }: Step,
  { cloudId }: JiraSite,
): NamedQuery<JiraAnswer<JiraProject[]>> =>
  reads.projects({ projectId, cloudId });

// The only Jira project the person can see is chosen for them; otherwise the page asks.
async function listedProject(
  step: Step,
  site: JiraSite,
): Promise<JiraProject | ProjectView> {
  const answer = await step.read(projectsOf(step, site));

  if (!answer.ok) return failedView(site, answer.failure);

  const projects = answer.value;

  return onlyOne(projects) ?? { kind: 'no-project', site, projects };
}

const targetOf = (
  { projectId }: Step,
  { cloudId }: JiraSite,
  { key }: JiraProject,
): ProjectTarget => ({ projectId, cloudId, projectKey: key });

type Listed = { site: JiraSite; project: JiraProject };

// One page of the filtered list, from Jira's cursor; the first page's is null.
const issuesOf = (
  step: Step,
  { site, project }: Listed,
  cursor: string | null,
): NamedQuery<JiraAnswer<IssuePage>> =>
  step.reads.issues({
    ...targetOf(step, site, project),
    filters: step.filters,
    cursor,
  });

// Who the assignee filter offers by name; without them it still offers Anyone, Me and Unassigned.
async function peopleFor(step: Step, listed: Listed): Promise<JiraPerson[]> {
  const answer = await step.read(
    step.reads.people(targetOf(step, listed.site, listed.project)),
  );

  return answer.ok ? answer.value : [];
}

async function issuesFor(step: Step, listed: Listed): Promise<ProjectView> {
  const [answer, people] = await Promise.all([
    step.read(issuesOf(step, listed, null)),
    peopleFor(step, listed),
  ]);

  return answer.ok
    ? { kind: 'issues', ...listed, page: answer.value, people }
    : failedView(listed.site, answer.failure);
}

const isView = (value: JiraProject | ProjectView): value is ProjectView =>
  'kind' in value;

async function siteView(
  step: Step,
  site: JiraSite,
  choice: ProjectChoice,
): Promise<ProjectView> {
  const project =
    chosenProject(site, choice) ?? (await listedProject(step, site));

  return isView(project) ? project : issuesFor(step, { site, project });
}

async function chosenView(step: Step): Promise<ProjectView> {
  const sites = storeReaders.sites(await step.read(storeQueries.sites));
  const choiceRead = await step.read(storeQueries.choice(step.projectId));
  const choice = storeReaders.choice(choiceRead);
  const site = siteFor(sites, choice);

  return site ? siteView(step, site, choice) : { kind: 'no-site', sites };
}

export async function loadProjectView(step: Step): Promise<ProjectView> {
  const account = await step.read(
    step.reads.account({ projectId: step.projectId }),
  );

  return account ? chosenView(step) : signedOutView(null);
}

const end: ListPage<JiraIssue> = { items: [], cursor: null };

const listPage = ({ issues, cursor }: IssuePage): ListPage<JiraIssue> => ({
  items: issues,
  cursor,
});

/*
 * One page of the list the kit pages through. The first is the one the view read, so a draw asks Jira for it once;
 * each after it is read from the cursor Jira answered, and a refused one fails its read. A view with no list lists
 * nothing, and the page says why.
 */
export async function listIssues(
  step: Step,
  view: ProjectView,
  cursor: string | null,
): Promise<ListPage<JiraIssue>> {
  if (view.kind !== 'issues') return end;

  if (cursor === null) return listPage(view.page);

  const answer = await step.read(issuesOf(step, view, cursor));

  return answer.ok ? listPage(answer.value) : end;
}
