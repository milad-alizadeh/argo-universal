import type { WireNode } from '@argo/plugin-kit/testing';
import { expect, it, vi } from 'vitest';
import { fieldKeys } from './issue-keys';
import {
  argoThree,
  entries,
  fixtureIssue,
  keyed,
  listed,
  shown,
} from './mocks/issue-journey';
import { statuses, transitions } from './mocks/jira-workflow';

const timeoutMs = 20_000;

const { todo, doing, review, done } = statuses;

const moveTo = (id: string): ReturnType<typeof keyed> => keyed(`move-${id}`);

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
    const moving = page.press(moveTo(transitions.review.id));

    await vi.waitFor(() =>
      expect(jira.jira.calls('transition')).toHaveLength(1),
    );
    // Pending: the status shows where it is going before Jira answers.
    expect(shown(page).status).toBe(review.name);
    release();
    await moving;

    expect(fixtureIssue(jira, 'ARGO-3').status.name).toBe(review.name);
    expect(shown(page).status).toBe(review.name);
    // In Review's looped, unavailable and second Done transitions are not offered.
    expect(entries(page, 'status-menu')).toEqual([doing.name, done.name]);

    // The open list hears of it too.
    await jira.list.draw();
    expect(jira.list.findText(review.name)).toBeDefined();
  },
  timeoutMs,
);

it(
  'paints the status dot in the tone of the status it leads to while Jira answers',
  async () => {
    const jira = await listed();
    const page = await jira.list.press(argoThree);

    const dot = (): WireNode['props'][string] =>
      page.find(keyed(fieldKeys.status)).props.dot;

    expect(dot()).toBe('info');

    const release = jira.jira.hold('transition');
    const moving = page.press(moveTo(transitions.finish.id));

    await vi.waitFor(() =>
      expect(jira.jira.calls('transition')).toHaveLength(1),
    );
    // Pending: Done's category, not In Progress's, before Jira answers.
    expect(dot()).toBe('done');
    release();
    await moving;
  },
  timeoutMs,
);

it(
  'sends Jira the transition’s own id, not the id of the status it leads to',
  async () => {
    const jira = await listed();
    const page = await jira.list.press(argoThree);

    await page.press(moveTo(transitions.finish.id));

    const [sent] = jira.jira.calls('transition');

    expect(JSON.parse(sent?.body ?? '{}')).toEqual({
      transition: { id: transitions.finish.id },
    });
    expect(fixtureIssue(jira, 'ARGO-3').status.name).toBe(done.name);
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

    await expect(page.press(moveTo(transitions.finish.id))).rejects.toThrow(
      'Resolution is required.',
    );
    expect(shown(page).status).toBe(doing.name);
    expect(fixtureIssue(jira, 'ARGO-3').status.name).toBe(doing.name);
  },
  timeoutMs,
);
