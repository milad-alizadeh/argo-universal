import { rejectResponse } from '../reject-response';

const porcelainCodeLength = 3;

export type CheckoutFile = {
  operation: 'add' | 'delete' | 'modify' | 'move';
  path: string;
  oldPath?: string;
  additions: number | null;
  deletions: number | null;
};

type LineCounts = Pick<CheckoutFile, 'additions' | 'deletions'>;

function lineCounts(additions: string, deletions: string): LineCounts {
  return {
    additions: additions === '-' ? null : Number(additions),
    deletions: deletions === '-' ? null : Number(deletions),
  };
}

function parseNumstat(entry: string): RegExpExecArray {
  return (
    /^(\d+|-)\t(\d+|-)\t(.*)$/s.exec(entry) ?? rejectResponse('numstat', entry)
  );
}

const capture = (match: RegExpExecArray, index: number): string =>
  match[index] ?? '';

function numstatPath(
  match: RegExpExecArray,
  nextPath: string | undefined,
  entry: string,
): string {
  return match[3] || nextPath || rejectResponse('numstat path', entry);
}

const statEntry = (stats: string[], index: number): string =>
  stats[index] ?? '';

function numstatCounts(numstat: string): Map<string, LineCounts> {
  const counts = new Map<string, LineCounts>();
  const stats = numstat.split('\0');

  for (let index = 0; index < stats.length - 1; index += 1) {
    const entry = statEntry(stats, index);
    const match = parseNumstat(entry);
    const path = numstatPath(match, stats[index + 2], entry);

    if (!match[3]) index += 2;

    counts.set(path, lineCounts(capture(match, 1), capture(match, 2)));
  }

  return counts;
}

// The status letters git documents for `diff --name-status`, bar X (unknown) and B (broken pair).
const statusOperations = new Map<string, CheckoutFile['operation']>([
  ['A', 'add'],
  ['C', 'add'],
  ['D', 'delete'],
  ['M', 'modify'],
  ['R', 'move'],
  ['T', 'modify'],
  ['U', 'modify'],
]);

function statusOperation(code: string): CheckoutFile['operation'] {
  return statusOperations.get(code[0] ?? '') ?? rejectResponse('status', code);
}

type ParsedStatusFile = { file: CheckoutFile; next: number };

function statusPath(fields: string[], index: number, code: string): string {
  return (
    (/^[RC]/.test(code) ? fields[index + 2] : fields[index + 1]) ||
    rejectResponse('rename', code)
  );
}

function oldStatusPath(fields: string[], index: number, code: string): string {
  return fields[index + 1] || rejectResponse('name-status', code);
}

function statusFile(
  fields: string[],
  index: number,
  counts: Map<string, LineCounts>,
): ParsedStatusFile {
  const code = statEntry(fields, index);
  const oldPath = oldStatusPath(fields, index, code);
  const renamed = /^[RC]/.test(code);
  const path = statusPath(fields, index, code);
  const file = statusEntry(code, path, counts);

  if (renamed) file.oldPath = oldPath;

  return { file, next: index + (renamed ? porcelainCodeLength : 2) };
}

function statusEntry(
  code: string,
  path: string,
  counts: Map<string, LineCounts>,
): CheckoutFile {
  return { operation: statusOperation(code), path, ...countsFor(counts, path) };
}

function countsFor(counts: Map<string, LineCounts>, path: string): LineCounts {
  return counts.get(path) ?? { additions: 0, deletions: 0 };
}

// A tracked file's counts, read for its own paths after the whole comparison named it.
export function withCounts(file: CheckoutFile, numstat: string): CheckoutFile {
  return { ...file, ...countsFor(numstatCounts(numstat), file.path) };
}

// `numstat` is left out when only the names matter; every count is then 0.
export function trackedFiles(status: string, numstat = ''): CheckoutFile[] {
  const counts = numstatCounts(numstat);
  const files: CheckoutFile[] = [];
  const fields = status.split('\0');

  for (let index = 0; index < fields.length - 1;) {
    const next = statusFile(fields, index, counts);

    files.push(next.file);
    index = next.next;
  }

  return files;
}

function addUntracked(paths: string[], field: string): void {
  const path = field.slice(porcelainCodeLength);

  // Git reports nested repositories as directories, not individual files.
  if (!path.endsWith('/')) paths.push(path);
}

function collectUntracked(paths: string[], field: string): number {
  if (field.startsWith('?? ')) addUntracked(paths, field);

  return /^[RC]/.test(field.slice(0, 2)) ? 1 : 0;
}

export function untrackedPaths(status: string): string[] {
  const fields = status.split('\0');
  const paths: string[] = [];

  for (let index = 0; index < fields.length - 1; index += 1) {
    const field = fields[index] ?? '';

    index += collectUntracked(paths, field);
  }

  return paths;
}

export function untrackedFile(path: string, stat: string): CheckoutFile {
  const match =
    /^(\d+|-)\t(\d+|-)\t/s.exec(stat) ??
    rejectResponse('untracked numstat', stat);

  return {
    operation: 'add',
    path,
    ...lineCounts(capture(match, 1), capture(match, 2)),
  };
}
