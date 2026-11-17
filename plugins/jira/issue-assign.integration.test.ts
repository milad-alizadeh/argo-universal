import type { OpenPage } from '@argo/plugin-kit/testing';
import { expect, it, vi } from 'vitest';
import {
  argoThree,
  entries,
  fixtureIssue,
  keyed,
  listed,
  shown,
  type Listed,
} from './mocks/issue-journey';
import { grace, person } from './mocks/jira-data';
import { priorities } from './mocks/jira-workflow';

const timeoutMs = 20_000;

const checked = (page: OpenPage, key: string): boolean =>
  page.find(keyed(key)).props.selected === true;

const ada = `assign-${person.accountId}`;

const gracesKey = `assign-${grace.accountId}`;

// Presses a menu entry while Jira holds the write, and answers what the page shows until Jira answers.
async function pending(
  jira: Listed,
  { page, route, key }: { page: OpenPage; route: string; key: string },
): Promise<{ release: () => void; answered: Promise<OpenPage> }> {
  const release = jira.jira.hold(route);
  const answered = page.press(keyed(key));

  await vi.waitFor(() => expect(jira.jira.calls(route)).toHaveLength(1));

  return { release, answered };
}

it(
  'shows a new assignee and its check while Jira answers, and assigns nobody',
  async () => {
    const jira = await listed();
    const page = await jira.list.press(argoThree);

    expect(entries(page, 'assignee-menu')).toEqual([
      'Unassigned',
      person.displayName,
      grace.displayName,
    ]);
    expect(checked(page, ada)).toBe(true);

    const write = await pending(jira, {
      page,
      route: 'assign',
      key: gracesKey,
    });

    expect(shown(page).assignee).toBe(grace.displayName);
    expect([checked(page, gracesKey), checked(page, ada)]).toEqual([
      true,
      false,
    ]);
    write.release();
    await write.answered;
    expect(fixtureIssue(jira, 'ARGO-3').assignee).toEqual(grace);

    await page.press(keyed('assign-none'));
    expect(shown(page).assignee).toBe('Unassigned');
    expect(fixtureIssue(jira, 'ARGO-3').assignee).toBeNull();
  },
  timeoutMs,
);

it(
  'puts the assignee and its check back when Jira refuses the assignee',
  async () => {
    const jira = await listed();
    const page = await jira.list.press(argoThree);

    const write = await pending(jira, {
      page,
      route: 'assign',
      key: gracesKey,
    });

    expect(shown(page).assignee).toBe(grace.displayName);
    jira.jira.fail('assign', {
      status: 400,
      json: { errorMessages: ['User cannot be assigned issues.'], errors: {} },
    });
    write.release();

    await expect(write.answered).rejects.toThrow(
      'User cannot be assigned issues.',
    );
    expect(shown(page).assignee).toBe(person.displayName);
    expect([checked(page, gracesKey), checked(page, ada)]).toEqual([
      false,
      true,
    ]);
  },
  timeoutMs,
);

it(
  'shows a new priority while Jira answers, and puts it back when the write fails',
  async () => {
    const jira = await listed();
    const page = await jira.list.press(argoThree);

    const refusal =
      'You do not have permission to edit issues in this project.';

    expect(entries(page, 'priority-menu')).toEqual(
      priorities.map(({ name }) => name),
    );

    const write = await pending(jira, {
      page,
      route: 'edit',
      key: 'priority-Highest',
    });

    expect(shown(page).priority).toBe('Highest');
    expect(checked(page, 'priority-Highest')).toBe(true);
    expect(checked(page, 'priority-High')).toBe(false);
    jira.jira.fail('edit', { status: 403, json: { errorMessages: [refusal] } });
    write.release();

    await expect(write.answered).rejects.toThrow(refusal);
    expect(shown(page).priority).toBe('High');
    expect(checked(page, 'priority-High')).toBe(true);
    expect(fixtureIssue(jira, 'ARGO-3').priority).toBe('High');
  },
  timeoutMs,
);
