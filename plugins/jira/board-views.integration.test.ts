import { expect, it } from 'vitest';
import { boardLabel } from './board-columns';
import {
  argoOne,
  argoThree,
  columnOf,
  columnTitles,
  drawsBoard,
  listed,
  onBoard,
  show,
  viewSwitch,
} from './mocks/board';
import { statuses } from './mocks/jira-issue-routes';
import { firstProject } from './mocks/journey';

const timeoutMs = 20_000;

const listLabel = 'Jira issues';

const projectPath = `/projects/${firstProject.id}`;

// Grouped by category: to do, then in progress, then done.
const grouped = [
  statuses.todo.name,
  statuses.doing.name,
  statuses.review.name,
  statuses.done.name,
];

it(
  'switches the issues between a list and a board',
  async () => {
    const shown = await listed();
    const { page } = shown;

    expect(page.find(viewSwitch).props.value).toBe('list');
    expect(page.find(listLabel).type).toBe('List');
    expect(drawsBoard(page)).toBe(false);
    // The list asks Jira for no statuses: only the board draws them.
    expect(shown.jira.calls('statuses')).toHaveLength(0);

    await show(shown, 'board');

    expect(page.pageState).toMatchObject({ view: 'board' });
    expect(page.find(viewSwitch).props.value).toBe('board');
    expect(page.find(boardLabel).type).toBe('Board');
    expect(page.findText(listLabel)).toBeUndefined();

    await show(shown, 'list');

    expect(page.find(listLabel).type).toBe('List');
    expect(drawsBoard(page)).toBe(false);
  },
  timeoutMs,
);

it(
  'draws a column for each of the project’s statuses, grouped by category, with each card in its status',
  async () => {
    const { page } = await onBoard();

    // Jira lists Done before In Review.
    expect(columnTitles(page)).toEqual(grouped);
    expect(columnOf(page, argoOne)).toBe(statuses.todo.name);
    expect(columnOf(page, argoThree)).toBe(statuses.doing.name);
    expect(columnOf(page, 'Sign in with a scoped API token')).toBe(
      statuses.done.name,
    );
    // Each card names as its moves the statuses Jira allows from its own.
    expect(page.find(argoOne).props.movesTo).toEqual([statuses.doing.id]);
    expect(page.find(argoThree).props.movesTo).toEqual([
      statuses.todo.id,
      statuses.review.id,
      statuses.done.id,
    ]);
  },
  timeoutMs,
);

it(
  'keeps the board when the person opens a card and comes back',
  async () => {
    const shown = await onBoard();
    const issue = await shown.page.press(argoOne);

    expect(issue.path).toBe(`${projectPath}/issues/ARGO-1`);

    // The App keeps a page's Page state with its address, so coming back opens it as it was left.
    const back = await shown.test.pages.open({
      path: projectPath,
      pageState: shown.page.pageState,
    });

    expect(back.find(boardLabel).type).toBe('Board');
    expect(back.find(viewSwitch).props.value).toBe('board');
  },
  timeoutMs,
);

it(
  'draws the columns its issues show when Jira does not list the project’s statuses',
  async () => {
    const shown = await listed();

    shown.jira.fail('statuses', {
      status: 403,
      json: { errorMessages: ['You do not have permission.'] },
    });

    await show(shown, 'board');

    // No issue is in In Review, but ARGO-3 may move to it.
    expect(columnTitles(shown.page)).toEqual(grouped);
    expect(columnOf(shown.page, argoThree)).toBe(statuses.doing.name);
  },
  timeoutMs,
);
