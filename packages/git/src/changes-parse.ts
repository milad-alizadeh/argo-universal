import { rejectResponse } from './reject-response';

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

function numstatCounts(numstat: string): Map<string, LineCounts> {
  const counts = new Map<string, LineCounts>();
  const stats = numstat.split('\0');

  for (let index = 0; index < stats.length - 1; index += 1) {
    const entry = stats[index] ?? '';
    const match = /^(\d+|-)\t(\d+|-)\t(.*)$/s.exec(entry);

    if (!match) return rejectResponse('numstat', entry);
    const path = match[3] || stats[index + 2];

    if (!match[3]) index += 2;

    if (!path) return rejectResponse('numstat path', entry);
    counts.set(path, lineCounts(match[1] ?? '', match[2] ?? ''));
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

function statusFile(
  fields: string[],
  index: number,
  counts: Map<string, LineCounts>,
): ParsedStatusFile {
  const code = fields[index] ?? '';
  const oldPath = fields[index + 1];

  if (!oldPath) return rejectResponse('name-status', code);

  const renamed = code.startsWith('R') || code.startsWith('C');
  const path = renamed ? fields[index + 2] : oldPath;

  if (!path) return rejectResponse('rename', code);

  const file: CheckoutFile = {
    operation: statusOperation(code),
    path,
    ...(counts.get(path) ?? { additions: 0, deletions: 0 }),
  };

  if (renamed) file.oldPath = oldPath;

  return { file, next: index + (renamed ? porcelainCodeLength : 2) };
}

export function trackedFiles(status: string, numstat: string): CheckoutFile[] {
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

export function untrackedPaths(status: string): string[] {
  const fields = status.split('\0');
  const paths: string[] = [];

  for (let index = 0; index < fields.length - 1; index += 1) {
    const field = fields[index] ?? '';

    if (field.startsWith('?? ')) {
      const path = field.slice(porcelainCodeLength);

      // Git reports nested repositories as directories, not individual files.
      if (!path.endsWith('/')) paths.push(path);
    } else if (/^[RC]/.test(field.slice(0, 2))) index += 1;
  }

  return paths;
}

export function untrackedFile(path: string, stat: string): CheckoutFile {
  const match = /^(\d+|-)\t(\d+|-)\t/s.exec(stat);

  if (!match) return rejectResponse('untracked numstat', stat);

  return {
    operation: 'add',
    path,
    ...lineCounts(match[1] ?? '', match[2] ?? ''),
  };
}
