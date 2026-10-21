'use dom';

import type {
  AgentAuthTerminalFrame,
  AgentAuthTerminalInput,
} from '@repo/contracts';
import type { DOMProps } from 'expo/dom';
import '@xterm/xterm/css/xterm.css';
import { createElement, type RefObject, type CSSProperties } from 'react';
import {
  terminalKeyboardHeight,
  type TerminalAppearance,
} from './terminal-appearance';
import { TerminalKeys } from './terminal-keys';
import { useDOMKeyboard } from './use-terminal-keyboard';
import { useTerminalRenderer } from './use-terminal-renderer';

/*
 * Spelled out rather than intersected with LoginTerminalProps: react-docgen is Babel-based, so the props table
 * reads only a type written in the component's own file.
 */
export interface TerminalRendererProps {
  // The colour tokens the host reads for the terminal, its keys and its viewport.
  appearance?: TerminalAppearance;
  // False while the Agent's sign-in is not running: the key accessory stays away.
  enabled: boolean;
  // The viewport's height; an open phone keyboard overrides it.
  height: number;
  keyboardOpen: boolean;
  // The phone layout, which adds the key accessory above the keyboard.
  compact: boolean;
  dom?: DOMProps;
  onRead: (cursor: number) => Promise<AgentAuthTerminalFrame>;
  onInput: (input: AgentAuthTerminalInput) => Promise<void>;
  onFailure: (message: string) => Promise<void>;
}

type Props = TerminalRendererProps;

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  width: '100%',
  minWidth: 0,
};

const viewportStyle: CSSProperties = {
  boxSizing: 'border-box',
  padding: 16,
  borderRadius: 10,
  overflow: 'hidden',
};

const fillStyle: CSSProperties = { height: '100%', width: '100%', minWidth: 0 };

type TerminalContentProps = {
  panel: ViewportProps;
  controls: React.ComponentProps<typeof TerminalKeys>;
  showKeys: boolean;
};

export default function TerminalRenderer(props: Props): React.JSX.Element {
  return <TerminalContent {...useTerminalPanel(props)} />;
}

function useTerminalPanel(props: Props): TerminalContentProps {
  const { viewport, ...keys } = useTerminalRenderer(props);
  const accessory = useDOMKeyboard(props.compact, props.keyboardOpen);

  return {
    panel: {
      viewport,
      height: keyboardViewportHeight(accessory, props.height),
      background: props.appearance?.background,
    },
    controls: { ...keys, appearance: props.appearance },
    showKeys: showAccessory(accessory, props.enabled),
  };
}

function TerminalContent({
  panel,
  controls,
  showKeys,
}: TerminalContentProps): React.JSX.Element {
  return (
    <div style={containerStyle}>
      <TerminalViewport {...panel} />
      {showKeys && <TerminalKeys {...controls} />}
    </div>
  );
}

type ViewportProps = {
  viewport: RefObject<HTMLDivElement | null>;
  height: number;
  background: string | undefined;
};

function TerminalViewport({
  viewport,
  height,
  background,
}: ViewportProps): React.JSX.Element {
  return createElement(
    'div',
    {
      role: 'region',
      'aria-label': 'Agent sign-in terminal',
      style: terminalViewportStyle(height, background),
    },
    createElement('div', { ref: viewport, style: fillStyle }),
  );
}

const showAccessory = (keyboard: boolean, enabled: boolean): boolean =>
  keyboard && enabled;

const keyboardViewportHeight = (keyboard: boolean, height: number): number =>
  keyboard ? terminalKeyboardHeight : height;

const terminalViewportStyle = (
  height: number,
  background: string | undefined,
): CSSProperties => ({
  ...viewportStyle,
  height,
  background,
  width: '100%',
  minWidth: 0,
});
