import type { OpenPage, WireNode } from '@argo/plugin-kit/testing';
import { expect, it, vi } from 'vitest';
import { fieldKeys } from './issue-keys';
import { arenaSite, grace, person } from './mocks/jira-data';
import { priorities, statuses } from './mocks/jira-issue-routes';
import {
  choose,
  firstProject,
  projectPage,
  signIn,
  startJira,
  type Jira,
} from './mocks/journey';

const timeoutMs = 20_000;

const argoThree = 'Show Jira issues in Argo';

const argoOne = 'Pick a Jira project for each Argo Project';

// Signed in, with ARGO chosen for the first Project: its list, as the person sees it.
async function listed(): Promise<Jira & { list: OpenPage }> {
  const jira = await startJira();

  await signIn(jira);

  const list = await projectPage(jira);

  await choose(list, 'Jira project', 'ARGO');

  return { ...jira, list };
}

const keyed =
  (key: string) =>
  (node: WireNode): boolean =>
    node.key === key;

// What one of the issue's properties shows.
const field = (page: OpenPage, key: string): unknown =>
  page.find(keyed(key)).props.text;

const shown = (page: OpenPage) => ({
  status: field(page, fieldKeys.status),
  assignee: field(page, fieldKeys.assignee),
  priority: field(page, fieldKeys.priority),
});

const fixtureIssue = ({ jira }: Jira, key: string) => {
  const found = jira.data.sites[0]?.projects[0]?.issues.find(
    (issue) => issue.key === key,
  );

  if (!found) throw new Error(`The fixture has no ${key}`);

  return found;
};

// The labels of a header menu's entries.
function entries(page: OpenPage, menu: string): string[] {
  const found = page.find(keyed(menu));

  return found.children.flatMap((section) =>
    section.children.map((entry) => String(entry.props.label)),
  );
}

const containsText = (node: WireNode, text: string): boolean =>
  JSON.stringify(node).includes(text);

it(
  'opens an issue from its row and draws it at once from what the list read',
  async () => {
    const jira = await listed();
    const reads = jira.jira.requests.length;
    const page = await jira.list.press(argoThree);

    expect(page.path).toBe(`/projects/${firstProject.id}/issues/ARGO-3`);
    // Nothing new was asked of Jira: the row seeded the issue, and the list read the menus' choices.
    expect(jira.jira.requests.length).toBe(reads);

    expect(page.findText(argoThree)).toBeDefined();
    expect(shown(page)).toEqual({
      status: 'In Progress',
      assignee: person.displayName,
      priority: 'High',
    });
    expect(page.findText('spec-0027')).toBeDefined();
    expect(page.find(keyed(fieldKeys.status)).type).toBe('Metadata.StatusDot');
    expect(
      page.find((node) => node.type === 'Metadata.Link').props,
    ).toMatchObject({
      text: 'ARGO-3',
      href: `https://${arenaSite.host}/browse/ARGO-3`,
    });
    expect(page.find((node) => node.type === 'Detail').props.markdown).toBe(
      'List a project’s issues **in Argo**.\n\n- Key and summary\n- Status and assignee',
    );
    expect(containsText(page.tree, 'Loading')).toBe(false);
    expect(
      containsText(page.tree, '"Spinner"') ||
        containsText(page.tree, 'isLoading'),
    ).toBe(false);
  },
  timeoutMs,
);

it(
  'reads an issue opened by its address from Jira',
  async () => {
    const jira = await listed();
    const page = await jira.test.pages.open({
      path: `/projects/${firstProject.id}/issues/ARGO-2`,
    });

    expect(page.findText('Sign in with a scoped API token')).toBeDefined();
    expect(shown(page).status).toBe('Done');
  },
  timeoutMs,
);

it(
  'offers only the statuses Jira allows, and moves the issue at once while Jira answers',
  async () => {
    const jira = await listed();
    const page = await jira.list.press(argoThree);

    expect(entries(page, 'status-menu')).toEqual([
      statuses.todo.name,
      statuses.review.name,
      statuses.done.name,
    ]);

    const release = jira.jira.hold('transition');
    const moving = page.press(keyed(`move-${statuses.review.id}`));

    await vi.waitFor(() =>
      expect(jira.jira.calls('transition')).toHaveLength(1),
    );
    // Pending: the status shows where it is going before Jira answers.
    expect(shown(page).status).toBe(statuses.review.name);
    release();
    await moving;

    expect(fixtureIssue(jira, 'ARGO-3').status.name).toBe(statuses.review.name);
    expect(shown(page).status).toBe(statuses.review.name);
    expect(entries(page, 'status-menu')).toEqual([
      statuses.doing.name,
      statuses.done.name,
    ]);

    // The open list hears of it too.
    await jira.list.draw();
    expect(jira.list.findText(statuses.review.name)).toBeDefined();
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

    await expect(page.press(keyed(`move-${statuses.done.id}`))).rejects.toThrow(
      'Resolution is required.',
    );
    expect(shown(page).status).toBe('In Progress');
    expect(fixtureIssue(jira, 'ARGO-3').status.name).toBe('In Progress');
  },
  timeoutMs,
);

