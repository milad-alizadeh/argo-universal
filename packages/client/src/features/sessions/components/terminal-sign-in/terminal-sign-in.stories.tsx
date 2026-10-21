import type { AgentAuthTerminalFrame } from '@repo/contracts';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { TerminalSignIn } from './terminal-sign-in';
import { loginPrompt, terminalSignIn } from './terminal-sign-in-fixtures';

// The login command's output once, then nothing new.
const readLogin = async (cursor: number): Promise<AgentAuthTerminalFrame> => ({
  cursor: loginPrompt.length,
  output: cursor ? '' : loginPrompt,
  closed: false,
});

const meta = {
  title: 'Sessions/TerminalSignIn',
  component: TerminalSignIn,
  // TerminalSignInProps is declared in types/session-callout.ts, which react-docgen cannot follow.
  argTypes: {
    title: { control: 'text', description: "The sign-in method's name." },
    terminal: {
      control: false,
      description:
        "The login command's output, and what this Device types back.",
    },
    onClose: { control: false },
  },
  args: {
    ...terminalSignIn,
    terminal: { onRead: fn(readLogin), onInput: fn(), onFailure: fn() },
    onClose: fn(),
  },
} satisfies Meta<typeof TerminalSignIn>;

export default meta;

type Story = StoryObj<typeof meta>;

// The Agent's login command running on the Server: a panel under the Composer on a wide window, a sheet on a phone.
export const SigningIn: Story = { args: terminalSignIn };
