import type { LoaderInput } from '@argo/plugin-kit';
import type { IssueView } from './issue-detail';
import type { JiraReads } from './jira-reads';
import { siteFor } from './jira-setup';
import { storeQueries, storeReaders } from './jira-store';

type Step = {
  read: LoaderInput['read'];
  reads: JiraReads;
  projectId: string;
  key: string;
};

// An issue's key is its Jira project's key, a dash and its number.
const projectKeyOf = (key: string): string => key.replace(/-\d+$/u, '');

/*
 * What one issue's page shows. A list read the issue and the choices its menus offer, so both answer from what Argo
 * kept and the page draws at once; opened any other way, it reads them from Jira.
 */
export async function loadIssueView(step: Step): Promise<IssueView> {
  const { read, reads, projectId, key } = step;
  const [sites, choice] = await Promise.all([
    read(storeQueries.sites),
    read(storeQueries.choice(projectId)),
  ]);
  const site = siteFor(storeReaders.sites(sites), storeReaders.choice(choice));

  if (!site) return { kind: 'no-site' };

  const target = { projectId, cloudId: site.cloudId };
  const [answer, choices] = await Promise.all([
    read(reads.issue({ ...target, key })),
    read(reads.choices({ ...target, projectKey: projectKeyOf(key) })),
  ]);

  if (answer.ok) return { kind: 'issue', site, issue: answer.value, choices };

  return answer.failure.kind === 'signed-out'
    ? { kind: 'signed-out', message: answer.failure.message }
    : { kind: 'failed', failure: answer.failure };
}
