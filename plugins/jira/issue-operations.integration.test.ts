import { expect, it } from 'vitest';
import { fixtureIssue, listed, run, type Listed } from './mocks/issue-journey';
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
        // Jira's global transition to In Progress is a move from Done, and is left out from In Progress itself.
        { key: 'ARGO-2', status: 'Done', movesTo: ['To Do', inProgress] },
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

const quietIssue = {
  key: 'QUIET-1',
  summary: 'Another team’s issue',
  status: { name: 'To Do', category: 'new' },
  assignee: null,
  priority: 'Low',
} as const;

// Files an issue in QUIET, the site's other Jira project.
function fileInQuiet({ jira }: Listed): void {
  const projects = jira.data.sites.flatMap((site) => site.projects);

  projects.find(({ key }) => key === 'QUIET')?.issues.push({ ...quietIssue });
}

// Each issue Operation, with what it needs besides the issue.
const quietRuns: [string, Record<string, string>][] = [
  ['getIssue', {}],
  ['transition', { status: inProgress }],
  ['setAssignee', { assignee: 'me' }],
  ['setPriority', { priority: 'High' }],
];

it(
  'refuses an issue outside the Jira project this Project shows, and writes nothing',
  async () => {
    const jira = await listed();

    const refusal =
      'QUIET-1 is in the Jira project QUIET, not ARGO, the one this Project shows.';

    fileInQuiet(jira);

    for (const [name, params] of quietRuns)
      await expect(
        run(jira, name, { issue: quietIssue.key, ...params }),
      ).rejects.toThrow(refusal);

    expect(jira.jira.calls('transition')).toEqual([]);
    expect(jira.jira.calls('assign')).toEqual([]);
    expect(jira.jira.calls('edit')).toEqual([]);
  },
  timeoutMs,
);
