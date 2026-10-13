import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { SessionView } from '../session-view/session-view';
import { idleSession } from '../session-view/session-view.mocks';
import {
  FirstSessionView,
  type FirstSessionViewProps,
} from './first-session-view';

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
      <SessionView state="open" {...idleSession} />
    </FirstSessionView>
  ),
};
