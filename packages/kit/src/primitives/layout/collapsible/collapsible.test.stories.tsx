import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, waitFor } from 'storybook/test';
import { Text } from '#primitives/content/text';
import { sampleEachFrame } from '../../../../mocks/sample-each-frame';
import { layoutWidths } from '../../../each-layout';
import { settleViewport } from '../../../settle-viewport';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleHeader,
  CollapsibleTrigger,
} from './collapsible';

const animatedDetailId = 'animated-detail';

const toggleLabel = 'Toggle details';

const expanded = 'aria-expanded';

const meta = { title: 'Tests/Collapsible' } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

function disclosure(width: number): Story {
  return {
    render: () => (
      <Collapsible>
        <CollapsibleHeader icon="read" label={toggleLabel} />
        <CollapsibleContent testID={animatedDetailId}>
          <View className="h-32">
            <Text>Tool call detail</Text>
          </View>
        </CollapsibleContent>
      </Collapsible>
    ),
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const trigger = canvas.getByRole('button', { name: toggleLabel });
      await expect(
        canvas.queryByTestId(animatedDetailId),
      ).not.toBeInTheDocument();
      await userEvent.click(trigger);
      const detail = canvas.getByTestId(animatedDetailId);
      await waitFor(() => expect(detail).toBeVisible());
      await expect(trigger).toHaveAttribute(expanded, 'true');
      await userEvent.click(trigger);
      await expect(trigger).toHaveAttribute(expanded, 'false');
      await waitFor(() =>
        expect(canvas.queryByTestId(animatedDetailId)).not.toBeInTheDocument(),
      );
    },
  };
}

export const DisclosurePhone = disclosure(layoutWidths.phone);

export const DisclosureWide = disclosure(layoutWidths.wide);

// Long enough for the close and the content leaving after it.
const closingFrames = 40;

// A row still for this many frames has come to rest.
const restingFrames = 2;

// Where the samples first hold still after they start to move.
function firstRest(tops: readonly number[]): number {
  const moved = tops.findIndex((top) => top !== tops[0]);

  return tops.findIndex(
    (top, index) =>
      moved !== -1 &&
      index >= moved + restingFrames &&
      tops
        .slice(index - restingFrames, index)
        .every((before) => before === top),
  );
}

// The row below rises in one motion and comes to rest once, where it stays; padding on the content closes with it.
export const RowBelowRestsOnce: Story = {
  render: () => (
    <View>
      <Collapsible defaultOpen>
        <CollapsibleTrigger accessibilityLabel={toggleLabel}>
          <Text>Toggle details</Text>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <View className="h-32">
            <Text>Tool call detail</Text>
          </View>
        </CollapsibleContent>
      </Collapsible>
      <Text>Next row</Text>
    </View>
  ),
  play: async ({ canvas }) => {
    await settleViewport(layoutWidths.wide);
    const trigger = canvas.getByRole('button', { name: toggleLabel });
    const below = canvas.getByText('Next row');

    const tops = await sampleEachFrame(
      () => trigger.click(),
      () => below.getBoundingClientRect().top,
      closingFrames,
    );

    const rest = firstRest(tops);
    await expect(rest).toBeGreaterThan(0);
    await expect(tops.slice(rest)).toEqual(
      tops.slice(rest).map(() => tops.at(-1)),
    );
  },
};

// A disabled Collapsible keeps its content closed when its header is pressed.
export const DisabledStaysClosed: Story = {
  render: () => (
    <Collapsible disabled>
      <CollapsibleHeader icon="read" label={toggleLabel} />
      <CollapsibleContent testID={animatedDetailId}>
        <Text>Tool call detail</Text>
      </CollapsibleContent>
    </Collapsible>
  ),
  play: async ({ canvas }) => {
    await settleViewport(layoutWidths.wide);
    const trigger = canvas.getByRole('button', { name: toggleLabel });
    trigger.click();
    await expect(trigger).toHaveAttribute(expanded, 'false');
    await expect(
      canvas.queryByTestId(animatedDetailId),
    ).not.toBeInTheDocument();
  },
};

const dark = { globals: { mode: 'dark' } };

export const DisclosurePhoneDark: Story = {
  ...DisclosurePhone,
  ...dark,
};

export const DisclosureWideDark: Story = {
  ...DisclosureWide,
  ...dark,
};
