import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { page } from 'vitest/browser';
import { WideMock } from '../../mocks/wide-mock';

const wideBreakpointLabel = 'Wide breakpoint';

const meta = {
  title: 'Tests/UseWide',
  component: WideMock,
  // Resizing uses Vitest's browser runner, so this story is only for tests.
  tags: ['!dev'],
} satisfies Meta<typeof WideMock>;

export default meta;
type Story = StoryObj<typeof meta>;

// CI runners can take over a second to redraw after a resize.
const layoutUpdate = { timeout: 3000 };

export const UpdatesAt720Pixels: Story = {
  play: async ({ canvas }) => {
    await page.viewport(719, 900);
    await expect(
      await canvas.findByText('Phone layout', {}, layoutUpdate),
    ).toBeVisible();
    await expect(canvas.getByText(wideBreakpointLabel)).not.toBeVisible();

    await page.viewport(720, 900);
    await expect(
      await canvas.findByText('Wide layout', {}, layoutUpdate),
    ).toBeVisible();
    await expect(canvas.getByText(wideBreakpointLabel)).toBeVisible();

    await page.viewport(721, 900);
    await expect(
      await canvas.findByText('Wide layout', {}, layoutUpdate),
    ).toBeVisible();
    await expect(canvas.getByText(wideBreakpointLabel)).toBeVisible();

    await page.viewport(719, 900);
    await expect(
      await canvas.findByText('Phone layout', {}, layoutUpdate),
    ).toBeVisible();
    await expect(canvas.getByText(wideBreakpointLabel)).not.toBeVisible();
  },
};
