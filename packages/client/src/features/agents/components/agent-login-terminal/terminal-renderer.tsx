'use dom';

import type { DOMProps } from 'expo/dom';
import '@xterm/xterm/css/xterm.css';
import { createElement, type RefObject, type CSSProperties } from 'react';
import {
  defaultTerminalAppearance,
  terminalKeyboardHeight,
  type TerminalAppearance,
} from './terminal-appearance';
import { TerminalKeys } from './terminal-keys';
import type { LoginTerminalProps } from './terminal-props';
import { useDOMKeyboard } from './use-terminal-keyboard';
import { useTerminalRenderer } from './use-terminal-renderer';
type Props = LoginTerminalProps & {
  appearance?: TerminalAppearance;
  height: number;
  keyboardOpen: boolean;
  compact: boolean;
  dom?: DOMProps;
};
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
      background: terminalBackground(props.appearance),
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
  background: string;
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

const terminalBackground = (
  appearance: TerminalAppearance | undefined,
): string => appearance?.background ?? defaultTerminalAppearance.background;

const terminalViewportStyle = (
  height: number,
  background: string,
): CSSProperties => ({
  ...viewportStyle,
  height,
  background,
  width: '100%',
  minWidth: 0,
});
