import {
  terminalColumns,
  terminalRows,
  type RunOutputCursor,
} from '@repo/contracts';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal, type ITerminalOptions } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { useEffect, useRef, type ReactElement, type RefObject } from 'react';
import { TerminalKeys } from '../../../lib/terminal/terminal-keys';
import { useControlModifier } from '../../../lib/terminal/use-control-modifier';
import type { RunTerminalColors, RunTerminalProps } from './run-terminal-props';
import { terminalFrame } from './run-terminal-replay';

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

type InputProps = Pick<RunTerminalProps, 'onInput'> & {
  enabled: boolean;
  applyControl: (text: string) => string;
};

function useTerminalInput(
  mounted: Mounted,
  { enabled, onInput, applyControl }: InputProps,
): void {
  const pending = useRef(Promise.resolve());

  useEffect(() => {
    const terminal = mounted.current?.terminal;

    if (!terminal) return;

    applyOptions(terminal, { disableStdin: !enabled });

    let listening = true;

    const input = terminal.onData((data) => {
      if (!enabled) return;

      const text = applyControl(data);

      pending.current = pending.current
        .then(() => (listening ? onInput(text) : undefined))
        .catch((): void => {});
    });

    return (): void => {
      listening = false;
      input.dispose();
    };
  }, [applyControl, enabled, mounted, onInput]);
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

      const accepted = terminalFrame(emulator.cursor, frame);

      if (!accepted) return emulator.cursor;

      if (accepted.reset) {
        onResize(terminal.cols, terminal.rows);
        terminal.write('\u001bc');
      }

      terminal.write(accepted.bytes);
      emulator.cursor = accepted.cursor;

      return accepted.cursor;
    });

    return (): void => {
      listening = false;
      stop();
    };
  }, [connected, listen, mounted, onResize]);
}

type Props = Omit<RunTerminalProps, 'interactive'> & {
  enabled: boolean;
  colors: RunTerminalColors;
};

export function RunTerminalSurface(props: Props): ReactElement {
  const terminal = useRef<HTMLDivElement>(null);
  const mounted = useMountedTerminal(terminal);
  const modifier = useControlModifier();

  useTerminalTheme(mounted, props.colors);
  useTerminalInput(mounted, {
    onInput: props.onInput,
    enabled: props.enabled,
    applyControl: modifier.apply,
  });
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
