import { expect, it } from 'vitest';
import {
  argoThree,
  entries,
  fixtureIssue,
  keyed,
  listed,
} from './mocks/issue-journey';
import { grace, jiraData, person } from './mocks/jira-data';
import { jiraService } from './mocks/jira-service';

const timeoutMs = 20_000;

// Jira lets a service-desk customer and an app be assigned too; Argo offers only people.
const customer = {
  accountId: 'account-customer',
  displayName: 'A Customer',
  accountType: 'customer',
} as const;

const app = {
  accountId: 'account-app',
  displayName: 'Automation for Jira',
  accountType: 'app',
} as const;

const people = [person.displayName, grace.displayName];

const ada = { accountId: person.accountId, displayName: person.displayName };

/*
 * The site's people leave out Ada, who is signed in and is ARGO-3's assignee: Jira still lets her be assigned, so the
 * menu offers her and the fixture's write takes her.
 */
async function withCustomerAndApp(): ReturnType<typeof listed> {
  const data = jiraData();

  for (const site of data.sites) site.people = [grace, customer, app];

  return listed(await jiraService({ data }));
}

it(
  'offers only people as assignees, though Jira can assign customers and apps',
  async () => {
    const jira = await withCustomerAndApp();
    const filter = entries(jira.list, 'filter');
    const page = await jira.list.press(argoThree);

    expect(entries(page, 'assignee-menu')).toEqual(['Unassigned', ...people]);
    expect(filter).toEqual(expect.arrayContaining(people));
    expect(filter).not.toContain(customer.displayName);
    expect(filter).not.toContain(app.displayName);

    await page.press(keyed(`assign-${grace.accountId}`));
    expect(fixtureIssue(jira, 'ARGO-3').assignee).toEqual(grace);
    await page.press(keyed(`assign-${ada.accountId}`));
    expect(fixtureIssue(jira, 'ARGO-3').assignee).toEqual(ada);
  },
  timeoutMs,
);
