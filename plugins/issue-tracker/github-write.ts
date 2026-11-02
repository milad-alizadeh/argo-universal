import type { Argo } from '@argo/plugin-kit';
import { githubHost, unauthorizedStatus } from './github-api';
import type { IssueStatus } from './github-issues';
import { nonEmpty, parseJson, pick } from './json';

type Fetch = Argo['fetch'];

type Change = {
  repository: string;
  number: number;
  status: IssueStatus;
  projectId: string;
};

// What GitHub's REST API takes for each status, with the reason it records.
const states = {
  open: { state: 'open', state_reason: 'reopened' },
  closed: { state: 'closed', state_reason: 'completed' },
} as const;

function issueNumber(number: number): string {
  if (!Number.isSafeInteger(number) || number < 1)
    throw new Error('Issue number must be a positive integer.');

  return String(number);
}

type Reply = NonNullable<Awaited<ReturnType<Fetch>>>;

// GitHub's own words are better than ours, but its status is enough.
async function messageOf(response: Reply): Promise<string | null> {
  try {
    return nonEmpty(pick(parseJson(await response.text()), 'message'));
  } catch {
    return null;
  }
}

const reasonOf = async (response: Reply): Promise<string> =>
  (await messageOf(response)) ?? `GitHub answered ${response.status}.`;

const present = (response: Reply | null): Reply => {
  if (!response) throw new Error('Sign in to GitHub to change this Issue.');

  return response;
};

async function accept(response: Reply): Promise<void> {
  if (response.status === unauthorizedStatus)
    throw new Error('GitHub rejected the saved sign-in. Sign in again.');

  if (!response.ok) throw new Error(await reasonOf(response));
}

const requestOf = ({ status, projectId }: Change): Parameters<Fetch>[1] => ({
  method: 'PATCH',
  headers: {
    accept: 'application/vnd.github+json',
    'content-type': 'application/json',
  },
  body: JSON.stringify(states[status]),
  account: githubHost,
  projectId,
});

/*
 * Closes or reopens an Issue as the signed-in person. It borrows the Account like a read does; the page refreshes its
 * own Query afterwards, so nothing else is fetched for it.
 */
export async function setIssueStatus(
  fetch: Fetch,
  change: Change,
): Promise<void> {
  const { repository, number } = change;
  const url = `https://${githubHost}/repos/${repository}/issues/${issueNumber(number)}`;

  await accept(present(await fetch(url, requestOf(change))));
}
