import { expect, it } from 'vitest';
import { jiraData, person, scopedToken } from './jira-data';
import { filtered } from './jira-jql';

const issues = jiraData().sites.at(0)?.projects.at(0)?.issues ?? [];

const who = { ...person, token: scopedToken, scoped: true };

const where = (clauses: string): string =>
  `project = "ARGO"${clauses} ORDER BY updated DESC`;

it('reads the clauses the filters send', () => {
  const found = filtered(
    where(' AND statusCategory = 4 AND assignee = currentUser()'),
    issues,
    who,
  );

  expect(found).toMatchObject({ ok: true, issues: [{ key: 'ARGO-3' }] });
});

it.each([
  ' AND statusCategory = "Done"',
  ' AND assignee = currentuser()',
  ' AND text ~ "unclosed',
  ' AND summary ~ "token"',
])('refuses a clause it cannot read, as Jira refuses bad JQL:%s', (clause) => {
  expect(filtered(where(clause), issues, who)).toEqual({
    ok: false,
    clause: clause.slice(' AND '.length),
  });
});
