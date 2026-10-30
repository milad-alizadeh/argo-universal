import type {
  SessionBranchesOutput,
  SessionChangesOutput,
  SessionComparison,
} from '@repo/contracts';
import type {
  ChangesQuery,
  ChangesScope,
  Loaded,
} from '../source/changes-source';
import type { ChangesComparison } from '../view/changes-comparison';
import { uniqueChangedFiles } from '../view/changes-files';
import type {
  ChangedFile,
  ChangesBranches,
  ChangesViewProps,
} from '../view/changes-view-props';

type Page = SessionChangesOutput;

// Git reports a binary file's counts as `-`, which the wire carries as null.
const changedFile = (file: Page['files'][number]): ChangedFile => ({
  operation: file.operation,
  path: file.path,
  oldPath: file.oldPath,
  added: file.additions ?? 0,
  removed: file.deletions ?? 0,
  binary: file.additions === null,
});

const loadedFiles = (pages: readonly Page[]): ChangedFile[] =>
  uniqueChangedFiles(pages.flatMap((page) => page.files.map(changedFile)));

type FilesProps = Pick<ChangesViewProps, 'files' | 'summary' | 'mainBranch'>;

const totalsOf = (first: Page): Omit<FilesProps, 'files'> => ({
  summary: first.summary,
  mainBranch: first.mainBranch ?? undefined,
});

// The pages of changed files loaded so far, as the list draws them; the first page carries the whole comparison's totals.
export function filesFromPages(pages: readonly Page[] = []): FilesProps {
  const [first] = pages;

  if (!first) return {};

  return { files: loadedFiles(pages), ...totalsOf(first) };
}

const branchRef = (name: string, data: SessionBranchesOutput): string =>
  data.branches.find((branch) => branch.name === name)?.ref ?? name;

// The Server compares against a branch's ref, once the branches have said it.
export function comparisonInput(
  comparison: ChangesComparison,
  data: SessionBranchesOutput = { branches: [] },
): SessionComparison {
  if (comparison.kind !== 'branch') return comparison.kind;

  return { branch: branchRef(comparison.branch, data) };
}

// What the files and diffs are read against. A picked branch is read only once the branches have named its ref, so what was read under its bare name is never read again under the ref.
export function changesQuery(
  scope: ChangesScope,
  comparison: ChangesComparison,
  data?: SessionBranchesOutput,
): ChangesQuery {
  const resolved = comparison.kind !== 'branch' || data !== undefined;

  return {
    sessionId: scope.sessionId,
    open: scope.open && resolved,
    comparison: comparisonInput(comparison, data),
  };
}

export const branchesOf = (
  branches: Loaded<SessionBranchesOutput>,
): ChangesBranches => ({
  names: branches.data?.branches.map(({ name }) => name) ?? [],
  loading: branches.pending,
  loadError: branches.error,
});
