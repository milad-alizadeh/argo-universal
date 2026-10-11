import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { fn } from 'storybook/test';
import {
  FirstSessionView,
  type FirstSessionViewProps,
} from './first-session-view';
import { SessionView } from './session-view';
import { DetailHeaderSlots, idleSession } from './session-view.mocks';

const meta = {
  title: 'Screens/FirstSessionScreen',
  parameters: { screenPreview: true },
  args: { view: { state: 'loading' } },
  render: ({ view }): React.JSX.Element => <FirstSessionView {...view} />,
} satisfies Meta<{ view: FirstSessionViewProps }>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {};

// The root slots the first active Session.
export const Chosen: Story = {
  args: { view: { state: 'chosen', children: null } },
  render: (): React.JSX.Element => (
    <FirstSessionView state="chosen">
      <DetailHeaderSlots>
        <SessionView state="open" {...idleSession} />
      </DetailHeaderSlots>
    </FirstSessionView>
  ),
};

export const LoadFailure: Story = {
  args: { view: { state: 'load-failed', onRetry: fn() } },
};
