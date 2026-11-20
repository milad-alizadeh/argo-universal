import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { Swatch } from './swatch';
import { gradientSwatch } from './swatch-fixtures';

const meta = {
  title: 'Tests/Design System/Primitives/Visual/Swatch',
  component: Swatch,
  args: gradientSwatch,
} satisfies Meta<typeof Swatch>;

export default meta;

type Story = StoryObj<typeof meta>;

export const IsAnImageNamedByItsLabel: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('img', { name: gradientSwatch.accessibilityLabel }),
    ).toBeVisible();
  },
};
