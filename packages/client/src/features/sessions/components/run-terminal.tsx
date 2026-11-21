import type { RunOutput, RunOutputCursor } from '@repo/contracts';
import type { DOMProps } from 'expo/dom';
import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { runIsActive } from './run-status';
import RunTerminalDOM from './run-terminal-dom';
import type { RunTerminalProps } from './run-terminal-props';
import { RunTerminalReplay } from './run-terminal-replay';
import { useRunTerminalColors } from './use-run-terminal-colors';

const dom = {
  scrollEnabled: false,
  containerStyle: { flex: 1 },
  style: { flex: 1 },
} satisfies DOMProps;

export function RunTerminal({
  run,
  connected,
  listen,
  onInput,
  onResize,
  compact,
}: RunTerminalProps): ReactElement {
  const [replay] = useState(() => new RunTerminalReplay());
  const colors = useRunTerminalColors();
  const enabled = connected && runIsActive(run);

  useEffect(() => {
    replay.connect(connected ? listen : undefined);

    return (): void => replay.connect();
  }, [connected, replay, listen]);

  const onRead = useCallback(
    (cursor: RunOutputCursor | null): Promise<RunOutput | null> =>
      replay.read(cursor),
    [replay],
  );
  const input = useCallback(
    async (text: string): Promise<void> => await onInput(text),
    [onInput],
  );
  const resize = useCallback(
    async (columns: number, rows: number): Promise<void> =>
      onResize(columns, rows),
    [onResize],
  );

  return (
    <RunTerminalDOM
      name={run.name}
      {...{ colors, connected, enabled, compact, dom, onRead }}
      onInput={input}
      onResize={resize}
    />
  );
}
