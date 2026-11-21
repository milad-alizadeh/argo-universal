import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { ColourWheel } from './colour-wheel';

const meta = {
  title: 'Tests/Design System/Primitives/Controls/Colour Wheel',
  component: ColourWheel,
  args: { accessibilityLabel: 'Colour', onValueChange: fn() },
} satisfies Meta<typeof ColourWheel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PicksAColourFromAnUnselectedWheel: Story = {
  play: async ({ canvas, args, userEvent }) => {
    const wheel = canvas.getByRole('slider', { name: 'Colour' });

    await expect(wheel).toHaveAttribute('aria-valuetext', 'No colour selected');
    const box = wheel.getBoundingClientRect();

    const coords = {
      clientX: box.left + box.width / 2,
      clientY: box.top + box.height / 2,
    };

    await userEvent.pointer([
      { target: wheel, coords, keys: '[MouseLeft>]' },
      { keys: '[/MouseLeft]' },
    ]);
    await expect(args.onValueChange).toHaveBeenCalledWith(
      expect.objectContaining({ saturation: 0 }),
    );
  },
};
