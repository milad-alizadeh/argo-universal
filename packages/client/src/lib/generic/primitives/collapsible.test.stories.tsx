import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, waitFor } from 'storybook/test';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#lib/generic/primitives/collapsible';
import { Text } from '#lib/generic/primitives/text';
import { layoutWidths } from '../each-layout';
import { settleViewport } from '../settle-viewport';

const animatedDetailId = 'animated-detail';

const meta = { title: 'Tests/Collapsible' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function disclosure(width: number): Story {
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
      await waitFor(() => expect(detail).toBeVisible());
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      await userEvent.click(trigger);
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await waitFor(() =>
        expect(canvas.queryByTestId(animatedDetailId)).not.toBeInTheDocument(),
      );
    },
  };
}
export const DisclosurePhone = disclosure(layoutWidths.phone);
export const DisclosureWide = disclosure(layoutWidths.wide);

const dark = { globals: { mode: 'dark' } };
export const DisclosurePhoneDark: Story = {
  ...DisclosurePhone,
  ...dark,
};
export const DisclosureWideDark: Story = {
  ...DisclosureWide,
  ...dark,
};
