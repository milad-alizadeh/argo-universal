import type { FixtureAnswer } from '@argo/plugin-kit/testing';
import { at, text, type Json } from '../json';
import type { FixtureIssue } from './jira-data';
import {
  done,
  refused,
  type Found,
  type IssueAnswer,
} from './jira-issue-found';
import { assignableIn } from './jira-people';
import type { JiraCall } from './jira-routes';
import { priorities, transitionsFrom } from './jira-workflow';

/*
 * The writes the issue page makes, as the fixture Jira takes them: a transition by its own id, which must be one Jira
 * offers from the issue's status now; an assignee the project may assign, or none; a priority the site has.
 */
export const transition: IssueAnswer = ({ issue }, { body }) => {
  const id = text(at(body, 'transition', 'id'));

  const chosen = transitionsFrom(issue).find(
    (each) => each.id === id && each.isAvailable,
  );

  if (!chosen)
    return refused(`Transition id '${id}' is not valid for this issue.`);

  issue.status = { name: chosen.to.name, category: chosen.to.category };

  return done;
};

type Assignee = NonNullable<FixtureIssue['assignee']>;

// Someone the `people` route offers for the issue's project, as the issue holds an assignee.
function offered(
  { projectKey }: Found,
  { site, who }: JiraCall,
  accountId: Json | undefined,
): Assignee | undefined {
  const project = site.projects.find(({ key }) => key === projectKey);
  const people = project ? assignableIn(who, { site, project }) : [];
  const found = people.find((one) => one.accountId === accountId);

  return (
    found && { accountId: found.accountId, displayName: found.displayName }
  );
}

// No one unassigns; anyone else must be someone the `people` route offers.
const assignable = (
  found: Found,
  call: JiraCall,
  accountId: Json | undefined,
): Assignee | null | undefined =>
  accountId === null ? null : offered(found, call, accountId);

export const assign: IssueAnswer = (found, call) => {
  const { issue } = found;
  const accountId = at(call.body, 'accountId');
  const person = assignable(found, call, accountId);

  if (person === undefined)
    return refused(`User '${text(accountId)}' cannot be assigned issues.`);

  issue.assignee = person;

  return done;
};

export const edit: IssueAnswer = ({ issue }, { body }): FixtureAnswer => {
  const id = text(at(body, 'fields', 'priority', 'id'));
  const priority = priorities.find((each) => each.id === id);

  if (!priority) return refused('The priority selected is invalid.');

  issue.priority = priority.name;

  return done;
};
