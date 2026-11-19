import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { expect, waitFor } from 'storybook/test';
import { Pill } from '#primitives/status/pill';
import { FittedRow } from './fitted-row';

const meta = {
  title: 'Tests/Design System/Patterns/FittedRow',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const labels = ['To Do', 'Medium', 'Backend', 'Release 4.2', 'Customer'];

function Line({
  width,
  count,
}: {
  width: number;
  count: number;
}): ReactElement {
  return (
    <View style={{ width }} testID="room">
      <FittedRow gap={4}>
        {labels.slice(0, count).map((text) => (
          <Pill key={text} text={text} />
        ))}
      </FittedRow>
    </View>
  );
}

// A list draws a meta line per row as it scrolls, so a line its items fit draws each of them once, unmeasured.
export const FittingItemsDrawOnce: Story = {
  render: () => <Line width={600} count={3} />,
  play: async ({ canvas }) => {
    await canvas.findByText('Backend');

    // Unseen measuring copies would draw each item, and each "+N", a second time.
    for (const text of labels.slice(0, 3))
      await expect(canvas.getAllByText(text)).toHaveLength(1);

    await expect(canvas.queryByText(/^\+\d$/)).toBeNull();
  },
};

// The "+N" a reader sees: the unseen copies the line measures sit under `aria-hidden`.
function shownCount(counts: HTMLElement[]): HTMLElement {
  const shown = counts.find((count) => !count.closest('[aria-hidden="true"]'));

  if (!shown) throw new Error('No "+N" shown yet');

  return shown;
}

// Items wider than the room fold into a "+N" Pill, and none is cut.
export const OverflowingItemsFold: Story = {
  render: () => <Line width={160} count={5} />,
  play: async ({ canvas }) => {
    const count = await waitFor(() =>
      shownCount(canvas.getAllByText(/^\+\d$/)),
    );

    const room = canvas.getByTestId('room').getBoundingClientRect();

    await expect(count.getBoundingClientRect().right).toBeLessThanOrEqual(
      room.right + 0.5,
    );

    for (const copy of canvas.getAllByText('Customer'))
      await expect(copy).not.toBeVisible();
  },
};
