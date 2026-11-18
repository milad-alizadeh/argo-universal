import type { Json } from '../json';
import type { FixtureProject, FixtureSite } from './jira-data';
import { peopleOf } from './jira-issue-found';

/*
 * Who the fixture Jira lets a project's issues be assigned to, once each: the caller, everyone its issues are assigned
 * to, and the site's people. The `people` route answers this set, and the assign write takes only someone in it, so
 * the menu never offers someone the write then refuses.
 */
type Person = NonNullable<FixtureSite['people']>[number];

type Where = { site: FixtureSite; project: FixtureProject };

const assigneesOf = ({ issues }: FixtureProject): Person[] =>
  issues.flatMap(({ assignee }) => (assignee ? [assignee] : []));

export const assignableIn = (
  who: Person,
  { site, project }: Where,
): Person[] => [
  ...new Map(
    [who, ...assigneesOf(project), ...(peopleOf(site) ?? [])].map((person) => [
      person.accountId,
      person,
    ]),
  ).values(),
];

// A person as Jira answers one; an account the test does not type is a person's.
export const personJson = ({
  accountId,
  displayName,
  accountType = 'atlassian',
}: Person): Json => ({ accountId, displayName, accountType });
