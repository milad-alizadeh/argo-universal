import type { ChangesSummary } from '@repo/contracts';
import type { ChangedFile } from './changes-view-props';

export interface ChangesTotals extends ChangesSummary {
  viewed: number;
}

/*
 * The comparison's counts, and how many of the listed paths are marked Viewed, each counted once. A file is marked
 * from its row, and loaded pages stay loaded, so only a file that has left the comparison drops out of the count.
 */
export function changesTotals(
  summary: ChangesSummary,
  files: readonly ChangedFile[] = [],
  viewed: readonly string[] = [],
): ChangesTotals {
  const listed = new Set(files.map((file) => file.path));

  return {
    ...summary,
    viewed: [...new Set(viewed)].filter((path) => listed.has(path)).length,
  };
}

const count = (value: number): string => value.toLocaleString('en-US');

export const filesSummary = (totals: ChangesTotals): string =>
  `${count(totals.viewed)}/${count(totals.files)} viewed`;
