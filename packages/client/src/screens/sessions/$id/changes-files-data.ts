import type { SessionChangesOutput } from '@repo/contracts';
import {
  type ChangedFile,
  type ChangesSummary,
  type ChangesViewProps,
  uniqueChangedFiles,
} from '#features/changes';

type Page = SessionChangesOutput;

// Binary files have no line counts.
const changedFile = (file: Page['files'][number]): ChangedFile => ({
  operation: file.operation,
  path: file.path,
  oldPath: file.oldPath,
  added: file.additions ?? 0,
  removed: file.deletions ?? 0,
});

const summaryOf = (page: Page): ChangesSummary => ({
  files: page.summary.files,
  added: page.summary.additions,
  removed: page.summary.deletions,
});

const loadedFiles = (pages: readonly Page[]): ChangedFile[] =>
  uniqueChangedFiles(pages.flatMap((page) => page.files.map(changedFile)));

type FilesData = Pick<ChangesViewProps, 'files' | 'summary' | 'mainBranch'>;

// Until the first page arrives there are no files, and the main branch is not known yet.
const noFiles: FilesData = { mainBranch: '…' };

// The pages of changed files loaded so far, as the list draws them; the first page carries the whole comparison's totals.
export function filesData(pages: readonly Page[] = []): FilesData {
  const [first] = pages;

  if (!first) return noFiles;

  return {
    files: loadedFiles(pages),
    summary: summaryOf(first),
    mainBranch: mainBranchOf(first),
  };
}

const mainBranchOf = (page: Page): string =>
  page.mainBranch ?? noFiles.mainBranch;
