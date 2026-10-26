// A path names one file in a comparison; the latest entry wins for drawing and totals.
export const uniqueChangedFiles = <File extends { path: string }>(
  files: readonly File[],
): File[] => [...new Map(files.map((file) => [file.path, file])).values()];
