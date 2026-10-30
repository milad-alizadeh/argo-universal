import { rejectResponse } from '../reject-response';

export type LineCounts = {
  additions: number | null;
  deletions: number | null;
};

export function lineCounts(additions: string, deletions: string): LineCounts {
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

export const capture = (match: RegExpExecArray, index: number): string =>
  match[index] ?? '';

function numstatPath(
  match: RegExpExecArray,
  nextPath: string | undefined,
  entry: string,
): string {
  return match[3] || nextPath || rejectResponse('numstat path', entry);
}

export const statEntry = (stats: string[], index: number): string =>
  stats[index] ?? '';

export function numstatCounts(numstat: string): Map<string, LineCounts> {
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

export function countsFor(
  counts: Map<string, LineCounts>,
  path: string,
): LineCounts {
  return counts.get(path) ?? { additions: 0, deletions: 0 };
}
