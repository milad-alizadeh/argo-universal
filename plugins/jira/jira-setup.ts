import type { ListPage, LoaderInput, NamedQuery } from '@argo/plugin-kit';
import { issuesPage, type ListedItem } from './issue-pages';
import type { JiraAnswer, JiraFailure } from './jira-client';
import type { IssueFilters } from './jira-filters';
import type { JiraPerson, JiraProject } from './jira-readers';
import type { JiraReads, ProjectTarget, Reading } from './jira-reads';
import {
  storeQueries,
  storeReaders,
  type JiraSite,
  type ProjectChoice,
} from './jira-store';

/*
 * Where one Argo Project stands with Jira, in the order a person meets it: signed out, no site, no Jira project, a
 * failed read, or the project's issues the filters leave. Each step names the next one, and a step with one answer
 * takes it. The issues themselves are the kit's paged list, read page by page from Jira (`issue-pages.ts`).
 */
export type ProjectView =
  | { kind: 'signed-out'; message: string | null }
  | { kind: 'no-site'; sites: JiraSite[] }
  | { kind: 'no-project'; site: JiraSite; projects: JiraProject[] }
  | FailedView
  | {
      kind: 'issues';
      site: JiraSite;
      project: JiraProject;
      chosen: boolean;
      people: JiraPerson[];
    };

/*
 * A read Jira refused: which read it was, so a 404 names the project or the site, and whether the Project chose its
 * Jira project, so the page offers another only when there is a choice to undo.
 */
export type FailedView = {
  kind: 'failed';
  site: JiraSite;
  failure: JiraFailure;
  reading: 'projects' | 'issues';
  chosen: boolean;
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

type Failing = Omit<FailedView, 'kind' | 'failure'>;

const failedView = (failing: Failing, failure: JiraFailure): ProjectView =>
  failure.kind === 'signed-out'
    ? signedOutView(failure.message)
    : { kind: 'failed', failure, ...failing };

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

  if (!answer.ok)
    return failedView(
      { site, reading: 'projects', chosen: false },
      answer.failure,
    );

  const projects = answer.value;

  return onlyOne(projects) ?? { kind: 'no-project', site, projects };
}

const targetOf = (
  { projectId }: Step,
  { cloudId }: JiraSite,
  { key }: JiraProject,
): ProjectTarget => ({ projectId, cloudId, projectKey: key });

// The site and Jira project the list is for, and whether the Project chose that Jira project.
type Listed = { site: JiraSite; project: JiraProject; chosen: boolean };

// Who the assignee filter offers by name; without them it still offers Anyone, Me and Unassigned.
async function peopleFor(step: Step, listed: Listed): Promise<JiraPerson[]> {
  const answer = await step.read(
    step.reads.people(targetOf(step, listed.site, listed.project)),
  );

  return answer.ok ? answer.value : [];
}

const issuesFor = async (step: Step, listed: Listed): Promise<ProjectView> => ({
  kind: 'issues',
  ...listed,
  people: await peopleFor(step, listed),
});

const isView = (value: JiraProject | ProjectView): value is ProjectView =>
  'kind' in value;

async function siteView(
  step: Step,
  site: JiraSite,
  choice: ProjectChoice,
): Promise<ProjectView> {
  const chosen = chosenProject(site, choice);
  const project = chosen ?? (await listedProject(step, site));

  return isView(project)
    ? project
    : issuesFor(step, { site, project, chosen: chosen !== null });
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

const end: ListPage<ListedItem> = { items: [], cursor: null };

/*
 * One page of the list the kit pages through, from Jira's cursor (null for the first). A view with no list lists
 * nothing, and the page says why.
 */
export const listIssues = (
  reading: Reading,
  { step, view }: { step: Step; view: ProjectView },
  cursor: string | null,
): ListPage<ListedItem> | Promise<ListPage<ListedItem>> =>
  view.kind === 'issues'
    ? issuesPage(reading, {
        ...targetOf(step, view.site, view.project),
        filters: step.filters,
        cursor,
      })
    : end;
