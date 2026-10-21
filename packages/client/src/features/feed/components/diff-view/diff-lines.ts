import type { DiffLine, FileDiff } from '../../view/file-diff';

type Hunk = FileDiff['hunks'][number];

export const previewLineCount = 5;

// `sign` is drawn beside the line; `patchSign` starts the line in the copied patch.
export const lineStyles: Record<
  DiffLine['kind'],
  { color: string; background: string; sign: string; patchSign: string }
> = {
  context: {
    color: 'text-muted-foreground',
    background: '',
    sign: ' ',
    patchSign: ' ',
  },
  added: {
    color: 'text-success',
    background: 'bg-success/10',
    sign: '+',
    patchSign: '+',
  },
  removed: {
    color: 'text-danger',
    background: 'bg-danger/10',
    sign: '−',
    patchSign: '-',
  },
  note: {
    color: 'text-muted-foreground',
    background: '',
    sign: ' ',
    patchSign: '',
  },
};

const patchLine = (line: DiffLine): string =>
  `${lineStyles[line.kind].patchSign}${line.text}`;

const hunkPatch = (hunk: Hunk): string =>
  `${hunk.header}\n${hunk.lines.map(patchLine).join('\n')}`;

export const patchText = (hunks: readonly Hunk[]): string =>
  hunks.map(hunkPatch).join('\n');

export const countLines = (hunks: readonly Hunk[]): number =>
  hunks.reduce((count, hunk) => count + hunk.lines.length, 0);

// The first `previewLineCount` lines when limited, else every line.
export function previewHunks(hunks: readonly Hunk[], limited: boolean): Hunk[] {
  let remaining = limited ? previewLineCount : Number.POSITIVE_INFINITY;

  return hunks.flatMap((hunk) => {
    const lines = hunk.lines.slice(0, remaining);
    remaining -= lines.length;

    return lines.length > 0 ? [{ ...hunk, lines }] : [];
  });
}
