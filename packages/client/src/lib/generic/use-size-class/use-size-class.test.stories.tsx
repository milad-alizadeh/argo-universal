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

const compactContent = 'Compact content';

const wideContent = 'Wide content';

// The hook and the theme.css variants change at the same widths; `wide:`, the desktop drawing, starts at wide.
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

// A gate draws its content at one size class only; medium lays out like compact.
export const GatesBySizeClass: Story = {
  play: async ({ canvas }) => {
    const steps = [
      [mediumBreakpoint() - 1, 'compact', compactContent],
      [mediumBreakpoint(), 'medium', compactContent],
      [wideBreakpoint() - 1, 'medium', compactContent],
      [wideBreakpoint(), 'wide', wideContent],
      [mediumBreakpoint() - 1, 'compact', compactContent],
    ] as const;

    for (const [width, sizeClass, shown] of steps) {
      await page.viewport(width, 900);
      await canvas.findByText(`${sizeClass} layout`, {}, layoutUpdate);

      for (const label of [compactContent, wideContent])
        await expect(canvas.queryByText(label) !== null).toBe(label === shown);
    }
  },
};

// One slot per size class draws in one place, so the same part keeps its state as the window crosses a size class.
export const SlotsKeepTheirState: Story = {
  play: async ({ canvas, userEvent }) => {
    await page.viewport(mediumBreakpoint() - 1, 900);
    await userEvent.click(
      await canvas.findByText('Compact count 0', {}, layoutUpdate),
    );
    await expect(await canvas.findByText('Compact count 1')).toBeVisible();

    await page.viewport(wideBreakpoint(), 900);
    await expect(
      await canvas.findByText('Wide count 1', {}, layoutUpdate),
    ).toBeVisible();
  },
};
