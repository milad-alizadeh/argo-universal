import { expect, it } from 'vitest';
import { startJira } from './mocks/journey';
import {
  addIssues,
  argoIssues,
  filterChoice,
  filterCount,
  grace,
  isChosen,
  lastJql,
  search,
  searchCount,
  searchShown,
  shownKeys,
} from './mocks/listing';

const timeoutMs = 30_000;

it(
  'narrows the list to one status category from the Filter menu',
  async () => {
    const jira = await startJira();
    const page = await argoIssues(jira);

    expect(isChosen(page, 'Any status')).toBe(true);
    expect(filterCount(page)).toBe(0);

    await page.press(filterChoice('Done'));

    expect(shownKeys(page)).toEqual(['ARGO-2']);
    expect(isChosen(page, 'Done')).toBe(true);
    expect(filterCount(page)).toBe(1);
    expect(lastJql(jira)).toBe(
      'project = "ARGO" AND statusCategory = "Done" ORDER BY updated DESC',
    );

    await page.press(filterChoice('To Do'));

    expect(shownKeys(page)).toEqual(['ARGO-1']);
  },
  timeoutMs,
);

it(
  'narrows the list to my issues, unassigned ones, or one person’s',
  async () => {
    const jira = await startJira();

    addIssues(jira, 1);

    const page = await argoIssues(jira);

    await page.press(filterChoice('Me'));

    expect(shownKeys(page)).toEqual(['ARGO-3', 'ARGO-2']);
    expect(lastJql(jira)).toContain('assignee = currentUser()');

    await page.press(filterChoice('Unassigned'));

    expect(shownKeys(page)).toEqual(['ARGO-1']);

    // The menu names the people the project can assign to.
    await page.press(filterChoice(grace.displayName));

    expect(shownKeys(page)).toEqual(['ARGO-100']);
    expect(isChosen(page, grace.displayName)).toBe(true);
  },
  timeoutMs,
);

it(
  'searches once typing pauses, reading Jira once and not once per keystroke',
  async () => {
    const jira = await startJira();
    const page = await argoIssues(jira);
    const before = searchCount(jira);

    await search(jira, page, 'jira issues');

    expect(searchCount(jira)).toBe(before + 1);
    expect(lastJql(jira)).toBe(
      'project = "ARGO" AND text ~ "jira issues" ORDER BY updated DESC',
    );
    expect(shownKeys(page)).toEqual(['ARGO-3']);
    expect(page.pageState).toMatchObject({ text: 'jira issues' });
    expect(filterCount(page)).toBe(1);
  },
  timeoutMs,
);

it(
  'reads Jira once for each filter change, and puts every filter in one search',
  async () => {
    const jira = await startJira();
    const page = await argoIssues(jira);
    const before = searchCount(jira);

    await page.press(filterChoice('In Progress'));
    expect(searchCount(jira)).toBe(before + 1);

    await page.press(filterChoice('Me'));
    expect(searchCount(jira)).toBe(before + 2);

    await search(jira, page, 'argo');

    expect(searchCount(jira)).toBe(before + 3);
    expect(lastJql(jira)).toBe(
      'project = "ARGO" AND statusCategory = "In Progress" AND assignee = currentUser() AND text ~ "argo" ORDER BY updated DESC',
    );
    expect(shownKeys(page)).toEqual(['ARGO-3']);
    expect(filterCount(page)).toBe(3);
  },
  timeoutMs,
);

it(
  'reads search operators a person types as the words around them',
  async () => {
    const jira = await startJira();
    const page = await argoIssues(jira);

    await search(jira, page, 'sign-in "token"');

    expect(lastJql(jira)).toContain('text ~ "sign in token"');
  },
  timeoutMs,
);

it(
  'shows the same filtered view on going back, from the issues it already read',
  async () => {
    const jira = await startJira();
    const page = await argoIssues(jira);

    await page.press(filterChoice('Done'));
    await search(jira, page, 'token');

    const filtered = page.pageState;

    const before = searchCount(jira);

    // Away to another page, then back: the App opens the address it left, filters and all.
    await page.press('Change Jira site');

    const back = await jira.test.pages.open({
      path: page.path,
      pageState: filtered,
    });

    expect(shownKeys(back)).toEqual(['ARGO-2']);
    expect(isChosen(back, 'Done')).toBe(true);
    expect(searchShown(back)).toBe('token');
    expect(searchCount(jira)).toBe(before);
  },
  timeoutMs,
);

it(
  'says when the filters leave no issues, and clears them',
  async () => {
    const jira = await startJira();
    const page = await argoIssues(jira);

    await search(jira, page, 'nothing like this');

    expect(page.findText('No issues match these filters')).toBeDefined();
    expect(page.findText('No issues in ARGO')).toBeUndefined();

    await page.press('Clear filters');

    expect(shownKeys(page)).toEqual(['ARGO-3', 'ARGO-2', 'ARGO-1']);
    expect(page.pageState).toMatchObject({
      status: 'all',
      assignee: 'anyone',
      text: '',
    });
  },
  timeoutMs,
);
