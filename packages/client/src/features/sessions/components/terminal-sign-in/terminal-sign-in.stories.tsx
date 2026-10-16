import type { AgentAuthTerminalFrame } from '@repo/contracts';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { TerminalSignIn } from './terminal-sign-in';

const loginPrompt =
  'Open this link to sign in to Codex:\r\nhttps://auth.openai.com/device\r\n';

// The login command's output once, then nothing new.
const readLogin = async (cursor: number): Promise<AgentAuthTerminalFrame> => ({
  cursor: loginPrompt.length,
  output: cursor ? '' : loginPrompt,
  closed: false,
});

const meta = {
  title: 'Sessions/TerminalSignIn',
  component: TerminalSignIn,
  args: {
    title: 'Terminal sign-in',
    terminal: { onRead: fn(readLogin), onInput: fn(), onFailure: fn() },
    onClose: fn(),
  },
} satisfies Meta<typeof TerminalSignIn>;

export default meta;

export const Overview: StoryObj<typeof meta> = { name: 'TerminalSignIn' };
