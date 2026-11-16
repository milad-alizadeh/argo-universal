import type { OpenPage, WireNode } from '@argo/plugin-kit/testing';
import { at, parseJson, text, type Json } from '../json';
import type { FixtureIssue, FixtureProject } from './jira-data';
import { choose, projectPage, signIn, type Jira } from './journey';

// The search narrows the list once typing pauses for this long, as the App's does.
const searchPauseMs = 300;

// A keystroke well inside the pause.
const keystrokeMs = 50;

const issueList = (node: WireNode): boolean =>
  node.props.accessibilityLabel === 'Jira issues';

const rowKey = (node: WireNode): string[] =>
  node.type === 'ListItem' && typeof node.props.id === 'string'
    ? [node.props.id]
    : [];

// The issue keys the list shows, in order.
export const shownKeys = (page: OpenPage): string[] =>
  page.find(issueList).children.flatMap(rowKey);

// Whether the list offers to load more.
export const hasMore = (page: OpenPage): boolean =>
  at(page.find(issueList).props.pagination, 'hasMore') === true;

// One choice in the header's Filter menu, which the rows' own texts never match.
export const filterChoice =
  (label: string) =>
  (node: WireNode): boolean =>
    node.type === 'Action' && node.props.label === label;

const filterMenu = filterChoice('Filter');

// How many filters the Filter menu's badge counts, or 0 with no badge.
export const filterCount = (page: OpenPage): number =>
  Number(at(page.find(filterMenu).props.badge, 'count') ?? 0);

export const isChosen = (page: OpenPage, label: string): boolean =>
  page.find(filterChoice(label)).props.selected === true;

const screen = (node: WireNode): boolean => node.type === 'Screen';

export const searchShown = (page: OpenPage): string | null =>
  text(page.find(screen).props.value);

// Types into the header search one character at a time, as a person does, then waits for the pause.
export async function search(
  { test }: Jira,
  page: OpenPage,
  typed: string,
): Promise<void> {
  for (let length = 1; length <= typed.length; length += 1) {
    await page.act(screen, 'onChangeText', typed.slice(0, length));
    await test.clock.advance(keystrokeMs);
  }

  await test.clock.advance(searchPauseMs);
}

// The JSON body of the last search Jira was sent.
const lastSearch = ({ jira }: Jira): Json | undefined =>
  parseJson(jira.calls('search').at(-1)?.body ?? '');

export const lastJql = (jira: Jira): string | null =>
  text(at(lastSearch(jira), 'jql'));

// The cursor the last search read from, or null for a first page.
export const lastCursor = (jira: Jira): string | null =>
  text(at(lastSearch(jira), 'nextPageToken'));

export const searchCount = ({ jira }: Jira): number =>
  jira.calls('search').length;

// A signed-in Project showing the ARGO project's issues.
export async function argoIssues(jira: Jira): Promise<OpenPage> {
  await signIn(jira);

  const page = await projectPage(jira);

  await choose(page, 'Jira project', 'ARGO');

  return page;
}

export const grace = {
  accountId: 'account-grace',
  displayName: 'Grace Hopper',
};

const firstBulkNumber = 100;

const bulkIssue = (index: number): FixtureIssue => ({
  key: `ARGO-${firstBulkNumber + index}`,
  summary: `Bulk issue ${firstBulkNumber + index}`,
  status: { name: 'To Do', category: 'new' },
  assignee: grace,
  priority: null,
});

const argoProject = ({ jira }: Jira): FixtureProject | undefined =>
  jira.data.sites.at(0)?.projects.find(({ key }) => key === 'ARGO');

// Changes an ARGO issue's summary in the fixture Jira, as someone editing it there does.
export function renameIssue(jira: Jira, key: string, summary: string): void {
  const issue = argoProject(jira)?.issues.find((each) => each.key === key);

  if (issue) issue.summary = summary;
}

// Adds `count` issues to ARGO, numbered from ARGO-100, each To Do and assigned to Grace Hopper.
export function addIssues(jira: Jira, count: number): void {
  argoProject(jira)?.issues.push(
    ...Array.from({ length: count }, (_, at) => bulkIssue(at)),
  );
}
