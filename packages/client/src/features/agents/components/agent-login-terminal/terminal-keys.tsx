import type { CSSProperties } from 'react';
import type { TerminalAppearance } from './terminal-appearance';

export type TerminalKeyProps = {
  appearance?: TerminalAppearance;
  send: (text: string) => void;
  control: boolean;
  toggleControl: () => void;
};

const keys = [
  { label: 'Esc', text: '\u001b' },
  { label: 'Tab', text: '\t' },
  { label: 'Ctrl', text: '' },
  { label: '←', text: '\u001b[D' },
  { label: '↑', text: '\u001b[A' },
  { label: '↓', text: '\u001b[B' },
  { label: '→', text: '\u001b[C' },
];

const keyStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  height: 50,
  border: 0,
  borderRadius: 999,
  fontSize: 14,
};

export function TerminalKeys(props: TerminalKeyProps): React.JSX.Element {
  return (
    <div
      role="toolbar"
      aria-label="Terminal keys"
      style={{ display: 'flex', gap: 4, width: '100%' }}
    >
      {keys.map((key) => (
        <Key key={key.label} {...keyProps(key, props)} />
      ))}
    </div>
  );
}

type KeyProps = {
  appearance?: TerminalAppearance;
  label: string;
  press: () => void;
  pressed: boolean;
};

function Key(props: KeyProps): React.JSX.Element {
  return (
    <button
      type="button"
      aria-pressed={props.pressed}
      onPointerDown={keepTerminalFocus}
      onTouchStart={keepTerminalFocus}
      onTouchEnd={touchPress(props.press)}
      onClick={props.press}
      style={keyDrawing(props.appearance)}
    >
      {props.label}
    </button>
  );
}

const keepTerminalFocus = (event: { preventDefault: () => void }): void =>
  event.preventDefault();

const touchPress =
  (press: () => void) =>
  (event: { preventDefault: () => void }): void => {
    event.preventDefault();
    press();
  };

const keyProps = (
  key: { label: string; text: string },
  props: TerminalKeyProps,
): KeyProps => ({
  appearance: props.appearance,
  label: key.label,
  pressed: key.label === 'Ctrl' && props.control,
  press: () => (key.text ? props.send(key.text) : props.toggleControl()),
});

const keyDrawing = (
  appearance: TerminalAppearance | undefined,
): CSSProperties => ({
  ...keyStyle,
  background: appearance?.background,
  color: appearance?.buttonForeground,
});
