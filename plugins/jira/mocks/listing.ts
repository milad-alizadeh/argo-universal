import type { OpenPage, WireNode } from '@argo/plugin-kit/testing';
import type { FixtureIssue } from './jira-data';
import { choose, projectPage, signIn, type Jira } from './journey';

// The search narrows the list once typing pauses for this long, as the App's does.
export const searchPauseMs = 300;

// A row of the issue list, by its issue key.
export const row =
  (key: string) =>
  (node: WireNode): boolean =>
    node.type === 'ListItem' && node.props.id === key;

// The issue keys the list shows, in order.
export function shownKeys(page: OpenPage): string[] {
  const keys: string[] = [];
  const visit = (node: WireNode): void => {
    if (node.type === 'ListItem' && typeof node.props.id === 'string')
      keys.push(node.props.id);
    node.children.forEach(visit);
  };

  visit(page.find((node) => node.props.accessibilityLabel === 'Jira issues'));

  return keys;
}

// One choice in the header's Filter menu, which the rows' own texts never match.
export const filterChoice =
  (label: string) =>
  (node: WireNode): boolean =>
    node.type === 'Action' && node.props.label === label;

const filterMenu = (node: WireNode): boolean =>
  node.type === 'Action' && node.props.label === 'Filter';

export const filterBadge = (page: OpenPage): unknown =>
  page.find(filterMenu).props.badge;

export const isChosen = (page: OpenPage, label: string): unknown =>
  page.find(filterChoice(label)).props.selected;

const screen = (node: WireNode): boolean => node.type === 'Screen';

// Types into the header search one character at a time, as a person does, each well inside the pause.
export async function search(
  { test }: Jira,
  page: OpenPage,
  text: string,
): Promise<void> {
  for (let typed = 1; typed <= text.length; typed += 1) {
    await page.act(screen, 'onChangeText', text.slice(0, typed));
    await test.clock.advance(50);
  }

  await test.clock.advance(searchPauseMs);
}

// The JQL each search Jira was sent asked for, in order.
export function searchedJql({ jira }: Jira): string[] {
  return jira.calls('search').map((call) => {
    const body: unknown = JSON.parse(call.body);

    return typeof body === 'object' && body !== null && 'jql' in body
      ? String(body.jql)
      : '';
  });
}

// A signed-in Project showing the ARGO project's issues.
export async function argoIssues(jira: Jira): Promise<OpenPage> {
  await signIn(jira);

  const page = await projectPage(jira);

  await choose(page, 'Jira project', 'ARGO');

  return page;
}

export const grace = { accountId: 'account-grace', displayName: 'Grace Hopper' };

// `count` more issues in ARGO, numbered from 100, each To Do and assigned to Grace Hopper.
export const manyIssues = (count: number): FixtureIssue[] =>
  Array.from({ length: count }, (_, index) => ({
    key: `ARGO-${100 + index}`,
    summary: `Bulk issue ${100 + index}`,
    status: { name: 'To Do', category: 'new' as const },
    assignee: grace,
    priority: null,
  }));

// Adds issues to the ARGO project of the fixture's first site.
export function addIssues({ jira }: Jira, issues: FixtureIssue[]): void {
  const argo = jira.data.sites[0]?.projects.find(({ key }) => key === 'ARGO');

  argo?.issues.push(...issues);
}
