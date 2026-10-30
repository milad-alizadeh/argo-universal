import type {
  ChangesSummary,
  SessionChangesOutput,
  SessionComparison,
} from '@repo/contracts';
import type { FileDiff } from '#features/feed';
import { uniqueChangedFiles } from '../view/changes-files';
import type { DiffPage } from './changes-source';

// A file the in-memory Server holds; a binary one has no counts, as Git reports it.
export type MemoryFile = FileDiff & { binary?: boolean };

// What the in-memory Server holds for a Session.
export interface MemoryCatalog {
  // The files a comparison has changed; none, and that comparison never answers.
  files: (comparison: SessionComparison) => readonly MemoryFile[] | undefined;
  mainBranch?: string;
  branches?: readonly string[];
  // Every read of the files fails with this; with files too, it is a refresh that failed after they loaded.
  loadError?: string;
  // Smaller than the Server's pages, so a story reaches the end of each in a few scrolls.
  filesPerPage?: number;
  linesPerPage?: number;
}

type Hunks = FileDiff['hunks'];

type Entry = { hunk: number; line: Hunks[number]['lines'][number] };

function pageHunks(hunks: Hunks, entries: Entry[]): Hunks {
  const groups = Map.groupBy(entries, (entry) => entry.hunk);

  return [...groups].map(([index, piece]) => ({
    header: hunks[index]?.header ?? '',
    lines: piece.map((entry) => entry.line),
  }));
}

// A file's hunks cut into pages of lines, each piece under its hunk's header, as the Server pages a patch.
function linePages(hunks: Hunks, lines: number): Hunks[] {
  const entries: Entry[] = hunks.flatMap((hunk, index) =>
    hunk.lines.map((line) => ({ hunk: index, line })),
  );

  return Array.from({ length: Math.ceil(entries.length / lines) }, (_, page) =>
    pageHunks(hunks, entries.slice(page * lines, (page + 1) * lines)),
  );
}

const nextCursor = (next: number, total: number): number | null =>
  next < total ? next : null;

const hunksOf = (file: FileDiff | undefined): FileDiff['hunks'] =>
  file?.hunks ?? [];

// One page of one file's diff; a file with no lines has one empty page.
export function memoryDiffPage(
  file: FileDiff | undefined,
  index: number,
  lines: number,
): DiffPage {
  const pages = linePages(hunksOf(file), lines);

  return {
    hunks: pages[index] ?? [],
    nextCursor: nextCursor(index + 1, pages.length),
  };
}

function summaryOf(files: readonly FileDiff[]): ChangesSummary {
  const unique = uniqueChangedFiles(files);

  return {
    files: unique.length,
    additions: unique.reduce((sum, file) => sum + file.added, 0),
    deletions: unique.reduce((sum, file) => sum + file.removed, 0),
  };
}

const changedFile = (
  file: MemoryFile,
): SessionChangesOutput['files'][number] => ({
  operation: file.operation,
  path: file.path,
  oldPath: file.oldPath,
  additions: file.binary ? null : file.added,
  deletions: file.binary ? null : file.removed,
});

// One page of the changed files, with the whole comparison's totals.
export function memoryFilesPage(
  files: readonly MemoryFile[],
  index: number,
  catalog: MemoryCatalog,
): SessionChangesOutput {
  const size = catalog.filesPerPage ?? files.length;
  const end = (index + 1) * size;

  return {
    mainBranch: catalog.mainBranch ?? 'main',
    summary: summaryOf(files),
    files: files.slice(index * size, end).map(changedFile),
    nextCursor: nextCursor(end, files.length),
  };
}
