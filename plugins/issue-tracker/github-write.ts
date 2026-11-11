import type { Argo } from '@argo/plugin-kit';
import { called, githubHost, type GitHubRequest } from './github-api';
import type { IssueStatus } from './github-issues';
import { nonEmpty, parseJson, pick } from './json';

type Fetch = Argo['fetch'];

type Reply = NonNullable<Awaited<ReturnType<Fetch>>>;

export type StatusChange = {
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

// GitHub's own words are better than ours, but its status is enough.
async function reasonOf(response: Reply): Promise<string> {
  try {
    const message = nonEmpty(pick(parseJson(await response.text()), 'message'));

    return message ?? `GitHub answered ${response.status}.`;
  } catch {
    return `GitHub answered ${response.status}.`;
  }
}

const statusRequest = (url: string, status: IssueStatus): GitHubRequest => ({
  url,
  init: {
    method: 'PATCH',
    headers: {
      accept: 'application/vnd.github+json',
      'content-type': 'application/json',
    },
    body: JSON.stringify(states[status]),
  },
});

/*
 * Closes or reopens an Issue as the signed-in person, borrowing the Account as a read does; Argo marks the
 * Plugin's pages stale when the Operation that calls this ends.
 */
export async function setIssueStatus(
  fetch: Fetch,
  { repository, number, status, projectId }: StatusChange,
): Promise<void> {
  const url = `https://${githubHost}/repos/${repository}/issues/${issueNumber(number)}`;

  const response = await called(fetch, projectId, statusRequest(url, status));

  if (!response.ok) throw new Error(await reasonOf(response));
}
