import type { IssueFilter } from './issue-filters';

const unsafe = /[^A-Za-z0-9-]/gu;

const hex = 16;

// A page path holds only letters, digits, `-` and `_`; every other character is its hex code between two `_`, so two names never share a path.
export const pathSegment = (text: string): string =>
  text.replaceAll(
    unsafe,
    (character) => `_${(character.codePointAt(0) ?? 0).toString(hex)}_`,
  );

export const projectPath = (projectId: string): string =>
  `/projects/${pathSegment(projectId)}`;

export const filterPath = (projectId: string, filter: IssueFilter): string =>
  `${projectPath(projectId)}/filters/${filter.id}`;

export const issuePath = (projectId: string, number: number): string =>
  `${projectPath(projectId)}/issues/${number}`;
