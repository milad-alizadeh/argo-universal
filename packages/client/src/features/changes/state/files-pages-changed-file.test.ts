import type { SessionChangesOutput } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { filesFromPages } from './files-pages';

type WireFile = SessionChangesOutput['files'][number];

const wireFile = (overrides: Partial<WireFile>): WireFile => ({
  operation: 'modify',
  path: '/a.txt',
  additions: 1,
  deletions: 0,
  ...overrides,
});

function changedFiles(
  files: WireFile[],
): NonNullable<ReturnType<typeof filesFromPages>['files']> {
  const page: SessionChangesOutput = {
    mainBranch: 'main',
    summary: { files: files.length, additions: 0, deletions: 0 },
    files,
    nextCursor: null,
  };

  return filesFromPages([page]).files ?? [];
}

describe('a changed file as the list draws it', () => {
  it('is binary when Git reports no counts for it, not when it has none to report', () => {
    const files = changedFiles([
      wireFile({ path: '/logo.png', additions: null, deletions: null }),
      wireFile({ path: '/empty.txt', additions: 0 }),
    ]);

    expect(files.map(({ path, binary }) => [path, binary])).toEqual([
      ['/logo.png', true],
      ['/empty.txt', false],
    ]);
  });

  it('keeps the old path of a moved file', () => {
    const [moved] = changedFiles([
      wireFile({ path: '/b.txt', operation: 'move', oldPath: '/a.txt' }),
    ]);

    expect(moved).toMatchObject({ path: '/b.txt', oldPath: '/a.txt' });
  });
});
