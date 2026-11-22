import type { RunOutput, RunOutputCursor } from '@repo/contracts';

export type RunOutputSource = (
  cursor: RunOutputCursor | undefined,
  receive: (frame: RunOutput) => RunOutputCursor | void,
) => () => void;

export interface RunTerminalProps {
  name: string;
  interactive: boolean;
  connected: boolean;
  compact?: boolean;
  listen: RunOutputSource;
  onInput: (text: string) => Promise<void> | void;
  onResize: (columns: number, rows: number) => void;
}

export interface RunTerminalColors {
  background: string;
  foreground: string;
  buttonForeground: string;
  keyBackground: string;
  radius: string;
}
