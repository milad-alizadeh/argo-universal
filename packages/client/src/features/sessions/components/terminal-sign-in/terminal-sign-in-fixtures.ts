import type { TerminalSignInProps } from './terminal-sign-in';

// A story supplies the terminal's callbacks and Close; a fixture is the method's name and what its command prints.
type TerminalSignInFixture = Omit<TerminalSignInProps, 'terminal' | 'onClose'>;

export const terminalSignIn = {
  title: 'Terminal sign-in',
} satisfies TerminalSignInFixture;

export const loginPrompt =
  'Open this link to sign in to Codex:\r\nhttps://auth.openai.com/device\r\n';
