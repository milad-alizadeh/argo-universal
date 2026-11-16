import type { FixtureAnswer } from '@argo/plugin-kit/testing';
import { at, text, type Json } from '../json';
import type { FixtureSite } from './jira-data';
import { done, peopleOf, refused, type IssueAnswer } from './jira-issue-found';
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

type Person = NonNullable<FixtureSite['people']>[number];

// No one unassigns; anyone else must be someone the site's projects may assign.
const assignable = (
  site: FixtureSite,
  accountId: Json | undefined,
): Person | null | undefined =>
  accountId === null
    ? null
    : peopleOf(site)?.find((one) => one.accountId === accountId);

export const assign: IssueAnswer = ({ issue }, { body, site }) => {
  const accountId = at(body, 'accountId');
  const found = assignable(site, accountId);

  if (found === undefined)
    return refused(`User '${text(accountId)}' cannot be assigned issues.`);

  issue.assignee = found;

  return done;
};

export const edit: IssueAnswer = ({ issue }, { body }): FixtureAnswer => {
  const id = text(at(body, 'fields', 'priority', 'id'));
  const priority = priorities.find((each) => each.id === id);

  if (!priority) return refused('The priority selected is invalid.');

  issue.priority = priority.name;

  return done;
};
