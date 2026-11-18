import type { LoaderInput } from '@argo/plugin-kit';
import type { IssueView } from './issue-detail';
import type { EditChoices, IssueTarget } from './issue-reads';
import type { JiraIssue } from './jira-readers';
import type { JiraReads } from './jira-reads';
import { siteFor } from './jira-setup';
import { storeQueries, storeReaders, type JiraSite } from './jira-store';

type Step = {
  read: LoaderInput['read'];
  reads: JiraReads;
  projectId: string;
  key: string;
};

// The Jira project that holds the issue, as Jira names it, so a renamed project's old keys share the list's choices.
const projectKeyOf = (issue: JiraIssue): string =>
  issue.projectKey ?? issue.key.replace(/-\d+$/u, '');

async function siteOf({ read, projectId }: Step): Promise<JiraSite | null> {
  const [sites, choice] = await Promise.all([
    read(storeQueries.sites),
    read(storeQueries.choice(projectId)),
  ]);

  return siteFor(storeReaders.sites(sites), storeReaders.choice(choice));
}

// The people the issue's Jira project can assign, as the list's assignee filter reads them, and the site's priorities.
async function choicesFor(
  { read, reads }: Step,
  target: IssueTarget & { projectKey: string },
): Promise<EditChoices> {
  const { projectId, cloudId, projectKey } = target;

  const [people, priorities] = await Promise.all([
    read(reads.people({ projectId, cloudId, projectKey })),
    read(reads.priorities({ projectId, cloudId })),
  ]);

  return { people: people.ok ? people.value : [], priorities };
}

// The issue first, which a list kept, then the choices for its own Jira project, which the list kept too.
async function issueAt(
  step: Step,
  site: JiraSite,
  target: IssueTarget,
): Promise<IssueView> {
  const answer = await step.read(step.reads.issue(target));

  if (!answer.ok) return { kind: 'failed', failure: answer.failure };

  const projectKey = projectKeyOf(answer.value);
  const choices = await choicesFor(step, { ...target, projectKey });

  return { kind: 'issue', site, issue: answer.value, choices };
}

const signedOutOr = (view: IssueView): IssueView =>
  view.kind === 'failed' && view.failure.kind === 'signed-out'
    ? { kind: 'signed-out', message: view.failure.message }
    : view;

/*
 * What one issue's page shows. A list read the issue and the choices its menus offer, so both answer from what Argo
 * kept and the page draws at once; opened any other way, it reads them from Jira.
 */
export async function loadIssueView(step: Step): Promise<IssueView> {
  const site = await siteOf(step);

  if (!site) return { kind: 'no-site' };

  const { projectId, key } = step;
  const target = { projectId, cloudId: site.cloudId, key };

  return signedOutOr(await issueAt(step, site, target));
}
