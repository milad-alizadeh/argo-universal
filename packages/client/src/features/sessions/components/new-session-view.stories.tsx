import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { fn } from 'storybook/test';
import { NewSessionView, type NewSessionViewProps } from './new-session-view';
import { readyNewSession } from './new-session-view.mocks';

const meta = {
  title: 'Screens/NewSessionScreen',
  parameters: { screenPreview: true },
  args: { view: { state: 'ready', ...readyNewSession } },
  render: ({ view }): React.JSX.Element => <NewSessionView {...view} />,
} satisfies Meta<{ view: NewSessionViewProps }>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = { name: 'NewSessionScreen' };

export const Reconnecting: Story = {
  args: {
    view: {
      state: 'ready',
      ...readyNewSession,
      connected: false,
      canOpen: false,
    },
  },
};

export const Opening: Story = {
  args: {
    view: { state: 'ready', ...readyNewSession, opening: true, canOpen: false },
  },
};

export const FailedStart: Story = {
  args: {
    view: {
      state: 'ready',
      ...readyNewSession,
      openError: 'The Agent exited before it was ready.',
    },
  },
};

export const Loading: Story = { args: { view: { state: 'loading' } } };

export const LoadFailure: Story = {
  args: { view: { state: 'load-failed', onRetry: fn() } },
};
