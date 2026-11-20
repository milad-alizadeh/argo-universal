import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, fn, waitFor } from 'storybook/test';
import { nextFrames } from '#mocks/next-frames';
import { IconButton } from '#primitives/actions/icon-button';
import { Text } from '#primitives/content/text';
import { Fader } from './fader';
import { verticalFader } from './fader-fixtures';
import { HeldFader } from './fader.mocks';

const onValueChange = fn();

const meta = {
  title: 'Tests/Design System/Primitives/Controls/Fader',
  component: Fader,
  args: { ...verticalFader, onValueChange },
  beforeEach: (): void => {
    onValueChange.mockClear();
  },
  decorators: [
    (Story): React.JSX.Element => (
      <View className="h-64 w-48">
        <Story />
      </View>
    ),
  ],
  render: (args): React.JSX.Element => (
    <HeldFader {...args}>
      <IconButton icon="plug" accessibilityLabel="Power" onPress={fn()} />
    </HeldFader>
  ),
} satisfies Meta<typeof Fader>;

export default meta;

type Story = StoryObj<typeof meta>;

type Play = NonNullable<Story['play']>;

type Canvas = Parameters<Play>[0]['canvas'];

const slider = (canvas: Canvas): HTMLElement =>
  canvas.getByRole('slider', { name: verticalFader.accessibilityLabel });

const now = 'aria-valuenow';

export const IsASliderNamedByItsLabel: Story = {
  play: async ({ canvas }) => {
    const fader = slider(canvas);

    await expect(fader).toHaveAttribute(now, '80');
    await expect(fader).toHaveAttribute('aria-valuemin', '0');
    await expect(fader).toHaveAttribute('aria-valuemax', '100');
  },
};

export const ArrowKeysMoveItByAStep: Story = {
  play: async ({ canvas, userEvent }) => {
    slider(canvas).focus();
    await userEvent.keyboard('{ArrowUp}');
    await expect(onValueChange).toHaveBeenLastCalledWith(81);
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    await expect(onValueChange).toHaveBeenLastCalledWith(79);
    await userEvent.keyboard('{Home}');
    await expect(onValueChange).toHaveBeenLastCalledWith(0);
    await userEvent.keyboard('{End}');
    await expect(onValueChange).toHaveBeenLastCalledWith(100);
    await waitFor(() => expect(slider(canvas)).toHaveAttribute(now, '100'));
  },
};

interface Coords {
  clientX: number;
  clientY: number;
}

// Drags the surface's centre by a share of its height; a negative share drags up.
async function dragBy(
  { canvas, userEvent }: Pick<Parameters<Play>[0], 'canvas' | 'userEvent'>,
  share: number,
): Promise<void> {
  const fader = slider(canvas);

  // The surface measures itself after its first layout; a drag before that has no length to be a share of.
  await nextFrames();

  const box = fader.getBoundingClientRect();
  const x = box.left + box.width / 2;
  const y = box.top + box.height / 2;

  const at = (dy: number): Coords => ({
    clientX: x,
    clientY: y + dy * box.height,
  });

  await userEvent.pointer([
    { target: fader, coords: at(0), keys: '[MouseLeft>]' },
    { target: fader, coords: at(share / 2) },
    { target: fader, coords: at(share) },
    { keys: '[/MouseLeft]' },
  ]);
}

export const DraggingMovesItByTheDistanceDragged: Story = {
  play: async (context) => {
    // Relative: a drag up by a fifth of the height from 80 reaches 100, wherever on the surface it began.
    await dragBy(context, -0.2);
    await waitFor(() => expect(onValueChange).toHaveBeenLastCalledWith(100));
    await dragBy(context, 0.3);
    await waitFor(() => expect(onValueChange).toHaveBeenLastCalledWith(70));
  },
};

export const TappingItsButtonDoesNotMoveIt: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Power' }));
    await expect(onValueChange).not.toHaveBeenCalled();
    await expect(slider(canvas)).toHaveAttribute(now, '80');
  },
};

export const DisabledDoesNotMove: Story = {
  args: { disabled: true },
  play: async ({ canvas, userEvent }) => {
    slider(canvas).focus();
    await userEvent.keyboard('{ArrowUp}');
    await expect(onValueChange).not.toHaveBeenCalled();
  },
};

export const SecondaryTextTakesTheInkAtReducedEmphasis: Story = {
  render: (args) => (
    <HeldFader {...args}>
      <Text role="row">Primary</Text>
      <Text role="secondary">Secondary</Text>
    </HeldFader>
  ),
  play: async ({ canvas }) => {
    const primary = canvas.getByText('Primary');
    const secondary = canvas.getByText('Secondary');

    // The ink at 70% reads as the primary's colour with an alpha.
    await expect(getComputedStyle(primary).color).not.toContain('/');
    await expect(getComputedStyle(secondary).color).toContain('/ 0.7');
  },
};
