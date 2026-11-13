import type { Argo, NamedQuery } from '@argo/plugin-kit';
import { valueAt, type Json } from './pull-info';
import {
  githubGet,
  okStatus,
  refusalOf,
  signInMessage,
  type PullTarget,
} from './pull-reads';

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

// What a read answers: the files of one page, or why there are none. Argo keeps it, so a failure is never an empty page.
export type SettledFiles =
  | { ok: true; value: PullFile[] }
  | { ok: false; message: string };

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

async function fetchFiles(
  fetch: Fetch,
  target: FilesTarget,
): Promise<PullFile[]> {
  const { repository, number, page, projectId } = target;

  const reply = await fetch(
    ...githubGet(
      `/repos/${repository}/pulls/${number}/files?per_page=${filesPerPage}&page=${page}`,
      projectId,
    ),
  );

  if (!reply) throw new Error(signInMessage);

  if (reply.status !== okStatus) throw refusalOf(reply.status, target);

  return parseFiles(await reply.text());
}

async function settle(
  fetch: Fetch,
  target: FilesTarget,
): Promise<SettledFiles> {
  try {
    return { ok: true, value: await fetchFiles(fetch, target) };
  } catch (cause) {
    return {
      ok: false,
      message: cause instanceof Error ? cause.message : String(cause),
    };
  }
}

export type FilesReads = {
  // One page of one pull request's files, shared by every Operation that asks for it.
  files: (target: FilesTarget) => NamedQuery<SettledFiles>;
};

// A named read (ADR-0037) of one page of a pull request's files; it only reads.
export const defineFilesReads = (argo: Argo): FilesReads => ({
  files: argo.queries.define(
    'pullFiles',
    (target: FilesTarget) => settle(argo.fetch, target),
    { projectOf: ({ projectId }: FilesTarget) => projectId },
  ),
});

// The files of the page, or the reason there are none, as an Error the caller's own failure handling reports.
export function unwrapFiles(settled: SettledFiles): PullFile[] {
  if (settled.ok) return settled.value;

  throw new Error(settled.message);
}
