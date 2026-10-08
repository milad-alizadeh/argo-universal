import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, waitFor } from 'storybook/test';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#primitives/collapsible';
import { Text } from '#primitives/text';
import { layoutWidths } from '../../mocks/each-layout';
import { settleViewport } from '../../mocks/settle-viewport';

const animatedDetailId = 'animated-detail';

const meta = { title: 'Tests/Collapsible' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function animatedDisclosure(width: number): Story {
  return {
    render: () => (
      <Collapsible>
        <CollapsibleTrigger accessibilityLabel="Toggle details">
          <Text>Toggle details</Text>
        </CollapsibleTrigger>
        <CollapsibleContent testID={animatedDetailId}>
          <View className="h-32">
            <Text>Tool call detail</Text>
          </View>
        </CollapsibleContent>
      </Collapsible>
    ),
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const trigger = canvas.getByRole('button', { name: 'Toggle details' });
      await expect(
        canvas.queryByTestId(animatedDetailId),
      ).not.toBeInTheDocument();
      await userEvent.click(trigger);
      const detail = canvas.getByTestId(animatedDetailId);
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
        expect(canvas.queryByTestId(animatedDetailId)).not.toBeInTheDocument(),
      );
    },
  };
}
export const AnimatedDisclosurePhone = animatedDisclosure(layoutWidths.phone);
export const AnimatedDisclosureWide = animatedDisclosure(layoutWidths.wide);

async function heightsDuringTransition(
  element: HTMLElement,
): Promise<number[]> {
  const heights: number[] = [];
  for (let frame = 0; frame < 16; frame++) {
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
    heights.push(element.getBoundingClientRect().height);
  }
  return heights;
}

const dark = { globals: { mode: 'dark' } };
export const AnimatedDisclosurePhoneDark: Story = {
  ...AnimatedDisclosurePhone,
  ...dark,
};
export const AnimatedDisclosureWideDark: Story = {
  ...AnimatedDisclosureWide,
  ...dark,
};
