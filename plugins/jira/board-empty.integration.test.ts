import { expect, it } from 'vitest';
import { boardLabel } from './board-columns';
import { drawsBoard, listed, onBoard, show } from './mocks/board';
import { fixtureIssue, run } from './mocks/issue-journey';
import { choose, projectPage, signIn, startJira } from './mocks/journey';
import { filterChoice, listEmpty } from './mocks/listing';

const timeoutMs = 30_000;

const reason = 'You do not have permission to browse ARGO.';

it(
  'says no issues match, with Clear filters, when the board’s filters leave none',
  async () => {
    const shown = await onBoard();
    const { page } = shown;

    await page.press(filterChoice('Done'));
    await page.press(filterChoice('Unassigned'));

    expect(drawsBoard(page)).toBe(false);
    expect(listEmpty(page).props.title).toBe('No issues match these filters');

    await page.press('Clear filters');

    expect(page.pageState).toMatchObject({ view: 'board' });
    expect(page.find(boardLabel).type).toBe('Board');
  },
  timeoutMs,
);

it(
  'shows Jira’s reason in place of the board when Jira refuses the list',
  async () => {
    const shown = await listed();

    shown.jira.fail('search', {
      status: 403,
      json: { errorMessages: [reason] },
    });
    await show(shown, 'board');

    // The statuses still read, but empty columns would hide why there are no cards.
    expect(shown.jira.calls('statuses').length).toBeGreaterThan(0);
    expect(drawsBoard(shown.page)).toBe(false);
    expect(listEmpty(shown.page).props.description).toBe(reason);
  },
  timeoutMs,
);

it(
  'says the project has no issues when Jira lists no statuses for the board either',
  async () => {
    const jira = await startJira();

    await signIn(jira);

    const page = await projectPage(jira);

    await choose(page, 'Jira project', 'QUIET');
    jira.jira.fail('statuses', {
      status: 403,
      json: { errorMessages: [reason] },
    });
    await show({ ...jira, page }, 'board');

    expect(drawsBoard(page)).toBe(false);
    expect(listEmpty(page).props.title).toBe('No issues in QUIET');
  },
  timeoutMs,
);

it(
  'refuses an assignee the project’s people do not include',
  async () => {
    const shown = await listed();

    await expect(
      run(shown, 'setAssignee', {
        issue: 'ARGO-3',
        assignee: 'account-stranger',
      }),
    ).rejects.toThrow("User 'account-stranger' cannot be assigned issues.");
    expect(fixtureIssue(shown, 'ARGO-3').assignee?.accountId).toBe(
      'account-ada',
    );
  },
  timeoutMs,
);
