import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { StatusDot } from './status-dot';

const meta = {
  title: 'Tests/Design System/Primitives/Status/StatusDot',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

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

export const DrawsEveryTone: Story = {
  render: () => (
    <>
      {tones.map((tone) => (
        <StatusDot key={tone} tone={tone} testID={`status-${tone}`} />
      ))}
    </>
  ),
  play: async ({ canvas }) => {
    for (const tone of tones)
      await expect(canvas.getByTestId(`status-${tone}`)).toBeInTheDocument();
  },
};

export const PulsesWhenRequested: Story = {
  render: () => <StatusDot tone="success" pulse testID="pulsing-status" />,
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('pulsing-status')).toBeInTheDocument();
  },
};
