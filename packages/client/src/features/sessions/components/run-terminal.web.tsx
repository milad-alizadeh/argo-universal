import type { ReactElement } from 'react';
import type { RunTerminalProps } from './run-terminal-props';
import { RunTerminalSurface } from './run-terminal-surface';
import { useRunTerminalColors } from './use-run-terminal-colors';

export function RunTerminal({
  interactive,
  connected,
  ...props
}: RunTerminalProps): ReactElement {
  const colors = useRunTerminalColors();

  return (
    <RunTerminalSurface
      {...props}
      connected={connected}
      enabled={connected && interactive}
      colors={colors}
    />
  );
}
