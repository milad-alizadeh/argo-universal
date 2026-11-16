import { expect, it } from 'vitest';
import { startJira } from './mocks/journey';
import {
  addIssues,
  argoIssues,
  filterBadge,
  filterChoice,
  grace,
  isChosen,
  manyIssues,
  search,
  searchedJql,
  shownKeys,
} from './mocks/listing';

const timeoutMs = 30_000;

it(
  'narrows the list to one status category from the Filter menu',
  async () => {
    const jira = await startJira();
    const page = await argoIssues(jira);

    expect(isChosen(page, 'Any status')).toBe(true);
    expect(filterBadge(page)).toBeUndefined();

    await page.press(filterChoice('Done'));

    expect(shownKeys(page)).toEqual(['ARGO-2']);
    expect(isChosen(page, 'Done')).toBe(true);
    expect(filterBadge(page)).toEqual({ kind: 'count', count: 1 });
    expect(searchedJql(jira).at(-1)).toBe(
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

    addIssues(jira, manyIssues(1));

    const page = await argoIssues(jira);

    await page.press(filterChoice('Me'));

    expect(shownKeys(page)).toEqual(['ARGO-3', 'ARGO-2']);
    expect(searchedJql(jira).at(-1)).toContain('assignee = currentUser()');

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
    const before = jira.jira.calls('search').length;

    await search(jira, page, 'jira issues');

    expect(jira.jira.calls('search')).toHaveLength(before + 1);
    expect(searchedJql(jira).at(-1)).toBe(
      'project = "ARGO" AND text ~ "jira issues" ORDER BY updated DESC',
    );
    expect(shownKeys(page)).toEqual(['ARGO-3']);
    expect(page.pageState).toMatchObject({ text: 'jira issues' });
    expect(filterBadge(page)).toEqual({ kind: 'count', count: 1 });
  },
  timeoutMs,
);

it(
  'reads Jira once for a filter change, and puts every filter in one search',
  async () => {
    const jira = await startJira();
    const page = await argoIssues(jira);
    const before = jira.jira.calls('search').length;

    await page.press(filterChoice('In Progress'));
    expect(jira.jira.calls('search')).toHaveLength(before + 1);

    await page.press(filterChoice('Me'));
    expect(jira.jira.calls('search')).toHaveLength(before + 2);

    await search(jira, page, 'argo');

    expect(jira.jira.calls('search')).toHaveLength(before + 3);
    expect(searchedJql(jira).at(-1)).toBe(
      'project = "ARGO" AND statusCategory = "In Progress" AND assignee = currentUser() AND text ~ "argo" ORDER BY updated DESC',
    );
    expect(shownKeys(page)).toEqual(['ARGO-3']);
    expect(filterBadge(page)).toEqual({ kind: 'count', count: 3 });
  },
  timeoutMs,
);

it(
  'reads search operators a person types as the words around them',
  async () => {
    const jira = await startJira();
    const page = await argoIssues(jira);

    await search(jira, page, 'sign-in "token"');

    expect(searchedJql(jira).at(-1)).toContain('text ~ "sign in token"');
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

    // Away to another page, then back: the App opens the address it left, filters and all.
    await page.press('Change Jira site');

    const searches = jira.jira.calls('search').length;
    const back = await jira.test.pages.open({
      path: page.path,
      pageState: filtered,
    });

    expect(shownKeys(back)).toEqual(['ARGO-2']);
    expect(isChosen(back, 'Done')).toBe(true);
    expect(back.find((node) => node.type === 'Screen').props.value).toBe(
      'token',
    );
    expect(jira.jira.calls('search')).toHaveLength(searches);
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

it(
  'loads more a page at a time from Jira’s cursor, until the last',
  async () => {
    const jira = await startJira();

    addIssues(jira, manyIssues(117));

    const page = await argoIssues(jira);

    expect(shownKeys(page)).toHaveLength(50);
    expect(jira.jira.calls('search').at(-1)?.body).not.toContain(
      'nextPageToken',
    );

    await page.loadMore();

    expect(shownKeys(page)).toHaveLength(100);
    expect(JSON.parse(jira.jira.calls('search').at(-1)?.body ?? '')).toEqual(
      expect.objectContaining({ nextPageToken: '50' }),
    );

    const searches = jira.jira.calls('search').length;

    await page.loadMore();

    // Only the page it lacked was read.
    expect(jira.jira.calls('search')).toHaveLength(searches + 1);
    expect(shownKeys(page)).toHaveLength(120);
    expect(shownKeys(page).at(-1)).toBe('ARGO-216');
    expect(
      page.find((node) => node.props.accessibilityLabel === 'Jira issues')
        .props.pagination,
    ).toMatchObject({ hasMore: false });
  },
  timeoutMs,
);

it(
  'loads more of a filtered list, paging through what the filters leave',
  async () => {
    const jira = await startJira();

    addIssues(jira, manyIssues(60));

    const page = await argoIssues(jira);

    await page.press(filterChoice('To Do'));

    expect(shownKeys(page)).toHaveLength(50);

    await page.loadMore();

    expect(shownKeys(page)).toHaveLength(61);
    expect(searchedJql(jira).at(-1)).toContain('statusCategory = "To Do"');
  },
  timeoutMs,
);

const failures = [
  {
    name: 'no permission',
    answer: {
      status: 403,
      json: { errorMessages: ['You do not have permission to browse ARGO.'] },
    },
    title: 'Jira refused this',
    message: 'You do not have permission to browse ARGO.',
  },
  {
    name: 'a scoped token without the scope',
    answer: {
      status: 401,
      json: { code: 401, message: 'Unauthorized; scope does not match' },
    },
    title: 'Jira refused this',
    message:
      'Your API token doesn’t have the scopes this needs. Create a token with the Jira scopes on the sign-in page, then sign in with it.',
  },
  {
    name: 'the project gone',
    answer: {
      status: 400,
      json: {
        errorMessages: [
          "The value 'ARGO' does not exist for the field 'project'.",
        ],
      },
    },
    title: 'Jira couldn’t find this project',
    message:
      'This Jira project is gone, or your Atlassian account can no longer see it. Choose another Jira project.',
  },
  {
    name: 'rate limited',
    answer: { status: 429, text: 'Rate limit exceeded.' },
    title: 'Jira is busy',
    message:
      'Jira is limiting how often Argo can ask right now. Try again in a minute.',
  },
] as const;

it.each(failures)(
  'names Jira’s reason when the list fails: $name',
  async ({ answer, title, message }) => {
    const jira = await startJira();
    const page = await argoIssues(jira);

    await page.press(filterChoice('Done'));
    jira.jira.fail('search', answer);
    await page.press(filterChoice('To Do'));

    expect(page.findText(title)).toBeDefined();
    expect(page.findText(message)).toBeDefined();
    expect(page.findText('No issues match these filters')).toBeUndefined();

    jira.jira.heal('search');
    await page.press('Try again');

    expect(shownKeys(page)).toEqual(['ARGO-1']);
  },
  timeoutMs,
);

it(
  'names Jira’s reason when a load more fails, and reads that page again on the next',
  async () => {
    const jira = await startJira();

    addIssues(jira, manyIssues(60));

    const page = await argoIssues(jira);

    jira.jira.fail('search', { status: 429, text: 'Rate limit exceeded.' });

    await page.loadMore();

    // The App keeps the rows it shows and says why the draw failed.
    expect(page.error).toContain(
      'Jira is limiting how often Argo can ask right now.',
    );

    // The failed page kept no answer, so asking for it again reads Jira again.
    jira.jira.heal('search');
    await page.draw(2);

    expect(page.error).toBeUndefined();
    expect(shownKeys(page)).toHaveLength(63);
  },
  timeoutMs,
);

it(
  'shows the signed-out page when a filtered read finds the token refused',
  async () => {
    const jira = await startJira();
    const page = await argoIssues(jira);

    jira.jira.data.tokens.splice(0);
    await page.press(filterChoice('Done'));

    expect(page.findText('Sign in to Jira')).toBeDefined();
    expect(page.findText('Jira no longer accepts this sign-in.')).toBeDefined();
  },
  timeoutMs,
);
