import type { LoaderInput, NamedQuery } from '@argo/plugin-kit';
import type { JiraPriority } from './issue-readers';
import type { JiraAnswer } from './jira-client';
import type { IssueFilters } from './jira-filters';
import type { JiraPerson, JiraProject } from './jira-readers';
import type { JiraReads, ProjectTarget } from './jira-reads';
import type { JiraSite } from './jira-store';

export type Step = {
  read: LoaderInput['read'];
  reads: JiraReads;
  projectId: string;
  filters: IssueFilters;
};

// The site and Jira project the list is for, and whether the Project chose that Jira project.
export type Listed = { site: JiraSite; project: JiraProject; chosen: boolean };

export const projectsOf = (
  { reads, projectId }: Step,
  { cloudId }: JiraSite,
): NamedQuery<JiraAnswer<JiraProject[]>> =>
  reads.projects({ projectId, cloudId });

export const targetOf = (
  { projectId }: Step,
  { cloudId }: JiraSite,
  { key }: JiraProject,
): ProjectTarget => ({ projectId, cloudId, projectKey: key });

// Who the assignee filter offers by name; without them it still offers Anyone, Me and Unassigned.
async function peopleFor(step: Step, listed: Listed): Promise<JiraPerson[]> {
  const answer = await step.read(
    step.reads.people(targetOf(step, listed.site, listed.project)),
  );

  return answer.ok ? answer.value : [];
}

// The site's priorities are read beside the people, so an issue opened from the list offers both at once.
const prioritiesFor = (
  { read, reads, projectId }: Step,
  { site }: Listed,
): Promise<JiraPriority[]> =>
  read(reads.priorities({ projectId, cloudId: site.cloudId }));

/*
 * The site's Jira projects for the title's menu, through the same kept Query the project picker reads; when Jira does
 * not list them, the menu still names the one shown.
 */
async function projectsFor(
  step: Step,
  { site, project }: Listed,
): Promise<JiraProject[]> {
  const answer = await step.read(projectsOf(step, site));
  const listed = answer.ok ? answer.value : [];

  return listed.some(({ key }) => key === project.key)
    ? listed
    : [project, ...listed];
}

export type IssueScope = { people: JiraPerson[]; projects: JiraProject[] };

// What the issues' header offers besides the list: the people to filter by and the projects to switch to.
export async function issueScope(
  step: Step,
  listed: Listed,
): Promise<IssueScope> {
  const [people, projects] = await Promise.all([
    peopleFor(step, listed),
    projectsFor(step, listed),
    prioritiesFor(step, listed),
  ]);

  return { people, projects };
}
