import type { OpenPage, WireNode } from '@argo/plugin-kit/testing';
import { boardLabel } from '../board-columns';
import { listed as listedIssues } from './issue-journey';
import type { FixtureIssue } from './jira-data';
import type { Jira } from './journey';

/*
 * The board's journeys: the ARGO issues of the first Project, switched between list and board as a person taps the
 * switch, and where the board shows each card.
 */
export type Shown = Jira & { page: OpenPage };

// A bound choice lands once the edits pause, as in the App.
const editPauseMs = 300;

export const argoOne = 'Pick a Jira project for each Argo Project';

export { argoThree } from './issue-journey';

// Signed in, with ARGO chosen for the first Project: its issues, as the person first sees them.
export async function listed(): Promise<Shown> {
  const { list, ...jira } = await listedIssues();

  return { ...jira, page: list };
}

export const viewSwitch = (node: WireNode): boolean =>
  node.type === 'SegmentedControl';

// Switches the issues between list and board, as a person taps the switch.
export async function show(
  { test, page }: Shown,
  view: 'list' | 'board',
): Promise<void> {
  await page.act(viewSwitch, 'onValueChange', view);
  await test.clock.advance(editPauseMs);
}

// The ARGO issues as a board.
export async function onBoard(): Promise<Shown> {
  const shown = await listed();

  await show(shown, 'board');

  return shown;
}

const nodes = (node: WireNode): WireNode[] => [
  node,
  ...node.children.flatMap(nodes),
];

export const drawsBoard = (page: OpenPage): boolean =>
  nodes(page.tree).some((node) => node.type === 'Board');

const titleOf = (node: WireNode | undefined): string => {
  const title = node?.props.title;

  return typeof title === 'string' ? title : '';
};

// The column titles, in the order the board draws them.
export const columnTitles = (page: OpenPage): string[] =>
  page.find(boardLabel).children.map(titleOf);

type Prop = WireNode['props'][string];

const hasCard =
  (title: string) =>
  (column: WireNode): boolean =>
    column.children.some((card) => card.props.title === title);

// Where a card shows: in the column its optimistic `column` names, else in the one it is written in.
function shownColumnId(written: WireNode, title: string): Prop | undefined {
  const card = written.children.find((each) => each.props.title === title);

  return card?.props.column ?? written.props.id;
}

// The title of the column a card shows in.
export function columnOf(page: OpenPage, title: string): string {
  const board = page.find(boardLabel);
  const written = board.children.find(hasCard(title));
  const id = written && shownColumnId(written, title);

  return titleOf(board.children.find((column) => column.props.id === id));
}

// The ARGO project's issues on the fixture's first site.
const argoIssues = ({ jira }: Jira): FixtureIssue[] =>
  jira.data.sites.flatMap(({ projects }) =>
    projects.flatMap((project) =>
      project.key === 'ARGO' ? project.issues : [],
    ),
  );

export function fixtureIssue(jira: Jira, key: string): FixtureIssue {
  const found = argoIssues(jira).find((issue) => issue.key === key);

  if (!found) throw new Error(`The fixture has no ${key}`);

  return found;
}
