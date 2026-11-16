import { expect, it, vi } from 'vitest';
import {
  argoThree,
  entries,
  fixtureIssue,
  keyed,
  listed,
  shown,
} from './mocks/issue-journey';
import { grace, person } from './mocks/jira-data';
import { priorities, statuses } from './mocks/jira-workflow';

const timeoutMs = 20_000;

const { todo, doing, review, done } = statuses;

it(
  'offers only the statuses Jira allows, and shows the move while Jira answers',
  async () => {
    const jira = await listed();
    const page = await jira.list.press(argoThree);

    expect(entries(page, 'status-menu')).toEqual([
      todo.name,
      review.name,
      done.name,
    ]);

    const release = jira.jira.hold('transition');
    const moving = page.press(keyed(`move-${review.id}`));

    await vi.waitFor(() =>
      expect(jira.jira.calls('transition')).toHaveLength(1),
    );
    // Pending: the status shows where it is going before Jira answers.
    expect(shown(page).status).toBe(review.name);
    release();
    await moving;

    expect(fixtureIssue(jira, 'ARGO-3').status.name).toBe(review.name);
    expect(shown(page).status).toBe(review.name);
    expect(entries(page, 'status-menu')).toEqual([doing.name, done.name]);

    // The open list hears of it too.
    await jira.list.draw();
    expect(jira.list.findText(review.name)).toBeDefined();
  },
  timeoutMs,
);

it(
  'puts the status back with Jira’s reason when Jira refuses the transition',
  async () => {
    const jira = await listed();
    const page = await jira.list.press(argoThree);

    jira.jira.fail('transition', {
      status: 400,
      json: { errorMessages: ['Resolution is required.'], errors: {} },
    });

    await expect(page.press(keyed(`move-${done.id}`))).rejects.toThrow(
      'Resolution is required.',
    );
    expect(shown(page).status).toBe(doing.name);
    expect(fixtureIssue(jira, 'ARGO-3').status.name).toBe(doing.name);
  },
  timeoutMs,
);

it(
  'assigns an issue to someone, then to nobody',
  async () => {
    const jira = await listed();
    const page = await jira.list.press(argoThree);

    expect(entries(page, 'assignee-menu')).toEqual([
      'Unassigned',
      person.displayName,
      grace.displayName,
    ]);
    expect(page.find(keyed(`assign-${person.accountId}`)).props.selected).toBe(
      true,
    );

    await page.press(keyed(`assign-${grace.accountId}`));

    expect(shown(page).assignee).toBe(grace.displayName);
    expect(fixtureIssue(jira, 'ARGO-3').assignee).toEqual(grace);
    expect(page.find(keyed(`assign-${grace.accountId}`)).props.selected).toBe(
      true,
    );

    await page.press(keyed('assign-none'));

    expect(shown(page).assignee).toBe('Unassigned');
    expect(fixtureIssue(jira, 'ARGO-3').assignee).toBeNull();
  },
  timeoutMs,
);

it(
  'sets a priority, and puts it back with Jira’s reason when the write fails',
  async () => {
    const jira = await listed();
    const page = await jira.list.press(argoThree);

    const refusal =
      'You do not have permission to edit issues in this project.';

    expect(entries(page, 'priority-menu')).toEqual(
      priorities.map(({ name }) => name),
    );
    await page.press(keyed('priority-Low'));

    expect(shown(page).priority).toBe('Low');
    expect(fixtureIssue(jira, 'ARGO-3').priority).toBe('Low');

    jira.jira.fail('edit', {
      status: 403,
      json: { errorMessages: [refusal], errors: {} },
    });

    await expect(page.press(keyed('priority-Highest'))).rejects.toThrow(
      refusal,
    );
    expect(shown(page).priority).toBe('Low');
    expect(page.find(keyed('priority-Low')).props.selected).toBe(true);
  },
  timeoutMs,
);
