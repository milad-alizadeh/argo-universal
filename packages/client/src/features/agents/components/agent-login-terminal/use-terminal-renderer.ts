import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import { useEffect, useRef, type RefObject } from 'react';
import type { LoginTerminalProps } from './terminal-props';
import { TerminalRuntime, type TerminalRuntimeInput } from './terminal-runtime';
import { useControlModifier } from './use-control-modifier';

const terminalOptions = {
  fontSize: 13,
  fontFamily: 'Menlo, Monaco, Consolas, monospace',
  scrollback: 1000,
  cursorBlink: true,
  screenReaderMode: true,
};

type TerminalMountPorts = Pick<TerminalRuntimeInput, 'props' | 'control'>;

type Renderer = {
  viewport: RefObject<HTMLDivElement | null>;
  send: (text: string) => void;
  control: boolean;
  toggleControl: () => void;
};

export function useTerminalRenderer(props: LoginTerminalProps): Renderer {
  const viewport = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  }, [props]);
  const modifier = useControlModifier();
  const runtime = useTerminalMount(viewport, latest, modifier.apply);
  useEffect(() => {
    runtime.current?.refresh();
  }, [runtime, props.enabled, props.appearance]);

  return { viewport, ...modifier, send: (text) => runtime.current?.send(text) };
}

function useTerminalMount(
  viewport: RefObject<HTMLDivElement | null>,
  props: RefObject<LoginTerminalProps>,
  control: (text: string) => string,
): RefObject<TerminalRuntime | null> {
  const runtime = useRef<TerminalRuntime>(null);
  useEffect(() => {
    const read = (): LoginTerminalProps => props.current;

    return mountTerminalRef(viewport, runtime, { props: read, control });
  }, [viewport, props, control]);

  return runtime;
}

type MountedTerminal = { runtime: TerminalRuntime; close: () => void };

const mountTerminal = (
  viewport: HTMLDivElement,
  input: TerminalMountPorts,
): MountedTerminal => {
  const terminal = new Terminal(terminalOptions);
  const fit = new FitAddon();
  terminal.loadAddon(fit);
  terminal.open(viewport);
  const runtime = new TerminalRuntime({ terminal, fit, ...input });

  return { runtime, close: disposeTerminal(runtime, terminal) };
};

const disposeTerminal =
  (runtime: TerminalRuntime, terminal: Terminal): (() => void) =>
  (): void => {
    runtime.close();
    terminal.dispose();
  };

const mountTerminalRef = (
  viewport: Renderer['viewport'],
  runtime: RefObject<TerminalRuntime | null>,
  input: TerminalMountPorts,
): (() => void) | undefined => {
  if (!viewport.current) return;
  const mounted = mountTerminal(viewport.current, input);
  runtime.current = mounted.runtime;

  return (): void => {
    mounted.close();
    runtime.current = null;
  };
};
