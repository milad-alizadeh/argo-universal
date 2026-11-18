import { expect, it } from 'vitest';
import { boardLabel } from './board-columns';
import {
  argoOne,
  argoThree,
  columnOf,
  fixtureIssue,
  listed,
  onBoard,
} from './mocks/board';
import { statuses } from './mocks/jira-workflow';
import { firstProject } from './mocks/journey';

const timeoutMs = 20_000;

const reason = 'A reviewer must approve this issue first.';

it(
  'moves a card to another status through the transition Operation',
  async () => {
    const shown = await onBoard();
    const { page } = shown;

    await page.act(boardLabel, 'onMove', {
      id: 'ARGO-1',
      column: statuses.doing.id,
    });

    expect(shown.jira.calls('transition')).toHaveLength(1);
    expect(fixtureIssue(shown, 'ARGO-1').status.name).toBe(statuses.doing.name);
    // Drawn again from Jira: the card is written in its new column, with no move pending and its new moves.
    expect(columnOf(page, argoOne)).toBe(statuses.doing.name);
    expect(page.find(argoOne).props.pending).toBeUndefined();
    expect(page.find(argoOne).props.movesTo).toContain(statuses.review.id);
  },
  timeoutMs,
);

it(
  'refuses a drop on a status Jira does not allow from the card’s, without asking Jira',
  async () => {
    const shown = await onBoard();
    const { page } = shown;

    await expect(
      page.act(boardLabel, 'onMove', {
        id: 'ARGO-1',
        column: statuses.done.id,
      }),
    ).rejects.toThrow(`${argoOne} can't move to Done`);

    expect(shown.jira.calls('transition')).toHaveLength(0);
    expect(columnOf(page, argoOne)).toBe(statuses.todo.name);
  },
  timeoutMs,
);

it(
  'puts the card back with Jira’s reason when Jira refuses the transition',
  async () => {
    const shown = await onBoard();
    const { page } = shown;

    shown.jira.fail('transition', {
      status: 400,
      json: { errorMessages: [reason], errors: {} },
    });

    await expect(
      page.act(boardLabel, 'onMove', {
        id: 'ARGO-1',
        column: statuses.doing.id,
      }),
    ).rejects.toThrow(reason);

    expect(fixtureIssue(shown, 'ARGO-1').status.name).toBe(statuses.todo.name);
    expect(columnOf(page, argoOne)).toBe(statuses.todo.name);
    expect(page.find(argoOne).props).not.toHaveProperty('pending');
  },
  timeoutMs,
);

it(
  'moves a card on a phone, whose card menu reports the same move',
  async () => {
    const shown = await listed();

    const phone = await shown.test.pages.open({
      path: `/projects/${firstProject.id}`,
      pageState: { view: 'board' },
      platform: 'ios',
    });

    expect(phone.find(argoThree).props.movesTo).toContain(statuses.review.id);

    await phone.act(boardLabel, 'onMove', {
      id: 'ARGO-3',
      column: statuses.review.id,
    });

    expect(fixtureIssue(shown, 'ARGO-3').status.name).toBe(
      statuses.review.name,
    );
    expect(columnOf(phone, argoThree)).toBe(statuses.review.name);
  },
  timeoutMs,
);
