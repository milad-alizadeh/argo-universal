import type { RunOutput, RunOutputCursor } from '@repo/contracts';
import type { DOMProps } from 'expo/dom';
import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import RunTerminalDOM from './run-terminal-dom';
import type { RunTerminalProps } from './run-terminal-props';
import { RunTerminalReplay } from './run-terminal-replay';
import { useRunTerminalColors } from './use-run-terminal-colors';

function terminalLayout(width: number, height: number): DOMProps {
  return {
    scrollEnabled: false,
    contentInsetAdjustmentBehavior: 'never',
    containerStyle: { flex: 0, width, height },
    style: { width, height },
  };
}

export function RunTerminal({
  name,
  interactive,
  connected,
  listen,
  onInput,
  onResize,
  compact,
}: RunTerminalProps): ReactElement {
  const [replay] = useState(() => new RunTerminalReplay());
  const colors = useRunTerminalColors();

  const [size, setSize] = useState({ width: 0, height: 0 });

  const measure = ({ nativeEvent: { layout } }: LayoutChangeEvent): void =>
    setSize({ width: layout.width, height: layout.height });

  const enabled = connected && interactive;

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
    <View className="min-h-0 flex-1 overflow-hidden" onLayout={measure}>
      {size.width > 0 && size.height > 0 && (
        <RunTerminalDOM
          name={name}
          {...{ colors, connected, enabled, compact, onRead }}
          containerHeight={size.height}
          dom={terminalLayout(size.width, size.height)}
          onInput={input}
          onResize={resize}
        />
      )}
    </View>
  );
}
