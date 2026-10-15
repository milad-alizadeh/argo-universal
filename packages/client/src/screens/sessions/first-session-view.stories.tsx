import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import {
  FirstSessionView,
  type FirstSessionViewProps,
} from './first-session-view';

const meta = {
  title: 'Screens/Sessions/First Session',
  parameters: { screenPreview: true },
  args: { view: { state: 'loading' } },
  render: ({ view }): React.JSX.Element => <FirstSessionView {...view} />,
} satisfies Meta<{ view: FirstSessionViewProps }>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Loading: Story = {};
