import type { Argo } from '@argo/plugin-kit';
import { githubHost } from './github-api';
import type { IssueStatus } from './github-issues';

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

const reasonOf = async (
  response: NonNullable<Awaited<ReturnType<Fetch>>>,
): Promise<string> => {
  try {
    const { message } = Object(JSON.parse(await response.text()));

    if (typeof message === 'string' && message !== '') return message;
  } catch {
    // GitHub's own words are better than ours, but its status is enough.
  }

  return `GitHub answered ${response.status}.`;
};

/*
 * Closes or reopens an Issue as the signed-in person. It borrows the Account like a read does; the page refreshes its
 * own Query afterwards, so nothing else is fetched for it.
 */
export async function setIssueStatus(
  fetch: Fetch,
  { repository, number, status, projectId }: Change,
): Promise<void> {
  const response = await fetch(
    `https://${githubHost}/repos/${repository}/issues/${issueNumber(number)}`,
    {
      method: 'PATCH',
      headers: {
        accept: 'application/vnd.github+json',
        'content-type': 'application/json',
      },
      body: JSON.stringify(states[status]),
      account: githubHost,
      projectId,
    },
  );

  if (!response) throw new Error('Sign in to GitHub to change this Issue.');

  if (response.status === 401)
    throw new Error('GitHub rejected the saved sign-in. Sign in again.');

  if (!response.ok) throw new Error(await reasonOf(response));
}
