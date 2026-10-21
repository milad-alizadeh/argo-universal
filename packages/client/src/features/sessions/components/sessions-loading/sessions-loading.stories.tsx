import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { sessionsLayoutChoices } from '../../stores/sessions-view';
import { SessionsLoading } from './sessions-loading';
import {
  compactSessionsLoading,
  regularSessionsLoading,
} from './sessions-loading-fixtures';

const meta = {
  title: 'Sessions/SessionsLoading',
  component: SessionsLoading,
  parameters: { previewPadding: false },
  argTypes: {
    layout: {
      control: 'select',
      options: sessionsLayoutChoices.map(({ value }) => value),
    },
  },
  args: regularSessionsLoading,
  decorators: [
    (Story): React.JSX.Element => (
      <View className="w-full bg-content wide:w-frame-list">
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof SessionsLoading>;

export default meta;

type Story = StoryObj<typeof meta>;

// A Project's section header over skeleton rows, so nothing shifts when the Sessions load.
export const Regular: Story = { args: regularSessionsLoading };

// Compact rows show a title bar only.
export const Compact: Story = { args: compactSessionsLoading };
