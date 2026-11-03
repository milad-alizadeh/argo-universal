import type { IssueFilter } from './issue-filters';

const unsafe = /[^A-Za-z0-9-]/gu;

const hex = 16;

// A page path holds only letters, digits, `-` and `_`; every other character is its hex code between two `_`, so two names never share a path.
export const pathSegment = (text: string): string =>
  text.replaceAll(
    unsafe,
    (character) => `_${(character.codePointAt(0) ?? 0).toString(hex)}_`,
  );

// The text a path segment stands for; a segment `pathSegment` never wrote comes back as written.
export const fromPathSegment = (segment: string): string =>
  segment.replaceAll(/_([0-9a-f]+)_/gu, (_whole, code: string) =>
    String.fromCodePoint(Number.parseInt(code, hex)),
  );

// The patterns each page is registered at once; a `:name` segment reaches the page as `params.name`.
export const pagePatterns = {
  project: '/projects/:projectId',
  filter: '/projects/:projectId/filters/:filterId',
  issue: '/projects/:projectId/issues/:number',
} as const;

export const projectPath = (projectId: string): string =>
  `/projects/${pathSegment(projectId)}`;

export const filterPath = (projectId: string, filter: IssueFilter): string =>
  `${projectPath(projectId)}/filters/${filter.id}`;

export const issuePath = (projectId: string, number: number): string =>
  `${projectPath(projectId)}/issues/${number}`;
