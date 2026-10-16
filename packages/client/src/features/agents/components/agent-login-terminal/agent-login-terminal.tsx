import type { DOMProps } from 'expo/dom';
import { createElement, useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';
import { SizeClass } from '../../../../lib/generic/size-class/size-class';
import { terminalKeyboardHeight } from './terminal-appearance';
import type { LoginTerminalProps } from './terminal-props';
import TerminalRenderer from './terminal-renderer';
import { useTerminalAppearance } from './use-terminal-appearance';

const desktopHeight = 320;

const phoneHeight = 240;

const accessoryHeight = 62;

// A wide window gives the terminal a desktop height; a phone's shrinks while the keyboard is up.
export function AgentLoginTerminal(
  props: LoginTerminalProps,
): React.JSX.Element {
  return (
    <>
      <SizeClass only="wide">
        <SizedTerminal {...props} wide />
      </SizeClass>
      <SizeClass only="compact">
        <SizedTerminal {...props} wide={false} />
      </SizeClass>
    </>
  );
}

function SizedTerminal({
  wide,
  ...props
}: LoginTerminalProps & { wide: boolean }): React.JSX.Element {
  const keyboardOpen = useTerminalKeyboard();
  const height = viewportHeight(wide, keyboardOpen);
  const accessory = !wide && keyboardOpen;
  const appearance = useTerminalAppearance();

  return createElement(TerminalRenderer, {
    ...props,
    appearance,
    ...rendererLayout(height, accessory, !wide),
  });
}

const viewportHeight = (wide: boolean, keyboard: boolean): number => {
  if (wide) return desktopHeight;

  return keyboard ? terminalKeyboardHeight : phoneHeight;
};

function useTerminalKeyboard(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const shown = Keyboard.addListener('keyboardDidShow', () => setOpen(true));

    const hidden = Keyboard.addListener('keyboardDidHide', () =>
      setOpen(false),
    );

    return (): void => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  return open;
}

const rendererLayout = (
  height: number,
  keyboardOpen: boolean,
  compact: boolean,
): Pick<
  React.ComponentProps<typeof TerminalRenderer>,
  'height' | 'keyboardOpen' | 'compact' | 'dom'
> => ({
  height,
  keyboardOpen,
  compact,
  dom: terminalDOMLayout(height, keyboardOpen),
});

const terminalDOMLayout = (height: number, keyboard: boolean): DOMProps => ({
  scrollEnabled: false,
  containerStyle: {
    flex: 0,
    width: '100%',
    height: height + (keyboard ? accessoryHeight : 0),
  },
  style: { height: height + (keyboard ? accessoryHeight : 0) },
});
