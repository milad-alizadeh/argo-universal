import type { AuthMethodTerminal } from '@agentclientprotocol/sdk';
import { protocolLogin } from './protocol-login.ts';
const terminalMethod: AuthMethodTerminal & { type: 'terminal' } = {
  type: 'terminal',
  id: 'interactive-subscription',
  name: 'Terminal sign-in',
  args: ['--interactive-login'],
};
export const terminalLogin = {
  ...protocolLogin,
  initialize: { ...protocolLogin.initialize, authMethods: [terminalMethod] },
};
export const runTerminalLoginMock = (): void => {
  process.stdin.setRawMode(true);
  process.stdout.write(
    'Sign in with your subscription.\r\n\r\n› Continue in your browser\r\n  Cancel\r\n\r\nUse ↑ / ↓ then Enter.\r\n',
  );
  process.stdin.on('data', (input: Buffer) => {
    if (input.includes(13)) process.exit(0);
  });
};
