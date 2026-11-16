import { expect, it } from 'vitest';
import { fixtureIssue, listed, run } from './mocks/issue-journey';
import { arenaSite, person } from './mocks/jira-data';

const timeoutMs = 20_000;

const argoOne = 'ARGO-1';

const inProgress = 'In Progress';

it(
  'lists and reads issues as an Agent’s argo run does',
  async () => {
    const jira = await listed();

    expect(await run(jira, 'listIssues', { limit: 2 })).toMatchObject({
      project: 'ARGO',
      issues: [
        {
          key: 'ARGO-3',
          status: inProgress,
          movesTo: ['To Do', 'In Review', 'Done'],
        },
        { key: 'ARGO-2', status: 'Done', movesTo: ['To Do'] },
      ],
      more: true,
    });
    expect(await run(jira, 'getIssue', { issue: argoOne })).toMatchObject({
      key: argoOne,
      summary: 'Pick a Jira project for each Argo Project',
      status: 'To Do',
      assignee: null,
      movesTo: [inProgress],
      description: '',
      url: `https://${arenaSite.host}/browse/ARGO-1`,
    });
  },
  timeoutMs,
);

it(
  'moves, assigns and prioritises an issue as an Agent’s argo run does',
  async () => {
    const jira = await listed();

    expect(
      await run(jira, 'transition', { issue: argoOne, status: 'in progress' }),
    ).toEqual({ issue: argoOne, status: inProgress });
    expect(
      await run(jira, 'setAssignee', { issue: argoOne, assignee: 'me' }),
    ).toEqual({ issue: argoOne, assignee: person.accountId });
    expect(
      await run(jira, 'setPriority', { issue: argoOne, priority: 'highest' }),
    ).toEqual({ issue: argoOne, priority: 'Highest' });
    expect(fixtureIssue(jira, argoOne)).toMatchObject({
      status: { name: inProgress },
      assignee: { accountId: person.accountId },
      priority: 'Highest',
    });
  },
  timeoutMs,
);

it(
  'refuses a status Jira does not allow from the current one, naming where the issue can go',
  async () => {
    const jira = await listed();

    await expect(
      run(jira, 'transition', { issue: argoOne, status: 'Done' }),
    ).rejects.toThrow(
      'Jira doesn’t allow moving ARGO-1 from To Do to Done. It can move to In Progress.',
    );
    expect(jira.jira.calls('transition')).toEqual([]);
    expect(fixtureIssue(jira, argoOne).status.name).toBe('To Do');
  },
  timeoutMs,
);

it(
  'refuses a priority the site does not have, naming the ones it has',
  async () => {
    const jira = await listed();

    await expect(
      run(jira, 'setPriority', { issue: argoOne, priority: 'Urgent' }),
    ).rejects.toThrow(
      'Jira has no priority called Urgent. Its priorities are Highest, High, Medium, Low, Lowest.',
    );
  },
  timeoutMs,
);

it(
  'tells every open page a write landed, so the list reads Jira again',
  async () => {
    const jira = await listed();
    const searches = jira.jira.calls('search').length;

    await run(jira, 'setPriority', { issue: argoOne, priority: 'Low' });
    await jira.list.draw();

    expect(jira.jira.calls('search').length).toBeGreaterThan(searches);
    expect(jira.list.findText('Low')).toBeDefined();
  },
  timeoutMs,
);
