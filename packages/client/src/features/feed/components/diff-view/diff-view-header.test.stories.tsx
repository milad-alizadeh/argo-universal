import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { expect } from 'storybook/test';
import { recordedFile } from '../../../../../mocks/feed-edit-mock';
import { DiffView } from './diff-view';

const largeHeader = { name: 'Diff for /repo/large.txt' };

const meta = {
  title: 'Tests/Feed/DiffView/Header',
  component: DiffView,
  globals: { mode: 'light' },
  decorators: [
    (Story): React.JSX.Element => (
      <View className="w-full">
        <Story />
      </View>
    ),
  ],
  args: { file: recordedFile('agent-2', 'edit-states') },
} satisfies Meta<typeof DiffView>;

export default meta;

type Story = StoryObj<typeof meta>;

function headerWithoutCopy(width: number): Story {
  return {
    play: async ({ canvas }) => {
      if (process.env.NODE_ENV !== 'test') return;

      await settleLayout(width);
      await expect(canvas.getByRole('button', largeHeader)).toBeVisible();
      await expect(
        canvas.queryByRole('button', { name: 'Copy path' }),
      ).toBeNull();
      await expect(canvas.getByText(/^\+\d+$/)).toBeVisible();
    },
  };
}

export const WideHeaderHasNoCopy = headerWithoutCopy(layoutWidths.wide);

export const PhoneHeaderHasNoCopy = headerWithoutCopy(layoutWidths.phone);
