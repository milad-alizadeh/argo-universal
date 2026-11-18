import type { JiraStatus, JiraTransition } from './issue-fields';
import { issueReaders } from './issue-readers';
import { issueRequests } from './issue-requests';
import { call, located, same, type IssueCalls } from './issue-site';
import type { JiraIssue } from './jira-readers';
import { issueIn } from './project-issue';

/*
 * The `transition` Operation: moves an issue to a status Jira allows from its current one, as the issue's page and a
 * board's move run it, and an Agent through `argo run`. A status Jira does not allow is refused before Jira is asked,
 * naming where the issue can go; asking for the status it is in changes nothing.
 */
export type TransitionParams = {
  issue: string;
  status: string;
  projectId: string;
};

type Moved = { issue: string; status: string };

// A status is named by its id, as a board's column is, or by its name, as a person or an Agent writes it.
const isStatus = (status: JiraStatus, named: string): boolean =>
  status.id === named || same(status.name, named);

const transitionTo = (
  transitions: JiraTransition[],
  named: string,
): JiraTransition | undefined =>
  transitions.find(({ to }) => isStatus(to, named)) ??
  transitions.find(({ name }) => same(name, named));

const whereTo = (transitions: JiraTransition[]): string => {
  const names = [...new Set(transitions.map(({ to }) => to.name))];

  return names.length === 0
    ? 'Jira allows no move from there.'
    : `It can move to ${names.join(', ')}.`;
};

// Why Jira will not take the issue there, with where it can go instead.
const refusal = (issue: JiraIssue, named: string): Error =>
  new Error(
    `Jira doesn’t allow moving ${issue.key} from ${issue.status.name} to ${named}. ${whereTo(issue.transitions)}`,
  );

function unmoved(issue: JiraIssue, named: string): Moved {
  if (!isStatus(issue.status, named)) throw refusal(issue, named);

  return { issue: issue.key, status: issue.status.name };
}

export async function transition(
  argo: IssueCalls,
  { issue: key, status, projectId }: TransitionParams,
): Promise<Moved> {
  const where = await located(argo, projectId);
  const issue = await issueIn(where, key);
  const chosen = transitionTo(issue.transitions, status);

  if (!chosen) return unmoved(issue, status);

  const request = issueRequests.transition(key, chosen.id);

  await call(where, { request, read: issueReaders.done });
  argo.changed();

  return { issue: issue.key, status: chosen.to.name };
}
