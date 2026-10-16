import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { SessionNewView, type SessionNewViewProps } from './session-new-view';
import {
  openingNewSession,
  readyNewSession,
  startingNewSession,
  typedDraft,
} from './session-new-view.mocks';

const meta = {
  title: 'Screens/Sessions/New Session',
  parameters: { screenPreview: true },
  args: { view: { state: 'ready', ...readyNewSession } },
  render: ({ view }): React.JSX.Element => <SessionNewView {...view} />,
} satisfies Meta<{ view: SessionNewViewProps }>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = { name: 'SessionNewScreen' };

export const Draft: Story = {
  args: { view: { state: 'ready', ...readyNewSession, draft: typedDraft } },
};

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
  args: { view: { state: 'ready', ...readyNewSession, ...openingNewSession } },
};

export const Starting: Story = {
  args: { view: { state: 'ready', ...readyNewSession, ...startingNewSession } },
};

export const FailedStart: Story = {
  args: {
    view: {
      state: 'ready',
      ...readyNewSession,
      draft: typedDraft,
      openError: 'The Agent exited before it was ready.',
    },
  },
};

export const Loading: Story = { args: { view: { state: 'loading' } } };

export const LoadFailure: Story = { args: { view: { state: 'load-failed' } } };
