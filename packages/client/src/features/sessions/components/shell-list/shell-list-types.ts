import type { Shell } from '@repo/contracts';

// A Shell as the list draws it: its row, and the last line of its output once one has been read.
export type ShellEntry = Shell & { lastLine?: string };

// The open Shell's output so far; the Server keeps only the newest lines of a long one.
export interface ShellOutputText {
  shellId: string;
  text: string;
  droppedLines?: number;
}
