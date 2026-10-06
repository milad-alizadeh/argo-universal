import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, waitFor } from 'storybook/test';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#primitives/collapsible';
import { Text } from '#primitives/text';

const meta = { title: 'Tests/Collapsible' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const AnimatedDisclosure: Story = {
  render: () => (
    <Collapsible>
      <CollapsibleTrigger accessibilityLabel="Toggle details">
        <Text>Toggle details</Text>
      </CollapsibleTrigger>
      <CollapsibleContent testID="animated-detail">
        <View className="h-32">
          <Text>Tool call detail</Text>
        </View>
      </CollapsibleContent>
    </Collapsible>
  ),
  play: async ({ canvas, userEvent }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      const trigger = canvas.getByRole('button', { name: 'Toggle details' });
      await userEvent.click(trigger);
      const detail = canvas.getByTestId('animated-detail');
      const opening = await heightsDuringTransition(detail);
      await expect(opening.some((height) => height > 0 && height < 128)).toBe(
        true,
      );
      await expect(Math.max(...opening)).toBeGreaterThan(Math.min(...opening));
      await waitFor(() =>
        expect(detail.getBoundingClientRect().height).toBe(128),
      );
      await userEvent.click(trigger);
      const closing = await heightsDuringTransition(detail);
      await expect(closing.some((height) => height > 0 && height < 128)).toBe(
        true,
      );
      await waitFor(() =>
        expect(canvas.queryByTestId('animated-detail')).not.toBeInTheDocument(),
      );
    }
  },
};

async function heightsDuringTransition(element: HTMLElement) {
  const heights: number[] = [];
  for (let frame = 0; frame < 16; frame++) {
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
    heights.push(element.getBoundingClientRect().height);
  }
  return heights;
}

export const AnimatedDisclosureDark: Story = {
  ...AnimatedDisclosure,
  globals: { mode: 'dark' },
};
