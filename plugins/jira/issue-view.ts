import type { LoaderInput } from '@argo/plugin-kit';
import type { IssueView } from './issue-detail';
import type { IssueTarget } from './issue-reads';
import type { JiraReads } from './jira-reads';
import { siteFor } from './jira-setup';
import { storeQueries, storeReaders, type JiraSite } from './jira-store';

type Step = {
  read: LoaderInput['read'];
  reads: JiraReads;
  projectId: string;
  key: string;
};

// An issue's key is its Jira project's key, a dash and its number.
const projectKeyOf = (key: string): string => key.replace(/-\d+$/u, '');

async function siteOf({ read, projectId }: Step): Promise<JiraSite | null> {
  const [sites, choice] = await Promise.all([
    read(storeQueries.sites),
    read(storeQueries.choice(projectId)),
  ]);

  return siteFor(storeReaders.sites(sites), storeReaders.choice(choice));
}

async function issueAt(
  { read, reads }: Step,
  site: JiraSite,
  target: IssueTarget,
): Promise<IssueView> {
  const { projectId, cloudId, key } = target;
  const projectKey = projectKeyOf(key);

  const [answer, choices] = await Promise.all([
    read(reads.issue(target)),
    read(reads.choices({ projectId, cloudId, projectKey })),
  ]);

  if (!answer.ok) return { kind: 'failed', failure: answer.failure };

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
