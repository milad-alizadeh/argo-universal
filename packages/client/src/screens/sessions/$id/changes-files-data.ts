import type { SessionChangesOutput } from '@repo/contracts';
import {
  type ChangedFile,
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

const loadedFiles = (pages: readonly Page[]): ChangedFile[] =>
  uniqueChangedFiles(pages.flatMap((page) => page.files.map(changedFile)));

type FilesProps = Pick<ChangesViewProps, 'files' | 'summary' | 'mainBranch'>;

// The pages of changed files loaded so far, as the list draws them; the first page carries the whole comparison's totals.
export function filesFromPages(pages: readonly Page[] = []): FilesProps {
  const [first] = pages;

  if (!first) return {};

  return {
    files: loadedFiles(pages),
    summary: first.summary,
    mainBranch: mainBranchOf(first),
  };
}

const mainBranchOf = (page: Page): string | undefined =>
  page.mainBranch ?? undefined;
