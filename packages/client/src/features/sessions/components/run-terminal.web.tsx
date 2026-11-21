import type { ReactElement } from 'react';
import { runIsActive } from './run-status';
import type { RunTerminalProps } from './run-terminal-props';
import { RunTerminalSurface } from './run-terminal-surface';
import { useRunTerminalColors } from './use-run-terminal-colors';

export function RunTerminal({
  run,
  connected,
  ...props
}: RunTerminalProps): ReactElement {
  const colors = useRunTerminalColors();

  return (
    <RunTerminalSurface
      {...props}
      name={run.name}
      connected={connected}
      enabled={connected && runIsActive(run)}
      colors={colors}
    />
  );
}
