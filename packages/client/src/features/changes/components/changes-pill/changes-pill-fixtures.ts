import type { ChangesPillProps } from './changes-pill';

export const manyFilesChanged = {
  summary: { files: 24, additions: 12_000, deletions: 400 },
} satisfies Pick<ChangesPillProps, 'summary'>;
