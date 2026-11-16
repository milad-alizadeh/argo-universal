import type { WireNode } from '@argo/plugin-kit/testing';
import { expect, it } from 'vitest';
import { startJira } from './mocks/journey';
import {
  argoIssues,
  filterChoice,
  filterCount,
  isChosen,
  listEmpty,
  renameIssue,
  searchCount,
  shownKeys,
} from './mocks/listing';

const timeoutMs = 30_000;

const issueList = (node: WireNode): boolean =>
  node.props.accessibilityLabel === 'Jira issues';

it(
  'reads Jira again on a pull, showing what changed there',
  async () => {
    const jira = await startJira();
    const page = await argoIssues(jira);
    const before = searchCount(jira);
    // Changed in Jira, where Argo cannot see it until it asks.
    renameIssue(jira, 'ARGO-3', 'Renamed in Jira');
    await page.act(issueList, 'onRefresh');

    expect(searchCount(jira)).toBe(before + 1);
    expect(page.findText('Renamed in Jira')).toBeDefined();
  },
  timeoutMs,
);

it(
  'keeps the Filter menu beside a refused filtered list, so the filter can be undone',
  async () => {
    const jira = await startJira();
    const page = await argoIssues(jira);

    // Someone who has since left: Jira refuses the JQL that names them, on every try.
    jira.jira.fail('search', {
      status: 400,
      json: {
        errorMessages: [
          "The value 'account-gone' does not exist for the field 'assignee'.",
        ],
      },
    });
    await page.press(filterChoice('Me'));

    expect(page.findText('Couldn’t read Jira')).toBeDefined();
    expect(isChosen(page, 'Me')).toBe(true);

    jira.jira.heal('search');
    await page.press(filterChoice('Anyone'));

    expect(shownKeys(page)).toEqual(['ARGO-3', 'ARGO-2', 'ARGO-1']);
    expect(page.pageState).toMatchObject({ assignee: 'anyone' });
  },
  timeoutMs,
);

it(
  'says why Jira refused the list in the list’s own empty state, with Try again',
  async () => {
    const jira = await startJira();
    const page = await argoIssues(jira);

    jira.jira.fail('search', { status: 500, json: {} });
    await page.act(issueList, 'onRefresh');

    const empty = listEmpty(page);

    expect(empty.type).toBe('EmptyState');
    expect(empty.props.title).toBe('Couldn’t read Jira');
    expect(page.findText('Clear filters')).toBeUndefined();

    jira.jira.heal('search');
    await page.press('Try again');

    expect(shownKeys(page)).toEqual(['ARGO-3', 'ARGO-2', 'ARGO-1']);
  },
  timeoutMs,
);

it(
  'still lists and filters when Jira won’t list the people, offering Anyone, Me and Unassigned',
  async () => {
    const jira = await startJira();

    // A token without read:jira-user.
    jira.jira.fail('people', {
      status: 401,
      json: { code: 401, message: 'Unauthorized; scope does not match' },
    });

    const page = await argoIssues(jira);

    expect(shownKeys(page)).toEqual(['ARGO-3', 'ARGO-2', 'ARGO-1']);
    expect(page.findText('Ada Lovelace')).toBeDefined();
    expect(() => page.find(filterChoice('Ada Lovelace'))).toThrow(
      'No node matches',
    );

    await page.press(filterChoice('Unassigned'));

    expect(shownKeys(page)).toEqual(['ARGO-1']);
  },
  timeoutMs,
);

it(
  'checks an assignee the menu does not name, so the badge never counts a hidden filter',
  async () => {
    const jira = await startJira();
    const page = await argoIssues(jira);

    const addressed = await jira.test.pages.open({
      path: page.path,
      pageState: { assignee: 'account-elsewhere' },
    });

    expect(addressed.findText('No issues match these filters')).toBeDefined();
    expect(isChosen(addressed, 'Someone else')).toBe(true);
    expect(filterCount(addressed)).toBe(1);
  },
  timeoutMs,
);
