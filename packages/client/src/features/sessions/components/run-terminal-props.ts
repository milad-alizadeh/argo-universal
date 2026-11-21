import type {
  RunConfigurationRow,
  RunOutput,
  RunOutputCursor,
} from '@repo/contracts';

export type RunOutputSource = (
  cursor: RunOutputCursor | undefined,
  receive: (frame: RunOutput) => void,
) => () => void;

export interface RunTerminalProps {
  run: RunConfigurationRow;
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
