import type { StoryObj } from '@storybook/react-native-web-vite';
import { expect, within } from 'storybook/test';
import presentationMeta, { TextOnly as TextOnlyLabel } from './label.stories';

const meta = {
  ...presentationMeta,
  title: 'Tests/Design System/Primitives/Content/Label',
};

export default meta;

type Story = StoryObj<typeof meta>;

export const TextOnly: Story = {
  ...TextOnlyLabel,
  play: async ({ canvas }) => {
    const label = canvas.getByTestId('label-text-only');

    await expect(within(label).getByText('v1.2.0')).toBeVisible();
    await expect(within(label).queryByTestId(/^icon-/)).toBeNull();
  },
};
