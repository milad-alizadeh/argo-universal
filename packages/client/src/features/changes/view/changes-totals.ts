import type { ChangedFile, ChangesSummary } from './changes-view-props';

export interface ChangesTotals extends ChangesSummary {
  viewed: number;
}

// The comparison's counts, and how many of the listed paths are marked Viewed, each counted once.
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

const count = (value: number, one: string, many: string): string =>
  `${value.toLocaleString('en-US')} ${value === 1 ? one : many}`;

export const filesSummary = (totals: ChangesTotals): string =>
  `${count(totals.files, 'file', 'files')} · ${totals.viewed.toLocaleString('en-US')} viewed`;
