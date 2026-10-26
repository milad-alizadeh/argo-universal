import type { IssueFilter } from './issue-filters';

// Where the Plugin's nav item mounts its pages in the App: the Plugin id, then the nav id.
const appRoot = '/plugins/issue-tracker/issues';

const unsafe = /[^A-Za-z0-9-]/gu;

const hex = 16;

// A page path holds only letters, digits, `-` and `_`; every other character is its hex code between two `_`, so two names never share a path.
export const pathSegment = (text: string): string =>
  text.replaceAll(
    unsafe,
    (character) => `_${(character.codePointAt(0) ?? 0).toString(hex)}_`,
  );

export const filterPath = (projectId: string, filter: IssueFilter): string =>
  `/projects/${pathSegment(projectId)}/filters/${filter.id}`;

export const issuePath = (projectId: string, number: number): string =>
  `/projects/${pathSegment(projectId)}/issues/${number}`;

// A `navigate` Action names the page by its full App path.
export const appPath = (path: string): string => `${appRoot}${path}`;
