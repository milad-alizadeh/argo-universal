import {
  terminalColumns,
  terminalRows,
  type RunOutput,
  type RunOutputCursor,
} from '@repo/contracts';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { useEffect, useRef, type ReactElement } from 'react';
import { useCSSVariable } from 'uniwind';
import { runIsActive } from '../../../features/sessions/components/run-status';
import type { RunTerminalProps } from './run-terminal';

function receiveFrame(
  terminal: Terminal,
  previous: RunOutputCursor | undefined,
  { cursor, data }: RunOutput,
): RunOutputCursor {
  const sameRun = previous?.runId === cursor.runId;
  if (!sameRun) terminal.write('\u001bc');
  if (sameRun && cursor.offset <= previous.offset) return previous;

  // A delayed reconnect may replay data the previous subscription supplied.
  const bytes = Uint8Array.from(atob(data), (byte) => byte.charCodeAt(0));
  const repeated = sameRun
    ? previous.offset - (cursor.offset - bytes.length)
    : 0;
  terminal.write(bytes.subarray(Math.max(0, repeated)));

  return cursor;
}

export function RunTerminal(props: RunTerminalProps): ReactElement {
  const viewport = useRef<HTMLDivElement>(null);
  const terminal = useRef<Terminal>(null);
  const cursor = useRef<RunOutputCursor | undefined>(undefined);
  const [background, foreground] = useCSSVariable([
    '--color-card',
    '--color-foreground',
  ]);
  const { onInput, listen, connected, run } = props;
  const enabled = connected && runIsActive(run);

  useEffect(() => {
    if (!viewport.current) return;

    const opened = new Terminal({
      cols: terminalColumns,
      rows: terminalRows,
      disableStdin: true,
      screenReaderMode: true,
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'Menlo, Monaco, Consolas, monospace',
    });

    cursor.current = undefined;
    terminal.current = opened;
    opened.open(viewport.current);

    return (): void => {
      terminal.current = null;
      opened.dispose();
    };
  }, []);

  useEffect(() => {
    if (!terminal.current) return;
    terminal.current.options.theme = {
      background: String(background),
      foreground: String(foreground),
      cursor: String(foreground),
    };
    terminal.current.options.disableStdin = !enabled;

    const input = terminal.current.onData(onInput);

    return (): void => input.dispose();
  }, [background, foreground, enabled, onInput]);

  useEffect(() => {
    const opened = terminal.current;
    if (!opened || !connected) return;

    let listening = true;
    const stop = listen(cursor.current, (frame) => {
      if (listening)
        cursor.current = receiveFrame(opened, cursor.current, frame);
    });

    return (): void => {
      listening = false;
      stop();
    };
  }, [connected, listen]);

  return (
    <div
      role="region"
      aria-label={`${run.name} Terminal`}
      className="min-h-0 min-w-0 flex-1 overflow-auto rounded-control bg-card"
    >
      <div ref={viewport} className="w-max min-w-full px-2 py-1" />
    </div>
  );
}
