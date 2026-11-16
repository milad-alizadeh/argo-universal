import type { LoaderInput } from '@argo/plugin-kit';
import type {
  IssuePage,
  JiraFailure,
  JiraProject,
  JiraStatus,
} from './jira-client';
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
  | { kind: 'failed'; site: JiraSite; failure: JiraFailure }
  | {
      kind: 'issues';
      site: JiraSite;
      project: JiraProject;
      page: IssuePage;
      // The Jira project's statuses, read only while the issues show as a board.
      statuses?: JiraStatus[];
    };

type Read = LoaderInput['read'];

type Step = { read: Read; reads: JiraReads; projectId: string };

// A chosen site still known, or the only one there is.
export function siteFor(
  sites: JiraSite[],
  choice: ProjectChoice,
): JiraSite | null {
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

async function issuesFor(
  step: Step,
  site: JiraSite,
  project: JiraProject,
): Promise<ProjectView> {
  const target = {
    projectId: step.projectId,
    cloudId: site.cloudId,
    projectKey: project.key,
  };
  // The choices an issue's page offers are read beside the list, so an issue opened from it draws at once.
  const [answer] = await Promise.all([
    step.read(step.reads.issues(target)),
    step.read(step.reads.choices(target)),
  ]);

  return answer.ok
    ? { kind: 'issues', site, project, page: answer.value }
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
