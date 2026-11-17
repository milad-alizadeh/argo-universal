import { issueRequests } from './issue-requests';
import { call, type Located } from './issue-site';
import { issueOf, type JiraIssue } from './jira-readers';

/*
 * An issue an Operation may read or change: one in the Jira project the Project shows. An issue elsewhere on the site
 * is refused, so an Agent in one Project cannot change another Project's issues. Jira answers an issue by an old key
 * after its project is renamed, and names the project it is in now, so that is what is checked.
 */
export async function issueIn(where: Located, key: string): Promise<JiraIssue> {
  const issue = await call(where, {
    request: issueRequests.issue(key),
    read: issueOf,
  });

  if (issue.projectKey && issue.projectKey !== where.projectKey)
    throw new Error(
      `${issue.key} is in the Jira project ${issue.projectKey}, not ${where.projectKey}, the one this Project shows.`,
    );

  return issue;
}
