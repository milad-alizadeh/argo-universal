import type { Argo, NamedQuery } from '@argo/plugin-kit';
import { valueAt, type Json } from './pull-info';
import { bodyOf, call, type PullTarget } from './pull-reads';

// One changed file of a pull request, as the App's file list draws it; `patch` is the hunks GitHub gives, if any.
export type PullFile = {
  operation: 'add' | 'delete' | 'modify' | 'move';
  path: string;
  oldPath?: string;
  additions: number;
  deletions: number;
  patch: string;
};

// GitHub pages its list of a pull request's files; this many to a page, and the App asks for the next as it scrolls.
export const filesPerPage = 50;

export type FilesTarget = PullTarget & { page: number };

const invalid = 'GitHub returned an invalid list of files.';

const operations = new Map<string, PullFile['operation']>([
  ['added', 'add'],
  ['copied', 'add'],
  ['removed', 'delete'],
  ['renamed', 'move'],
]);

const text = (file: Json, key: string): string => {
  const value = valueAt(file, [key]);

  if (typeof value === 'string') return value;

  throw new Error(invalid);
};

const count = (file: Json, key: string): number => {
  const value = valueAt(file, [key]);

  return typeof value === 'number' ? value : 0;
};

const oldPathOf = (file: Json): Pick<PullFile, 'oldPath'> => {
  const previous = valueAt(file, ['previous_filename']);

  return typeof previous === 'string' ? { oldPath: previous } : {};
};

// GitHub leaves the patch out of a binary file and of one too large to show.
const patchOf = (file: Json): string => {
  const patch = valueAt(file, ['patch']);

  return typeof patch === 'string' ? patch : '';
};

const fileOf = (file: Json): PullFile => ({
  operation: operations.get(text(file, 'status')) ?? 'modify',
  path: text(file, 'filename'),
  ...oldPathOf(file),
  additions: count(file, 'additions'),
  deletions: count(file, 'deletions'),
  patch: patchOf(file),
});

// The files out of GitHub's reply; anything that is not a list of files is refused, never guessed at.
export function parseFiles(body: string): PullFile[] {
  const files: Json = JSON.parse(body);

  if (!Array.isArray(files)) throw new Error(invalid);

  return files.map(fileOf);
}

type Fetch = Argo['fetch'];

// One page of a pull request's files as the signed-in person sees it; a missing Account, a refusal or a failed call throws.
async function fetchFiles(
  fetch: Fetch,
  { repository, number, page, projectId }: FilesTarget,
): Promise<PullFile[]> {
  const path = `/repos/${repository}/pulls/${number}/files?per_page=${filesPerPage}&page=${page}`;

  return parseFiles(
    await bodyOf(fetch, call(path, projectId), `${repository}#${number}`),
  );
}

export type FilesReads = {
  // One page of one pull request's files, shared by every Operation that asks for it.
  files: (target: FilesTarget) => NamedQuery<PullFile[]>;
};

/*
 * A named read (ADR-0037) of one page of a pull request's files. It only reads, and a failed read throws, so Argo
 * keeps the failure instead of an empty page.
 */
export const defineFilesReads = (argo: Argo): FilesReads => ({
  files: argo.queries.define(
    'pullFiles',
    (target: FilesTarget) => fetchFiles(argo.fetch, target),
    { projectOf: ({ projectId }: FilesTarget) => projectId },
  ),
});
