import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import { SessionChangeFilesUnavailable } from './session-change-files-unavailable';
import {
  hiddenFiles,
  refusedFiles,
} from './session-change-files-unavailable-fixtures';

// Provisional, no Paper design: the limitation of a PR's files that cannot be read, with its retry, from existing primitives.
const meta = {
  title: 'Sessions/SessionChangeFilesUnavailable',
  component: SessionChangeFilesUnavailable,
  decorators: [
    (Story): React.JSX.Element => (
      <View className="w-frame-list p-4">
        <Story />
      </View>
    ),
  ],
  argTypes: { change: { control: false }, onRetry: { control: false } },
  args: { ...refusedFiles, onRetry: fn() },
} satisfies Meta<typeof SessionChangeFilesUnavailable>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Refused: Story = { args: refusedFiles };

export const NotVisibleToTheAccount: Story = { args: hiddenFiles };
