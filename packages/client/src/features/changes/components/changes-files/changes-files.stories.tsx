import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { ChangesFiles } from './changes-files';
import { binaryFile, renamedFile } from './changes-files-fixtures';

const meta = {
  title: 'Changes/ChangesFiles',
  component: ChangesFiles,
  decorators: [
    (Story): React.JSX.Element => (
      <View className="h-80 w-full">
        <Story />
      </View>
    ),
  ],
  argTypes: {
    comparison: { control: false },
    branches: { control: false },
    files: { control: false },
    diffs: { control: false },
    viewed: { control: false },
    onComparisonChange: { control: false },
    onLoadDiff: { control: false },
    onViewedChange: { control: false },
  },
  args: renamedFile,
} satisfies Meta<typeof ChangesFiles>;

export default meta;

type Story = StoryObj<typeof meta>;

// A moved file's header reads where it was, then where it is.
export const RenamedFile: Story = {};

// A binary file says it cannot be previewed, not that it has no lines.
export const BinaryFile: Story = { args: binaryFile };
