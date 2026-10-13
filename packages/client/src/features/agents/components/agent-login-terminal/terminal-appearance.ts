export type TerminalAppearance = {
  background: string;
  foreground: string;
  buttonForeground: string;
};

export const defaultTerminalAppearance: TerminalAppearance = {
  background: '#f5f5f5',
  foreground: '#0a0a0a',
  buttonForeground: '#171717',
};

export const terminalKeyboardHeight = 120;
