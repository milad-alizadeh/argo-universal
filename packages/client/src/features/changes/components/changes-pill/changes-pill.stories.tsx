import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { ChangesPill } from './changes-pill';
import { manyFilesChanged } from './changes-pill-fixtures';

const meta = {
  title: 'Changes/ChangesPill',
  component: ChangesPill,
  args: { ...manyFilesChanged, onPress: fn() },
  argTypes: {
    summary: { control: false },
    onPress: { control: false },
  },
} satisfies Meta<typeof ChangesPill>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