it(
  'assigns an issue to someone, and to nobody',
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
    expect(fixtureIssue(jira, 'ARGO-3').assignee?.accountId).toBe(
      grace.accountId,
    );
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
  'sets an issue’s priority, and puts it back with Jira’s reason when the write fails',
  async () => {
    const jira = await listed();
    const page = await jira.list.press(argoThree);

    expect(entries(page, 'priority-menu')).toEqual(
      priorities.map(({ name }) => name),
    );

    await page.press(keyed('priority-Low'));

    expect(shown(page).priority).toBe('Low');
    expect(fixtureIssue(jira, 'ARGO-3').priority).toBe('Low');

    jira.jira.fail('edit', {
      status: 403,
      json: {
        errorMessages: [
          'You do not have permission to edit issues in this project.',
        ],
        errors: {},
      },
    });

    await expect(page.press(keyed('priority-Highest'))).rejects.toThrow(
      'You do not have permission to edit issues in this project.',
    );
    expect(shown(page).priority).toBe('Low');
    expect(page.find(keyed('priority-Low')).props.selected).toBe(true);
  },
  timeoutMs,
);

it(
  'says why an issue Jira cannot find is missing, and reads it again on Try again',
  async () => {
    const jira = await listed();
    const page = await jira.test.pages.open({
      path: `/projects/${firstProject.id}/issues/ARGO-99`,
    });

    expect(page.findText('Jira couldn’t find this issue')).toBeDefined();
    expect(page.findText('Try again')).toBeDefined();
  },
  timeoutMs,
);

const run = (
  { test }: Jira,
  name: string,
  params: Record<string, string | number>,
) =>
  test.operations.run({
    name,
    params,
    caller: { projectId: firstProject.id },
  });

it(
  'runs every issue Operation as an Agent’s argo run does',
  async () => {
    const jira = await listed();

    expect(await run(jira, 'listIssues', { limit: 2 })).toMatchObject({
      project: 'ARGO',
      issues: [
        {
          key: 'ARGO-3',
          status: 'In Progress',
          movesTo: ['To Do', 'In Review', 'Done'],
        },
        { key: 'ARGO-2', status: 'Done' },
      ],
      more: true,
    });

    expect(await run(jira, 'getIssue', { issue: 'ARGO-1' })).toMatchObject({
      key: 'ARGO-1',
      summary: argoOne,
      status: 'To Do',
      assignee: null,
      movesTo: ['In Progress'],
      url: `https://${arenaSite.host}/browse/ARGO-1`,
    });

    expect(
      await run(jira, 'transition', { issue: 'ARGO-1', status: 'in progress' }),
    ).toEqual({ issue: 'ARGO-1', status: 'In Progress' });

    expect(
      await run(jira, 'setAssignee', { issue: 'ARGO-1', assignee: 'me' }),
    ).toEqual({ issue: 'ARGO-1', assignee: person.accountId });

    expect(
      await run(jira, 'setPriority', { issue: 'ARGO-1', priority: 'highest' }),
    ).toEqual({ issue: 'ARGO-1', priority: 'Highest' });

    expect(fixtureIssue(jira, 'ARGO-1')).toMatchObject({
      status: { name: 'In Progress' },
      assignee: { accountId: person.accountId },
      priority: 'Highest',
    });
  },
  timeoutMs,
);

it(
  'refuses a transition Jira does not allow from the current status, naming where the issue can go',
  async () => {
    const jira = await listed();

    await expect(
      run(jira, 'transition', { issue: 'ARGO-1', status: 'Done' }),
    ).rejects.toThrow(
      'Jira doesn’t allow moving ARGO-1 from To Do to Done. It can move to In Progress.',
    );
    expect(jira.jira.calls('transition')).toEqual([]);
    expect(fixtureIssue(jira, 'ARGO-1').status.name).toBe('To Do');
  },
  timeoutMs,
);

it(
  'tells every open page a write landed, so the list reads Jira again',
  async () => {
    const jira = await listed();
    const searches = jira.jira.calls('search').length;

    await run(jira, 'setPriority', { issue: 'ARGO-1', priority: 'Low' });
    await jira.list.draw();

    expect(jira.jira.calls('search').length).toBeGreaterThan(searches);
    expect(jira.list.findText('Low')).toBeDefined();
  },
  timeoutMs,
);
