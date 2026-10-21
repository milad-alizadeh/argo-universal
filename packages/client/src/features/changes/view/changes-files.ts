import type { FileDiff } from '#features/feed';

// A path names one file in a comparison; the latest entry wins for drawing and totals.
export const uniqueChangedFiles = (files: readonly FileDiff[]): FileDiff[] => [
  ...new Map(files.map((file) => [file.path, file])).values(),
];
