import type { LoaderInput, NamedQuery } from '@argo/plugin-kit';
import type { EditChoices } from './issue-reads';
import type { JiraAnswer, JiraFailure } from './jira-client';
import type { IssuePage, JiraProject } from './jira-readers';
import type { JiraReads } from './jira-reads';
import {
  storeQueries,
  storeReaders,
  type JiraSite,
  type ProjectChoice,
} from './jira-store';

/*
 * Where one Argo Project stands with Jira, in the order a person meets it: signed out, no site, no Jira project, a
 * failed read, or the project's issues. Each step names the next one, and a step with one answer takes it.
 */
export type ProjectView =
  | { kind: 'signed-out'; message: string | null }
  | { kind: 'no-site'; sites: JiraSite[] }
  | { kind: 'no-project'; site: JiraSite; projects: JiraProject[] }
  | FailedView
  | { kind: 'issues'; site: JiraSite; project: JiraProject; page: IssuePage };

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

type Step = { read: Read; reads: JiraReads; projectId: string };

const signedOutView = (message: string | null): ProjectView => ({
  kind: 'signed-out',
  message,
});

const onlyOne = <Value>(values: Value[]): Value | null =>
  values.length === 1 ? (values.at(0) ?? null) : null;

// A chosen site still known, or the only one there is.
export const siteFor = (
  sites: JiraSite[],
  choice: ProjectChoice,
): JiraSite | null =>
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

const issuesOf = (
  { reads, projectId }: Step,
  { cloudId }: JiraSite,
  { key }: JiraProject,
): NamedQuery<JiraAnswer<IssuePage>> =>
  reads.issues({ projectId, cloudId, projectKey: key });

// The choices an issue's page offers are read beside the list, so an issue opened from it draws at once.
const choicesOf = (
  { reads, projectId }: Step,
  { cloudId }: JiraSite,
  { key }: JiraProject,
): NamedQuery<EditChoices> =>
  reads.choices({ projectId, cloudId, projectKey: key });

type Listing = { site: JiraSite; project: JiraProject; chosen: boolean };

async function issuesFor(
  step: Step,
  { site, project, chosen }: Listing,
): Promise<ProjectView> {
  const [answer] = await Promise.all([
    step.read(issuesOf(step, site, project)),
    step.read(choicesOf(step, site, project)),
  ]);

  return answer.ok
    ? { kind: 'issues', site, project, page: answer.value }
    : failedView({ site, reading: 'issues', chosen }, answer.failure);
}

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
