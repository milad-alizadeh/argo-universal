import { reduceMotion } from '@repo/kit/mocks/reduced-motion';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';
import { expect, waitFor } from 'storybook/test';
import {
  declaredRegions,
  draftSteps,
  drawingHeader,
  drawingList,
  landed,
  listLandedPage,
  rowPage,
  rowSteps,
} from './draft-drawing-fixtures';
import { DraftSteps } from './draft-drawing.mocks';
import { PluginTree } from './plugin-registry';

const meta = {
  title: 'Tests/Design System/Patterns/DraftDrawing',
  component: DraftSteps,
  args: { steps: draftSteps, shown: landed, regions: declaredRegions },
} satisfies Meta<typeof DraftSteps>;

export default meta;

type Story = StoryObj<typeof meta>;

const frameOf = (region: string): string => `draft-frame-${region}`;

// The page, with a press that moves the Agent one step on.
function Advances({
  from,
  steps = draftSteps,
}: {
  from: number;
  steps?: typeof draftSteps;
}): ReactElement {
  const [shown, setShown] = useState(from);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => setShown((step) => step + 1)}
      >
        <Text>Next step</Text>
      </Pressable>
      <DraftSteps steps={steps} shown={shown} regions={declaredRegions} />
    </>
  );
}

// The frame stands round the region being written, and no other.
export const FramesTheRegionBeingWritten: Story = {
  args: { shown: drawingHeader },
  play: async ({ canvas }) => {
    await waitFor(async () =>
      expect(await canvas.findByTestId(frameOf('header'))).toBeVisible(),
    );
    await expect(canvas.queryByTestId(frameOf('list'))).toBeNull();
  },
};

// The frame moves to the next region as the one before lands.
export const MovesTheFrameToTheNextRegion: Story = {
  args: { shown: drawingList },
  play: async ({ canvas }) => {
    await waitFor(async () =>
      expect(await canvas.findByTestId(frameOf('list'))).toBeVisible(),
    );
    await waitFor(() =>
      expect(canvas.queryByTestId(frameOf('header'))).toBeNull(),
    );
  },
};

// The frame dissolves once the last region lands, and its new rows are drawn.
export const DissolvesTheFrameOnceTheRegionLands: Story = {
  play: async ({ canvas }) => {
    await waitFor(async () =>
      expect(await canvas.findByText(/Workbench card/)).toBeVisible(),
    );
    await waitFor(() =>
      expect(canvas.queryByTestId(frameOf('list'))).toBeNull(),
    );
  },
};

// A redraw leaves the nodes whose keys are unchanged where they were: the same element, not a new one.
export const KeepsUnchangedNodesStill: Story = {
  render: () => <Advances from={drawingList} />,
  play: async ({ canvas, userEvent }) => {
    const title = await canvas.findByText('Issues');

    await userEvent.click(canvas.getByRole('button', { name: 'Next step' }));
    await canvas.findByText(/Workbench card/);
    await expect(canvas.getByText('Issues')).toBe(title);
  },
};

// Naming a region frames it without drawing what is inside it again: the same element across the transition.
export const FramingARegionKeepsItsContent: Story = {
  render: () => <Advances from={0} />,
  play: async ({ canvas, userEvent }) => {
    await canvas.findAllByText('Loading');
    const [placeholder] = canvas.getAllByText('Loading');
    const next = canvas.getByRole('button', { name: 'Next step' });

    await userEvent.click(next);
    await userEvent.click(next);
    await canvas.findByTestId(frameOf('header'));
    await expect(canvas.getAllByText('Loading')[0]).toBe(placeholder);
  },
};

// A tree that is not a Draft draws none of the Draft wrappers.
export const DrawsNoWrapperWithoutADraft: Story = {
  render: () => <PluginTree root={listLandedPage()} />,
  play: async ({ canvas }) => {
    await canvas.findByText('Issues');
    await expect(canvas.queryAllByTestId(/^draft-/)).toHaveLength(0);
  },
};

// The width of each of the row's own Text, by what it says.
const widthsOf = (container: HTMLElement): Record<string, number> =>
  Object.fromEntries(
    [...container.querySelectorAll('[dir="auto"]')]
      .filter((text) => /^(Label|Fills)/.test(text.textContent))
      .map((text) => [text.textContent, text.getBoundingClientRect().width]),
  );

// A row's children keep the widths they have in a tree that is not a Draft, framed or not.
export const KeepsTheLayoutOfARow: Story = {
  render: () => (
    <View>
      <View testID="plain-row">
        <PluginTree root={rowPage()} />
      </View>
      <View testID="draft-row">
        <Advances from={0} steps={rowSteps} />
      </View>
    </View>
  ),
  play: async ({ canvas, userEvent }) => {
    const plain = await canvas.findByTestId('plain-row');
    const drafted = await canvas.findByTestId('draft-row');

    await waitFor(() => expect(Object.keys(widthsOf(drafted))).toHaveLength(2));
    expect(widthsOf(drafted)).toEqual(widthsOf(plain));
    await userEvent.click(canvas.getByRole('button', { name: 'Next step' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Next step' }));
    await canvas.findByTestId(frameOf('header'));
    expect(widthsOf(drafted)).toEqual(widthsOf(plain));
  },
};

// Reduced motion shows the new rows and ends the frame at once, with no fade between.
export const ReducedMotionShowsEachStepAtOnce: Story = {
  beforeEach: reduceMotion,
  render: () => <Advances from={drawingList} />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Next step' }));

    const row = await canvas.findByText(/Workbench card/);

    await expect(row).toBeVisible();
    await expect(canvas.queryByTestId(frameOf('list'))).toBeNull();
  },
};
