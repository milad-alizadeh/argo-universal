import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { headerTag, HeaderDrawing } from './draft-region-fixtures';
import { DraftRegionFrame } from './draft-region-frame';

// What Header's tag says.
const tagText = 'Header · B 2/3';

const meta = {
  title: 'Tests/Plugins/DraftRegionFrame',
  component: DraftRegionFrame,
  args: {
    tag: headerTag,
    active: false,
    onActivate: fn(),
    onDeactivate: fn(),
    onPrevious: fn(),
    onNext: fn(),
    children: <HeaderDrawing />,
  },
} satisfies Meta<typeof DraftRegionFrame>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TagSaysRegionVariantAndPosition: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(tagText)).toBeVisible();
  },
};

export const RestingTagHasNoControls: Story = {
  play: async ({ canvas }) => {
    await canvas.findByText(tagText);

    await expect(canvas.queryByRole('button', { name: /Variant/ })).toBeNull();
  },
};

export const TagSitsOnTheTopEdge: Story = {
  play: async ({ canvas }) => {
    const tag = (await canvas.findByText(tagText)).getBoundingClientRect();

    const drawing = (await canvas.findByText('Issues')).getBoundingClientRect();

    await expect(tag.top).toBeLessThan(drawing.top);
  },
};

export const PointerOverARegionActivatesIt: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.hover(await canvas.findByText('Issues'));

    await expect(args.onActivate).toHaveBeenCalled();
  },
};

export const PressingARestingTagActivatesItsRegion: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(await canvas.findByText(tagText));

    await expect(args.onActivate).toHaveBeenCalled();
  },
};

export const ActiveTagSteps: Story = {
  args: { active: true },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Next Header Variant' }),
    );
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Previous Header Variant' }),
    );

    await expect(args.onNext).toHaveBeenCalledTimes(1);
    await expect(args.onPrevious).toHaveBeenCalledTimes(1);
  },
};
