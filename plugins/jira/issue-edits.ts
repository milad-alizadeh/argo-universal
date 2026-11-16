import { issueReaders, type JiraPriority } from './issue-readers';
import { issueRequests } from './issue-requests';
import {
  call,
  located,
  same,
  type IssueCalls,
  type Located,
} from './issue-site';
import { jiraReaders } from './jira-readers';
import { jiraRequests } from './jira-requests';
import { issueIn } from './project-issue';

/*
 * The `setAssignee` and `setPriority` Operations, as the issue page's menus run them and an Agent runs them through
 * `argo run`. Each write calls `argo.changed()`, so every open list and page reads Jira again.
 */
type IssueAt = { issue: string; projectId: string };

const myself = { request: jiraRequests.myself(), read: jiraReaders.myself };

const isMe = (assignee?: string): boolean => same(assignee ?? '', 'me');

// `me` is whoever the Project's Account signs in as; no one unassigns the issue.
async function accountIdOf(
  where: Located,
  assignee?: string,
): Promise<string | null> {
  if (!isMe(assignee)) return assignee ?? null;

  return (await call(where, myself)).accountId;
}

export async function setAssignee(
  argo: IssueCalls,
  { issue, assignee, projectId }: IssueAt & { assignee?: string },
): Promise<{ issue: string; assignee: string | null }> {
  const where = await located(argo, projectId);

  const [accountId] = await Promise.all([
    accountIdOf(where, assignee),
    issueIn(where, issue),
  ]);

  const request = issueRequests.assign(issue, accountId);

  await call(where, { request, read: issueReaders.done });
  argo.changed();

  return { issue, assignee: accountId };
}

const priorities = {
  request: issueRequests.priorities(),
  read: issueReaders.priorities,
};

// The priority named by its id or its name, or why the site has none by that name.
async function priorityOf(
  where: Located,
  named: string,
): Promise<JiraPriority> {
  const listed = await call(where, priorities);

  const found = listed.find(
    ({ id, name }) => id === named || same(name, named),
  );

  if (found) return found;

  const names = listed.map(({ name }) => name).join(', ');

  throw new Error(
    `Jira has no priority called ${named}. Its priorities are ${names}.`,
  );
}

export async function setPriority(
  argo: IssueCalls,
  { issue, priority, projectId }: IssueAt & { priority: string },
): Promise<{ issue: string; priority: string }> {
  const where = await located(argo, projectId);

  const [chosen] = await Promise.all([
    priorityOf(where, priority),
    issueIn(where, issue),
  ]);

  const request = issueRequests.setPriority(issue, chosen.id);

  await call(where, { request, read: issueReaders.done });
  argo.changed();

  return { issue, priority: chosen.name };
}
