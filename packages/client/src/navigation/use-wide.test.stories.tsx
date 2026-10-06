import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { WideMock } from '../../mocks/wide-mock';

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
    const { page } = await import('vitest/browser');
    const resize = async (width: number) => {
      await page.viewport(width, 900);
      console.info('[DEBUG-wide-ci]', {
        requestedWidth: width,
        innerWidth: window.innerWidth,
        clientWidth: document.documentElement.clientWidth,
        parentWidth: window.parent.innerWidth,
        mediaMatches: window.matchMedia('(min-width: 720px)').matches,
        breakpointDisplay: getComputedStyle(canvas.getByText('Wide breakpoint'))
          .display,
      });
    };

    await resize(719);
    await expect(
      await canvas.findByText('Phone layout', {}, layoutUpdate),
    ).toBeVisible();
    await expect(canvas.getByText('Wide breakpoint')).not.toBeVisible();

    await resize(720);
    await expect(
      await canvas.findByText('Wide layout', {}, layoutUpdate),
    ).toBeVisible();
    await expect(canvas.getByText('Wide breakpoint')).toBeVisible();

    await resize(721);
    await expect(
      await canvas.findByText('Wide layout', {}, layoutUpdate),
    ).toBeVisible();
    await expect(canvas.getByText('Wide breakpoint')).toBeVisible();

    await resize(719);
    await expect(
      await canvas.findByText('Phone layout', {}, layoutUpdate),
    ).toBeVisible();
    await expect(canvas.getByText('Wide breakpoint')).not.toBeVisible();
  },
};
