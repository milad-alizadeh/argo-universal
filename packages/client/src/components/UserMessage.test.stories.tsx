import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, within } from 'storybook/test';
import {
  recordedImageUrl,
  recordedUserMessage,
} from '../../mocks/feed-message-mock';
import { UserMessage } from './UserMessage';

const meta = {
  title: 'Tests/UserMessage',
  globals: { themeId: 'default', mode: 'light' },
  component: UserMessage,
  // The Feed gives every row its full width.
  decorators: [
    (Story) => (
      <View className="w-full">
        <Story />
      </View>
    ),
  ],
  args: {
    row: recordedUserMessage('agent-1', 'interrupt'),
    imageUrl: recordedImageUrl,
  },
} satisfies Meta<typeof UserMessage>;
export default meta;
type Story = StoryObj<typeof meta>;

const widths = [390, 1440];

async function settleViewport(width: number) {
  const { page } = await import('vitest/browser');
  await page.viewport(width, 844);
  await document.fonts.ready;
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}

export const InlineCode: Story = {
  play: async ({ canvas }) => {
    for (const width of widths) {
      await settleViewport(width);
      const code = getComputedStyle(
        canvas.getAllByText('sleep 20 && echo done', {
          exact: true,
        })[0] as HTMLElement,
      );
      await expect(code.fontFamily).toContain('SF Mono');
      await expect(code.fontSize).toBe('12px');
      const prose = canvas.getAllByText(
        /^Run the shell command/,
      )[0] as HTMLElement;
      await expect(getComputedStyle(prose).fontSize).toBe('14px');
      await expect(getComputedStyle(prose).lineHeight).toBe('20px');
      await expect(
        canvas.queryByRole('button', { name: 'Show more' }),
      ).toBeNull();
      const bubble = prose.parentElement?.parentElement;
      const container = prose.closest('.w-full');
      if (!bubble || !container) throw new Error('Expected the bubble');
      await expect(bubble.getBoundingClientRect().width).toBeLessThanOrEqual(
        container.getBoundingClientRect().width * 0.7 + 1,
      );
    }
  },
};

export const FirstAgentOpensImage: Story = {
  args: { row: recordedUserMessage('agent-1', 'image-prompt') },
  play: async (context) => SecondAgentOpensImage.play?.(context),
};

export const SecondAgentOpensImage: Story = {
  args: { row: recordedUserMessage('agent-2', 'image-prompt') },
  play: async ({ canvas, userEvent }) => {
    for (const width of widths) {
      await settleViewport(width);
      await userEvent.click(
        canvas.getByRole('button', { name: 'Open image, 32×32' }),
      );
      const dialog = await within(document.body).findByRole('dialog');
      const image = within(dialog).getByRole('img', { name: '32×32' });
      await expect(image.getBoundingClientRect().width).toBeGreaterThan(120);
      await userEvent.keyboard('{Escape}');
      await expect(within(document.body).queryByRole('dialog')).toBeNull();
    }
  },
};

// The long prompt passes four lines on a phone and fits on a wide screen.
export const ShowMore: Story = {
  args: { row: recordedUserMessage('agent-2', 'markdown-answer') },
  play: async ({ canvas, userEvent }) => {
    await settleViewport(1440);
    await expect(
      canvas.queryByRole('button', { name: 'Show more' }),
    ).toBeNull();
    await settleViewport(390);
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Show more' }),
    );
    await expect(
      canvas.queryByRole('button', { name: 'Show more' }),
    ).toBeNull();
    await expect(
      canvas.getAllByText(/^Without using/)[0]?.getBoundingClientRect().height,
    ).toBeGreaterThan(80);
  },
};
