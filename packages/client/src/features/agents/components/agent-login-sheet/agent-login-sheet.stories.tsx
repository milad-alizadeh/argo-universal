import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { readTerminalFrame } from '../agent-login-terminal/terminal.mocks';
import { AgentLoginSheet } from './agent-login-sheet';
import { loginSnapshot } from './agent-login.mocks';

const meta = {
  title: 'Agents/AgentLoginSheet',
  component: AgentLoginSheet,
  args: {
    agentName: 'Codex',
    snapshot: loginSnapshot('choose-method'),
    onChoose: fn(),
    onAnswer: fn(),
    onOpenBrowser: fn(),
    onCancel: fn(),
    onRetry: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof AgentLoginSheet>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ChooseMethod: Story = {};
export const Terminal: Story = {
  args: {
    snapshot: { ...loginSnapshot('authenticating'), terminal: true },
    terminal: {
      onRead: fn(readTerminalFrame),
      onInput: fn(),
      onFailure: fn(),
    },
  },
};
export const Starting: Story = {
  args: { snapshot: loginSnapshot('starting') },
};
export const DeviceCode: Story = {
  args: { snapshot: loginSnapshot('awaiting-browser') },
};
export const Checking: Story = {
  args: { snapshot: loginSnapshot('checking') },
};
export const Ready: Story = { args: { snapshot: loginSnapshot('ready') } };
export const Cancelling: Story = {
  args: { snapshot: loginSnapshot('closing') },
};
export const Cancelled: Story = {
  args: { snapshot: loginSnapshot('cancelled') },
};
export const Failed: Story = { args: { snapshot: loginSnapshot('failed') } };
export const TimedOut: Story = {
  args: { snapshot: loginSnapshot('timed-out') },
};
export const InUse: Story = { args: { snapshot: loginSnapshot('in-use') } };
export const OtherApp: Story = {
  args: { snapshot: loginSnapshot('other-app') },
};
export const Disconnected: Story = { args: { disconnected: true } };
export const Unsupported: Story = {
  args: { snapshot: loginSnapshot('unsupported') },
};
export const AccountRejected: Story = {
  args: { snapshot: loginSnapshot('account-rejected') },
};
export const CleanupFailed: Story = {
  args: { snapshot: loginSnapshot('cleanup-failed') },
};

export const Url: Story = {
  args: {
    snapshot: {
      ...loginSnapshot('awaiting-browser'),
      request: {
        id: 'url-request',
        url: 'https://example.com/sign-in',
        message:
          'Complete the Agent’s sign-in request in your browser, then return here.',
      },
    },
  },
};
