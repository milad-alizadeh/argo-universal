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

// What the list draws in place of its rows.
export function listEmpty(page: OpenPage): WireNode {
  const [empty] = page.find(issueList).slots.empty ?? [];

  if (!empty) throw new Error('The list draws nothing in place of its rows');

  return empty;
}

// Whether the list offers to load more.
export const hasMore = (page: OpenPage): boolean =>
  at(page.find(issueList).props.pagination, 'hasMore') === true;

const screen = (node: WireNode): boolean => node.type === 'Screen';

// Every node of the page, its slots' among them, such as the header's options.
const allNodes = (node: WireNode): WireNode[] => [
  node,
  ...node.children.flatMap(allNodes),
  ...Object.values(node.slots).flat().flatMap(allNodes),
];

const isPicker = (node: WireNode): boolean => node.type === 'FieldGroup.Picker';

type Option = { value: string; label: string };

const optionsOf = (picker: WireNode): Option[] => {
  const options = picker.props.options;

  return Array.isArray(options)
    ? options.flatMap((each) =>
        typeof at(each, 'value') === 'string'
          ? [
              {
                value: String(at(each, 'value')),
                label: text(at(each, 'label')) ?? '',
              },
            ]
          : [],
      )
    : [];
};

// The labels a row of the header's options offers, by its title, such as Status or Assignee.
export function offered(page: OpenPage, title: string): string[] {
  const picker = allNodes(page.tree).find(
    (node) => isPicker(node) && node.props.title === title,
  );

  return picker ? optionsOf(picker).map(({ label }) => label) : [];
}

type Found = { picker: WireNode; option: Option };

// The row of the header's options that offers a choice by its label, which the rows' own texts never match.
function choiceIn(page: OpenPage, label: string): Found {
  for (const picker of allNodes(page.tree).filter(isPicker)) {
    const option = optionsOf(picker).find((each) => each.label === label);

    if (option) return { picker, option };
  }

  throw new Error(`The options offer no ${label}`);
}

// Chooses a filter or an order in the header's options, as a person picks it from its row.
export async function filterBy(page: OpenPage, label: string): Promise<void> {
  const { picker, option } = choiceIn(page, label);

  await page.act(
    (node) => isPicker(node) && node.key === picker.key,
    'onValueChange',
    option.value,
  );
}

// How many filters the Options button's badge counts, or 0 with no badge.
export const filterCount = (page: OpenPage): number =>
  Number(at(page.find(screen).props.optionsBadge, 'count') ?? 0);

export function isChosen(page: OpenPage, label: string): boolean {
  const { picker, option } = choiceIn(page, label);

  return picker.props.value === option.value;
}

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
