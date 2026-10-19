import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect } from 'storybook/test';
import { Pill } from './pill';

const tones = [
  'neutral',
  'muted',
  'accent',
  'info',
  'success',
  'warning',
  'danger',
  'done',
] as const;

const trackerColor = ['#', '82', '50', 'df'].join('');

const meta = { title: 'Tests/Pill' } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const ShowsEveryTone: Story = {
  render: () => (
    <View className="flex-row flex-wrap gap-2">
      {tones.map((tone) => (
        <Pill key={tone} text={tone} tone={tone} />
      ))}
    </View>
  ),
  play: async ({ canvas }) => {
    for (const tone of tones)
      await expect(canvas.getByText(tone)).toBeVisible();
  },
};

export const ShowsCustomColor: Story = {
  render: () => <Pill color={trackerColor} text="good first issue" />,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('good first issue')).toBeVisible();
  },
};
