import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { fn } from 'storybook/test';
import { SessionView, type SessionViewProps } from './session-view';
import {
  DetailHeaderSlots,
  emptySession,
  idleSession,
  longSession,
  runningSession,
} from './session-view.mocks';

const meta = {
  title: 'Screens/SessionScreen',
  parameters: { screenPreview: true },
  args: { view: { state: 'open', ...runningSession } },
  render: ({ view }): React.JSX.Element => (
    <DetailHeaderSlots>
      <SessionView {...view} />
    </DetailHeaderSlots>
  ),
} satisfies Meta<{ view: SessionViewProps }>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = { name: 'SessionScreen' };

export const Idle: Story = {
  args: { view: { state: 'open', ...idleSession } },
};

export const LoadingEarlier: Story = {
  args: {
    view: {
      state: 'open',
      ...longSession,
      feed: { ...longSession.feed, loadingOlder: true },
    },
  },
};

export const LongFeed: Story = {
  args: { view: { state: 'open', ...longSession } },
};

export const Empty: Story = {
  args: { view: { state: 'open', ...emptySession } },
};

// The Connection is down: the draft stays editable but Send waits.
export const Disconnected: Story = {
  args: {
    view: {
      state: 'open',
      ...idleSession,
      composer: { ...idleSession.composer, sendable: false },
      cancelCreation: { ...idleSession.cancelCreation, disabled: true },
    },
  },
};

export const Opening: Story = { args: { view: { state: 'opening' } } };

export const FailedToOpen: Story = {
  args: {
    view: {
      state: 'open-failed',
      message: 'The Agent stopped three times in ten minutes',
      onRetry: fn(),
    },
  },
};

export const FailedToLoad: Story = {
  args: { view: { state: 'load-failed', onRetry: fn() } },
};
