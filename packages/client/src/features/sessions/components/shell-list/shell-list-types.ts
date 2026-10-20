import type { Shell } from '@repo/contracts';

// A Shell as the list draws it: its row, and the last line of its output once one has been read.
export type ShellEntry = Shell & { lastLine?: string };

// The open Shell's output so far; the Server keeps only the newest lines of a long one.
export interface ShellOutputText {
  shellId: string;
  text: string;
  droppedLines?: number;
}

export interface ShellListProps {
  shells: ShellEntry[];
  onSelect?: (shell: ShellEntry) => void;
  // Fixed time for stories and tests; a running Shell's time otherwise ticks.
  now?: number;
}

// What both the phone sheet and the wide panel need: the Session's Shells, the open one's output, and Stop.
export interface ShellViewProps extends ShellListProps {
  // The open Shell's output; the caller loads it when `onSelect` names the Shell.
  output?: ShellOutputText;
  onStop: (shell: ShellEntry) => void;
}
