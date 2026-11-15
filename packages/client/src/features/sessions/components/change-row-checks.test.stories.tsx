import { settleOverlays } from '@repo/kit/mocks/settle-overlays';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { expect, fn, screen, waitFor, within } from 'storybook/test';
import { page } from 'vitest/browser';
import { ChangeRow } from './change-row';
import { checksOverflowChangeRow } from './change-row-fixtures';

const meta = {
  title: 'Tests/Sessions/ChangeRow/Checks',
  component: ChangeRow,
  args: { ...checksOverflowChangeRow, onOpen: fn() },
  decorators: [
    (Story): ReactElement => (
      <View className="w-frame-list">
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof ChangeRow>;

export default meta;

type Story = StoryObj<typeof meta>;

function cappedChecks(height: number): Story {
  return {
    beforeEach: async () => {
      await settleLayout(1280);
      await page.viewport(1280, height);
    },
    play: async ({ canvas, userEvent }) => {
      await userEvent.click(
        canvas.getByRole('button', { name: /CI Checks 24\/24/ }),
      );
      const popover = await screen.findByRole('dialog', { name: 'CI Checks' });
      await settleOverlays(popover);
      await expect(popover.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        height,
      );
      await expect(popover.getBoundingClientRect().top).toBeGreaterThanOrEqual(
        0,
      );
      await scrollToLastCheck(popover);
    },
  };
}

export const TallWindow = cappedChecks(800);

export const ShortWindow = cappedChecks(400);

async function scrollToLastCheck(popover: HTMLElement): Promise<void> {
  const frame = within(popover).getByTestId('change-check-list');
  await expect(frame.getBoundingClientRect().height).toBeLessThanOrEqual(320);

  const scroll = [frame, ...frame.querySelectorAll<HTMLElement>('*')].find(
    isScrollable,
  );

  if (!scroll) throw new Error('Expected the long CI Checks list to scroll');
  scroll.scrollTo({ top: scroll.scrollHeight });
  await waitFor(async () => {
    const last = within(popover)
      .getByText('Workflow 24')
      .getBoundingClientRect();

    await expect(last.bottom).toBeLessThanOrEqual(
      popover.getBoundingClientRect().bottom,
    );
    await expect(last.top).toBeGreaterThanOrEqual(
      popover.getBoundingClientRect().top,
    );
  });
}

function isScrollable(element: HTMLElement): boolean {
  return (
    element.scrollHeight > element.clientHeight &&
    ['auto', 'scroll'].includes(getComputedStyle(element).overflowY)
  );
}
