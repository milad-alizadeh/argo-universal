import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { SessionView, type SessionViewProps } from './session-view';
import {
  emptySession,
  idleSession,
  longSession,
  pullRequestMocks,
  runningSession,
  withPullRequests,
} from './session-view.mocks';

const meta = {
  title: 'Screens/SessionScreen',
  parameters: { screenPreview: true },
  args: { view: { state: 'open', ...runningSession } },
  render: ({ view }): React.JSX.Element => <SessionView {...view} />,
} satisfies Meta<{ view: SessionViewProps }>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = { name: 'SessionScreen' };

export const ChecksRunning: Story = {
  args: {
    view: {
      state: 'open',
      ...withPullRequests(runningSession, [pullRequestMocks.checksRunning]),
    },
  },
};

export const ChecksFailing: Story = {
  args: {
    view: {
      state: 'open',
      ...withPullRequests(runningSession, [pullRequestMocks.checksFailing]),
    },
  },
};

// Every check passed, so Merge PR is ready.
export const ChecksPassed: Story = {
  args: {
    view: {
      state: 'open',
      ...withPullRequests(idleSession, [pullRequestMocks.checksPassed]),
    },
  },
};

export const SeveralPullRequests: Story = {
  args: {
    view: {
      state: 'open',
      ...withPullRequests(runningSession, [
        pullRequestMocks.checksRunning,
        pullRequestMocks.followUp,
      ]),
    },
  },
};

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
    },
  },
};

export const Opening: Story = { args: { view: { state: 'opening' } } };

// The page behind the failure's toast stays blank, whether or not the Server gave a reason.
export const Failed: Story = { args: { view: { state: 'failed' } } };
