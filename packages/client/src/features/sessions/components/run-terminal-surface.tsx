import {
  terminalColumns,
  terminalRows,
  type RunOutput,
  type RunOutputCursor,
} from '@repo/contracts';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal, type ITerminalOptions } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import {
  useCallback,
  useEffect,
  useRef,
  type ReactElement,
  type RefObject,
} from 'react';
import { TerminalKeys } from '../../../lib/terminal/terminal-keys';
import { useControlModifier } from '../../../lib/terminal/use-control-modifier';
import type { RunTerminalColors, RunTerminalProps } from './run-terminal-props';

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

function useTerminalTheme(
  mounted: Mounted,
  { background, foreground }: RunTerminalColors,
): void {
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

type Props = Omit<RunTerminalProps, 'run'> & {
  name: string;
  enabled: boolean;
  colors: RunTerminalColors;
};

export function RunTerminalSurface(props: Props): ReactElement {
  const terminal = useRef<HTMLDivElement>(null);
  const mounted = useMountedTerminal(terminal);
  const modifier = useControlModifier();
  const onInput = useControlledInput(props.onInput, modifier.apply);

  useTerminalTheme(mounted, props.colors);
  useTerminalInput(mounted, { onInput, enabled: props.enabled });
  useTerminalSize(terminal, mounted, props.onResize);
  useTerminalReplay(mounted, props);

  return (
    <div
      role="region"
      aria-label={`${props.name} Terminal`}
      style={surfaceStyle(props.colors)}
    >
      <div ref={terminal} style={viewport} />
      {props.compact && props.enabled && (
        <TerminalKeys
          appearance={{
            background: props.colors.keyBackground,
            buttonForeground: props.colors.buttonForeground,
          }}
          control={modifier.control}
          toggleControl={modifier.toggleControl}
          send={(text) => sendKey(mounted, text)}
        />
      )}
    </div>
  );
}

function useControlledInput(
  onInput: RunTerminalProps['onInput'],
  apply: (text: string) => string,
): RunTerminalProps['onInput'] {
  return useCallback((text) => onInput(apply(text)), [apply, onInput]);
}

function sendKey(mounted: Mounted, text: string): void {
  const terminal = mounted.current?.terminal;

  terminal?.focus();
  terminal?.input(text, true);
}

const surfaceStyle = (colors: RunTerminalColors) =>
  ({
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    overflow: 'hidden',
    padding: '4px 8px',
    background: colors.background,
    borderRadius: colors.radius,
  }) as const;

const viewport = {
  width: '100%',
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
} as const;
