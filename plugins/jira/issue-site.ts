import type { Argo } from '@argo/plugin-kit';
import { callJira, type JiraAnswer, type JiraCall } from './jira-client';
import { allPages } from './jira-paging';
import { jiraReaders } from './jira-readers';
import { jiraRequests } from './jira-requests';
import { siteFor } from './jira-setup';
import {
  storeQueries,
  storeReaders,
  type JiraSite,
  type ProjectChoice,
} from './jira-store';
import { borrowing } from './read-scope';

/*
 * Where an issue Operation reaches Jira: the site and Jira project the Project's Jira page shows, found as the page
 * finds them, through the Project's Account. A call answers Jira's value, or throws Jira's reason, which the App shows
 * as the run's error toast and `argo run` prints.
 */
export type IssueCalls = Pick<Argo, 'fetch' | 'storage' | 'changed'>;

type Sent = Pick<JiraCall<never>, 'send' | 'cloudId'>;

export type Located = Sent & { site: JiraSite; projectKey: string };

const noSite = 'Choose a Jira site for this Project first, on its Jira page.';

const noProject =
  'Choose a Jira project for this Project first, on its Jira page.';

type Stored = { sites: JiraSite[]; choice: ProjectChoice };

async function storedChoice(
  argo: IssueCalls,
  projectId: string,
): Promise<Stored> {
  const [sites, choice] = await Promise.all([
    argo.storage.batch(storeQueries.sites.queries),
    argo.storage.batch(storeQueries.choice(projectId).queries),
  ]);

  return {
    sites: storeReaders.sites(sites),
    choice: storeReaders.choice(choice),
  };
}

// The Jira project chosen on this site, if one is.
function keyOn(
  site: JiraSite,
  { cloudId, project }: ProjectChoice,
): string | null {
  return cloudId === site.cloudId && project ? project.key : null;
}

// The page shows the only Jira project the person can see without asking, so an Operation takes it too.
async function onlyProjectKey(sent: Sent): Promise<string | null> {
  const answer = await allPages((startAt) =>
    callJira({
      ...sent,
      request: jiraRequests.projects(startAt),
      read: jiraReaders.projects,
    }),
  );

  const [only, ...others] = answered(answer);

  return only && others.length === 0 ? only.key : null;
}

async function projectKeyOf(
  sent: Sent,
  site: JiraSite,
  choice: ProjectChoice,
): Promise<string> {
  const key = keyOn(site, choice) ?? (await onlyProjectKey(sent));

  if (!key) throw new Error(noProject);

  return key;
}

export async function located(
  argo: IssueCalls,
  projectId: string,
): Promise<Located> {
  const { sites, choice } = await storedChoice(argo, projectId);
  const site = siteFor(sites, choice);

  if (!site) throw new Error(noSite);

  const sent = { send: borrowing(argo, projectId), cloudId: site.cloudId };

  return { ...sent, site, projectKey: await projectKeyOf(sent, site, choice) };
}

function answered<Value>(answer: JiraAnswer<Value>): Value {
  if (answer.ok) return answer.value;

  throw new Error(answer.failure.message);
}

// One call to the Project's Jira: its value, or Jira's reason as the Operation's error.
export const call = async <Value>(
  { send, cloudId }: Located,
  { request, read }: Pick<JiraCall<Value>, 'request' | 'read'>,
): Promise<Value> => answered(await callJira({ send, cloudId, request, read }));

export const same = (a: string, b: string): boolean =>
  a.trim().toLowerCase() === b.trim().toLowerCase();
