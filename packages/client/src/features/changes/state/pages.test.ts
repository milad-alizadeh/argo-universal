import type { SessionChangesOutput } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import type { DiffPage, Loaded } from '../source/changes-source';
import { diffsByFile, wantedPageKeys } from './diff-pages';
import { branchesOf, comparisonInput, filesFromPages } from './files-pages';

const hunk = (header: string): DiffPage['hunks'][number] => ({
  header,
  lines: [],
});

const arrived = (
  header: string,
  nextCursor: number | null,
): Loaded<DiffPage> => ({
  data: { hunks: [hunk(header)], nextCursor },
  pending: false,
});

const waiting: Loaded<DiffPage> = { pending: true };

describe('diff pages', () => {
  it('asks for every page of every file up to the count wanted', () => {
    expect(wantedPageKeys({ '/a': 2, '/b': 1 })).toEqual([
      { path: '/a', index: 0 },
      { path: '/a', index: 1 },
      { path: '/b', index: 0 },
    ]);
  });

  it('shows a file the pages that arrived in order, and says more wait on the Server', () => {
    const keys = wantedPageKeys({ '/a': 3 });

    expect(
      diffsByFile(keys, [arrived('@@ 1', 400), waiting, arrived('@@ 3', 1200)]),
    ).toEqual({
      '/a': {
        pages: [[hunk('@@ 1')]],
        loading: true,
        more: true,
        loadError: undefined,
      },
    });
  });

  it('settles a file once its last page names no next one', () => {
    const keys = wantedPageKeys({ '/a': 1 });

    expect(diffsByFile(keys, [arrived('@@ 1', null)])['/a']).toEqual({
      pages: [[hunk('@@ 1')]],
      loading: false,
      more: false,
      loadError: undefined,
    });
  });

  it('carries a failed page as the file’s error', () => {
    const keys = wantedPageKeys({ '/a': 1 });
    const failed = { pending: false, error: 'Git failed' };

    expect(diffsByFile(keys, [failed])['/a']?.loadError).toBe('Git failed');
  });
});

const file = (
  path: string,
  additions: number | null,
): SessionChangesOutput['files'][number] => ({
  operation: 'modify',
  path,
  additions,
  deletions: 0,
});

const page = (
  files: SessionChangesOutput['files'],
  nextCursor: number | null,
): SessionChangesOutput => ({
  mainBranch: 'trunk',
  summary: { files: 3, additions: 4, deletions: 0 },
  files,
  nextCursor,
});

describe('file pages', () => {
  it('has no files until the first page arrives', () => {
    expect(filesFromPages()).toEqual({});
  });

  it('lists each path once across pages, with the first page’s totals', () => {
    const changes = filesFromPages([
      page([file('/a', 1), file('/b', null)], 2),
      page([file('/b', 3), file('/c', 0)], null),
    ]);

    expect(changes.files?.map(({ path, added }) => [path, added])).toEqual([
      ['/a', 1],
      ['/b', 3],
      ['/c', 0],
    ]);
    expect(changes.summary?.files).toBe(3);
    expect(changes.mainBranch).toBe('trunk');
  });
});

describe('comparisons and branches', () => {
  const branches = { branches: [{ name: 'fix', ref: 'refs/heads/fix' }] };

  it('compares against a branch by its ref once the branches name it', () => {
    expect(
      comparisonInput({ kind: 'branch', branch: 'fix' }, branches),
    ).toEqual({ branch: 'refs/heads/fix' });
    expect(comparisonInput({ kind: 'branch', branch: 'fix' })).toEqual({
      branch: 'fix',
    });
    expect(comparisonInput({ kind: 'uncommitted' }, branches)).toBe(
      'uncommitted',
    );
  });

  it('offers the branch names, and says while they load or why they failed', () => {
    expect(branchesOf({ data: branches, pending: false })).toEqual({
      names: ['fix'],
      loading: false,
      loadError: undefined,
    });
    expect(branchesOf({ pending: true, error: 'offline' })).toEqual({
      names: [],
      loading: true,
      loadError: 'offline',
    });
  });
});
