import type { FileDiff } from '#features/feed';
import { uniqueChangedFiles } from './changes-files';

export interface ChangesTotals {
  files: number;
  viewed: number;
  added: number;
  removed: number;
}

export function changesTotals(
  files: readonly FileDiff[],
  viewed: readonly string[],
): ChangesTotals {
  const unique = uniqueChangedFiles(files);

  return {
    files: unique.length,
    viewed: unique.filter((file) => viewed.includes(file.path)).length,
    added: unique.reduce((sum, file) => sum + file.added, 0),
    removed: unique.reduce((sum, file) => sum + file.removed, 0),
  };
}

const count = (value: number, one: string, many: string): string =>
  `${value.toLocaleString('en-US')} ${value === 1 ? one : many}`;

export const filesSummary = (totals: ChangesTotals): string =>
  `${count(totals.files, 'file', 'files')} · ${totals.viewed.toLocaleString('en-US')} viewed`;
