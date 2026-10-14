import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { page } from 'vitest/browser';
import { mediumBreakpoint, wideBreakpoint } from '../each-layout';
import { SizeClassMock } from './use-size-class.mocks';

const meta = {
  title: 'Tests/UseSizeClass',
  component: SizeClassMock,
  // Resizing uses Vitest's browser runner, so this story is only for tests.
  tags: ['!dev'],
} satisfies Meta<typeof SizeClassMock>;

export default meta;

type Story = StoryObj<typeof meta>;

// CI runners can take over a second to redraw after a resize.
const layoutUpdate = { timeout: 3000 };

const medium = 'Medium breakpoint';

const wide = 'Wide breakpoint';

// The hook and the theme.css breakpoint variants change at the same widths.
export const ChangesAtEachBreakpoint: Story = {
  play: async ({ canvas }) => {
    const steps = [
      [mediumBreakpoint() - 1, 'compact', []],
      [mediumBreakpoint(), 'medium', [medium]],
      [wideBreakpoint() - 1, 'medium', [medium]],
      [wideBreakpoint(), 'wide', [medium, wide]],
      [mediumBreakpoint() - 1, 'compact', []],
    ] as const;

    for (const [width, sizeClass, shown] of steps) {
      await page.viewport(width, 900);
      await expect(
        await canvas.findByText(`${sizeClass} layout`, {}, layoutUpdate),
      ).toBeVisible();

      for (const label of [medium, wide])
        await expect(canvas.getByText(label).checkVisibility()).toBe(
          shown.some((visible): boolean => visible === label),
        );
    }
  },
};
