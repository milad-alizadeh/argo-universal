import type { AgentAuthTerminalFrame } from '@repo/contracts';

const terminalOutput = {
  cursor: 103,
  output:
    'Sign in with your subscription.\r\n\r\n\u001b[32m› Continue in your browser\u001b[0m\r\n  Cancel\r\n\r\nUse ↑ / ↓ then Enter.',
};

const terminalIdle = { cursor: terminalOutput.cursor, output: '' };

export const readTerminalFrame = async (
  cursor: number,
): Promise<AgentAuthTerminalFrame> => (cursor ? terminalIdle : terminalOutput);
