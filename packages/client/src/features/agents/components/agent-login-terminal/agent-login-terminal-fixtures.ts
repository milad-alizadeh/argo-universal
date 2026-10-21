import type { TerminalRendererProps } from './terminal-renderer';

// A story supplies the frame reader and the input and failure callbacks.
type TerminalFixture = Omit<
  TerminalRendererProps,
  'onRead' | 'onInput' | 'onFailure'
>;

const desktopHeight = 320;

// Full height, no key accessory: the sign-in terminal in a desktop window.
export const desktopTerminal = {
  enabled: true,
  compact: false,
  keyboardOpen: false,
  height: desktopHeight,
  dom: {
    containerStyle: { flex: 0, width: '100%', height: desktopHeight },
    style: { height: desktopHeight },
  },
} satisfies TerminalFixture;

const keyboardHeight = 182;

// A phone with the keyboard up: the viewport shrinks and the key accessory sits above it.
export const phoneKeyboardTerminal = {
  enabled: true,
  compact: true,
  keyboardOpen: true,
  height: 120,
  dom: {
    containerStyle: { flex: 0, width: '100%', height: keyboardHeight },
    style: { height: keyboardHeight },
  },
} satisfies TerminalFixture;
