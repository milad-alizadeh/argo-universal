import type { ChangesSource } from './pull-changes';
import {
  filesPerPage,
  unwrapFiles,
  type FilesReads,
  type PullFile,
} from './pull-files';
import type { PullInfo } from './pull-info';
import { namedOf, type Scope } from './pull-operations';
import { unwrap } from './pull-reads';
import type { PullReference } from './pull-reference';

type Caller = { projectId: string; sessionId: string };

// What the file Operations read through: the Plugin's associations and named reads, and the Operation scope.
export type FileSource = ChangesSource & { files: FilesReads; scope: Scope };

// The most files GitHub lists for one pull request, so a scan for a file stops there.
const filesListed = 3000;

// A changed file as the App's list draws it; the patch is read with `github.diff`.
export type ListedFile = Omit<PullFile, 'patch'>;

export type FilesPage = {
  mainBranch: null;
  // What the pull request itself says it changes; never the Session's Checkout's.
  summary: { files: number; additions: number; deletions: number };
  // The repository, base and head the files were read against.
  comparison: { repository: string; base: string; head: string };
  files: ListedFile[];
  nextCursor: number | null;
};

const sameRepository = (left: string, right: string): boolean =>
  left.toLowerCase() === right.toLowerCase();

const isLinkOf =
  (named: PullReference, { projectId }: Caller) =>
  (link: PullReference & { projectId: string }): boolean =>
    link.projectId === projectId &&
    link.number === named.number &&
    sameRepository(link.repository, named.repository);

/*
 * The pull request's files are only read for a pull request attached to the calling Session: an Operation never reads
 * another Session's, or an unattached one, through the Project's Account.
 */
async function requireAttached(
  { store }: FileSource,
  named: PullReference,
  caller: Caller,
): Promise<void> {
  const links = await store.forSessions([caller.sessionId]);

  if (links.some(isLinkOf(named, caller))) return;

  throw new Error(
    `${named.repository}#${named.number} is not attached to this Session.`,
  );
}

type Read = { pull: PullInfo; projectId: string };

async function readPull(
  source: FileSource,
  reference: string,
  caller: Caller,
): Promise<Read> {
  const { projectId } = caller;
  const named = await namedOf(source.scope, reference, caller);

  await requireAttached(source, named, caller);

  const pull = source.reads.pull({ ...named, projectId });

  return {
    pull: unwrap(await source.readQuery(pull, { projectId })),
    projectId,
  };
}

async function readPage(
  source: FileSource,
  { pull, projectId }: Read,
  page: number,
): Promise<PullFile[]> {
  const { repository, number } = pull;
  const target = { repository, number, projectId, page };

  const settled = await source.readQuery(source.files.files(target), {
    projectId,
  });

  return unwrapFiles(settled);
}

const listedOf = ({ patch: _patch, ...file }: PullFile): ListedFile => file;

const totalPages = ({ files }: PullInfo): number =>
  Math.ceil(Math.min(files, filesListed) / filesPerPage);

const nextOf = (pull: PullInfo, page: number): number | null =>
  page < totalPages(pull) ? page + 1 : null;

const summaryOf = ({
  files,
  additions,
  deletions,
}: PullInfo): FilesPage['summary'] => ({ files, additions, deletions });

const comparisonOf = ({
  repository,
  base,
  head,
}: PullInfo): FilesPage['comparison'] => ({ repository, base, head });

/*
 * One page of the files the selected pull request changes, against its own repository, base and head as GitHub
 * reports them: the Session's Checkout is never read, switched or written.
 */
export async function filesOf(
  source: FileSource,
  params: { reference: string; cursor?: number },
  caller: Caller,
): Promise<FilesPage> {
  const { pull, projectId } = await readPull(source, params.reference, caller);
  const page = params.cursor ?? 1;
  const files = await readPage(source, { pull, projectId }, page);

  return {
    mainBranch: null,
    summary: summaryOf(pull),
    comparison: comparisonOf(pull),
    files: files.map(listedOf),
    nextCursor: nextOf(pull, page),
  };
}

export type DiffPage = {
  file: ListedFile;
  patch: { format: 'git_patch'; text: string };
  nextCursor: null;
};

const side = (path: string, prefix: 'a' | 'b'): string => `${prefix}/${path}`;

const nowhere = '/dev/null';

const fromOf = ({ operation, oldPath, path }: PullFile): string =>
  operation === 'add' ? nowhere : side(oldPath ?? path, 'a');

const toOf = ({ operation, path }: PullFile): string =>
  operation === 'delete' ? nowhere : side(path, 'b');

const fileHeader = (file: PullFile): string =>
  `diff --git ${side(file.oldPath ?? file.path, 'a')} ${side(file.path, 'b')}\n--- ${fromOf(file)}\n+++ ${toOf(file)}\n`;

const hasPath = (file: PullFile, path: string): boolean =>
  file.path === path || file.oldPath === path;

async function findFile(
  source: FileSource,
  read: Read,
  path: string,
): Promise<PullFile> {
  for (let page = 1; page <= totalPages(read.pull); page += 1) {
    const files = await readPage(source, read, page);
    const found = files.find((file) => hasPath(file, path));

    if (found) return found;
  }

  throw new Error(
    `${path} is not among the files of ${read.pull.repository}#${read.pull.number}.`,
  );
}

const patchOf = (file: PullFile): DiffPage['patch'] => ({
  format: 'git_patch',
  text: `${fileHeader(file)}${file.patch}\n`,
});

/*
 * One file's patch from the selected pull request, as the hunks GitHub gives with a git header so the App draws it as
 * it draws a local one. A file GitHub gives no patch for, such as a binary one, has none to draw.
 */
export async function diffOf(
  source: FileSource,
  params: { reference: string; path: string },
  caller: Caller,
): Promise<DiffPage> {
  const read = await readPull(source, params.reference, caller);
  const file = await findFile(source, read, params.path);

  return { file: listedOf(file), patch: patchOf(file), nextCursor: null };
}
