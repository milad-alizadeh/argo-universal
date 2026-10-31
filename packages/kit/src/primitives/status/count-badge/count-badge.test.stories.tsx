import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { expect } from 'storybook/test';
import { CountBadge } from './count-badge';
import { countCountBadge } from './count-badge-fixtures';

/*
 * An enlarged text size makes the count's line taller than the badge's minimum height. The browser has no such
 * setting, so the count's line is made tall here, as it would be at XXXL.
 */
const enlargedCount =
  '[data-testid="enlarged-count"] * { line-height: 48px !important; }';

const meta = {
  title: 'Tests/Design System/Primitives/Status/CountBadge',
  component: CountBadge,
  args: countCountBadge,
  decorators: [
    (Story): React.JSX.Element => (
      <View className="flex-row" testID="enlarged-count">
        <style>{enlargedCount}</style>
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof CountBadge>;

export default meta;

type Story = StoryObj<typeof meta>;

// A count taller than the badge's minimum height is not drawn over its edge: the badge grows to hold it.
export const BadgeHoldsItsWholeCount: Story = {
  play: async ({ canvas }) => {
    const badge = canvas
      .getByLabelText('3 items need attention')
      .getBoundingClientRect();

    const count = canvas.getByText('3').getBoundingClientRect();

    await expect(badge.height).toBeGreaterThanOrEqual(count.height);
    await expect(count.top).toBeGreaterThanOrEqual(badge.top);
    await expect(count.bottom).toBeLessThanOrEqual(badge.bottom);
  },
};
