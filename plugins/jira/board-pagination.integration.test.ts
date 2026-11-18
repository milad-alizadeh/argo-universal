import type { OpenPage, WireNode } from '@argo/plugin-kit/testing';
import { expect, it } from 'vitest';
import { listed, show } from './mocks/board';
import { statuses } from './mocks/jira-workflow';
import {
  addIssues,
  filterBy,
  lastCursor,
  search,
  searchCount,
} from './mocks/listing';

const columnNamed = (page: OpenPage, id: string): WireNode =>
  page.find((node) => node.type === 'Board.Column' && node.props.id === id);

const timeoutMs = 30_000;

const countRoute = 'approximate-count';

it(
  'appends filtered Jira pages while keeping the estimated totals per status',
  async () => {
    const shown = await listed();
    const { page, jira } = shown;
    addIssues(shown, 60);
    expect(jira.calls(countRoute)).toHaveLength(0);

    await filterBy(page, 'To Do');
    await filterBy(page, 'Grace Hopper');
    await search(shown, page, 'Bulk issue');
    await show(shown, 'board');

    expect(columnNamed(page, statuses.todo.id).props.count).toBe(60);
    expect(columnNamed(page, statuses.todo.id).children).toHaveLength(50);
    expect(columnNamed(page, statuses.done.id).props.count).toBe(0);

    const countCalls = jira.calls(countRoute);
    expect(countCalls).toHaveLength(Object.keys(statuses).length);

    const jql =
      'project = "ARGO" AND statusCategory = 2 AND assignee = "account-grace" AND text ~ "Bulk issue" AND status = "1"';

    expect(countCalls.map(({ body }) => body)).toContain(
      JSON.stringify({ jql }),
    );

    const searches = searchCount(shown);
    await page.press('Load more issues');

    expect(lastCursor(shown)).toBe('50');
    expect(searchCount(shown)).toBe(searches + 1);
    expect(jira.calls(countRoute)).toHaveLength(countCalls.length);
    expect(columnNamed(page, statuses.todo.id).children).toHaveLength(60);
    expect(columnNamed(page, statuses.todo.id).props.count).toBe(60);
    expect(page.findText('Load more issues')).toBeUndefined();
  },
  timeoutMs,
);

it(
  'keeps the board and its cards when Jira refuses an estimated count',
  async () => {
    const shown = await listed();
    shown.jira.fail(countRoute, { status: 403 });

    await show(shown, 'board');

    const todo = columnNamed(shown.page, statuses.todo.id);
    expect(todo.props.count).toBeUndefined();
    expect(todo.children).toHaveLength(1);
  },
  timeoutMs,
);
