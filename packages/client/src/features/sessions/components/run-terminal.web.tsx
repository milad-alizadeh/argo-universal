import {
  terminalColumns,
  terminalRows,
  type RunOutput,
  type RunOutputCursor,
} from '@repo/contracts';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal, type ITerminalOptions } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { useEffect, useRef, type ReactElement, type RefObject } from 'react';
import { useCSSVariable } from 'uniwind';
import { runIsActive } from './run-status';
import type { RunTerminalProps } from './run-terminal';

type MountedTerminal = {
  terminal: Terminal;
  fit: FitAddon;
  cursor?: RunOutputCursor;
};

type Host = RefObject<HTMLDivElement | null>;

type Mounted = RefObject<MountedTerminal | null>;

function applyOptions(terminal: Terminal, options: ITerminalOptions): void {
  terminal.options = options;
}

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

function useMountedTerminal(viewport: Host): Mounted {
  const mounted = useRef<MountedTerminal>(null);

  useEffect(() => {
    if (!viewport.current) return;

    const terminal = new Terminal({
      cols: terminalColumns,
      rows: terminalRows,
      disableStdin: true,
      screenReaderMode: true,
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'Menlo, Monaco, Consolas, monospace',
    });

    const fit = new FitAddon();

    terminal.loadAddon(fit);
    terminal.open(viewport.current);
    mounted.current = { terminal, fit };

    return (): void => {
      mounted.current = null;
      terminal.dispose();
    };
  }, [viewport]);

  return mounted;
}

type InputProps = Pick<RunTerminalProps, 'onInput'> & { enabled: boolean };

function useTerminalInput(
  mounted: Mounted,
  { enabled, onInput }: InputProps,
): void {
  const pending = useRef(Promise.resolve());

  useEffect(() => {
    const terminal = mounted.current?.terminal;

    if (!terminal) return;

    applyOptions(terminal, { disableStdin: !enabled });

    let listening = true;

    const input = terminal.onData((data) => {
      pending.current = pending.current
        .then(() => (listening && enabled ? onInput(data) : undefined))
        .catch((): void => {});
    });

    return (): void => {
      listening = false;
      input.dispose();
    };
  }, [enabled, mounted, onInput]);
}

function useTerminalTheme(mounted: Mounted): void {
  const [background, foreground] = useCSSVariable([
    '--color-card',
    '--color-foreground',
  ]);

  useEffect(() => {
    const terminal = mounted.current?.terminal;

    if (!terminal) return;

    applyOptions(terminal, {
      theme: {
        background: String(background),
        foreground: String(foreground),
        cursor: String(foreground),
      },
    });
  }, [background, foreground, mounted]);
}

function useTerminalSize(
  viewport: Host,
  mounted: Mounted,
  onResize: RunTerminalProps['onResize'],
): void {
  useEffect(() => {
    const display = viewport.current;
    const emulator = mounted.current;

    if (!display || !emulator) return;

    const update = (): void => {
      if (!display.clientWidth || !display.clientHeight) return;

      emulator.fit.fit();
      onResize(emulator.terminal.cols, emulator.terminal.rows);
    };

    const observer = new ResizeObserver(update);

    update();
    observer.observe(display);

    return (): void => observer.disconnect();
  }, [viewport, mounted, onResize]);
}

type ReplayProps = Pick<RunTerminalProps, 'connected' | 'listen' | 'onResize'>;

function useTerminalReplay(
  mounted: Mounted,
  { connected, listen, onResize }: ReplayProps,
): void {
  useEffect(() => {
    const emulator = mounted.current;

    if (!emulator || !connected) return;

    const { terminal } = emulator;
    let listening = true;

    const stop = listen(emulator.cursor, (frame) => {
      if (!listening) return;

      if (emulator.cursor?.runId !== frame.cursor.runId)
        onResize(terminal.cols, terminal.rows);

      emulator.cursor = receiveFrame(terminal, emulator.cursor, frame);
    });

    return (): void => {
      listening = false;
      stop();
    };
  }, [connected, listen, mounted, onResize]);
}

export function RunTerminal(props: RunTerminalProps): ReactElement {
  const viewport = useRef<HTMLDivElement>(null);
  const mounted = useMountedTerminal(viewport);

  useTerminalTheme(mounted);
  useTerminalInput(mounted, {
    onInput: props.onInput,
    enabled: props.connected && runIsActive(props.run),
  });
  useTerminalSize(viewport, mounted, props.onResize);
  useTerminalReplay(mounted, props);

  return (
    <div
      role="region"
      aria-label={`${props.run.name} Terminal`}
      className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-control bg-card"
    >
      <div ref={viewport} className="size-full px-2 py-1" />
    </div>
  );
}
