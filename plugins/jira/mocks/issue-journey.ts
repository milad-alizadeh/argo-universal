import type { OpenPage, PluginTest, WireNode } from '@argo/plugin-kit/testing';
import { fieldKeys } from '../issue-keys';
import type { FixtureIssue } from './jira-data';
import {
  choose,
  firstProject,
  projectPage,
  signIn,
  startJira,
  type Jira,
} from './journey';

// The issue page's journeys: a list to open issues from, and what the page shows of one.
export const argoThree = 'Show Jira issues in Argo';

export const argoThreePath = `/projects/${firstProject.id}/issues/ARGO-3`;

export type Listed = Jira & { list: OpenPage };

// Signed in, with ARGO chosen for the first Project: its list, as the person sees it.
export async function listed(): Promise<Listed> {
  const jira = await startJira();

  await signIn(jira);

  const list = await projectPage(jira);

  await choose(list, 'Jira project', 'ARGO');

  return { ...jira, list };
}

export const keyed =
  (key: string) =>
  (node: WireNode): boolean =>
    node.key === key;

const words = (node: WireNode, prop: string): string => {
  const value = node.props[prop];

  return typeof value === 'string' ? value : '';
};

const textOf = (page: OpenPage, key: string): string =>
  words(page.find(keyed(key)), 'text');

type Shown = { status: string; assignee: string; priority: string };

// What the issue's properties show.
export const shown = (page: OpenPage): Shown => ({
  status: textOf(page, fieldKeys.status),
  assignee: textOf(page, fieldKeys.assignee),
  priority: textOf(page, fieldKeys.priority),
});

// The labels of one header menu's entries.
export const entries = (page: OpenPage, menu: string): string[] =>
  page
    .find(keyed(menu))
    .children.flatMap(({ children }) =>
      children.map((entry) => words(entry, 'label')),
    );

// What the fixture Jira now holds for an issue of the ARGO project.
export function fixtureIssue({ jira }: Jira, key: string): FixtureIssue {
  const issues = jira.data.sites.flatMap(({ projects }) =>
    projects.flatMap((project) => project.issues),
  );

  const found = issues.find((issue) => issue.key === key);

  if (!found) throw new Error(`The fixture has no ${key}`);

  return found;
}

// One Operation run as an Agent's `argo run` makes it, for the first Project.
export const run = (
  { test }: Jira,
  name: string,
  params: Record<string, string | number>,
): ReturnType<PluginTest['operations']['run']> =>
  test.operations.run({ name, params, caller: { projectId: firstProject.id } });
