import { parentIssue } from './github-issue-nodes';
import type { Json } from './json';

const firstImportedIssue = 100;

const importedPageSize = 30;

const importedIssue = (number: number): Json => ({
  ...parentIssue(),
  number,
  title: `Imported Issue ${number}`,
  createdAt: '2026-11-19T00:00:00Z',
});

export function tiedSearch(after: Json | undefined): string {
  const next = after === 'next';

  const nodes = next
    ? [importedIssue(firstImportedIssue)]
    : Array.from({ length: importedPageSize }, (_, index) =>
        importedIssue(firstImportedIssue + importedPageSize - index),
      );

  return JSON.stringify({
    search: { nodes, pageInfo: { hasNextPage: !next, endCursor: 'next' } },
  });
}
