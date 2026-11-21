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
  run: Pick<RunConfigurationRow, 'name' | 'status'>;
  connected: boolean;
  listen: RunOutputSource;
  onInput: (text: string) => Promise<void> | void;
  onResize: (columns: number, rows: number) => void;
}

// Runs on native get their own Expo DOM Terminal in the phone slice.
export function RunTerminal(_props: RunTerminalProps): null {
  return null;
}
