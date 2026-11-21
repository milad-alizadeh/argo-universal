import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement } from 'react';
import { Pressable, Text } from 'react-native';
import { expect, waitFor } from 'storybook/test';
import {
  draftSteps,
  drawingHeader,
  drawingList,
  landed,
} from './draft-drawing-fixtures';
import { DraftSteps } from './draft-drawing.mocks';

const meta = {
  title: 'Tests/Design System/Patterns/DraftDrawing',
  component: DraftSteps,
  args: { steps: draftSteps, shown: landed },
} satisfies Meta<typeof DraftSteps>;

export default meta;

type Story = StoryObj<typeof meta>;

// The label names the region being written, and the frame stands round that region's skeleton.
export const FramesTheRegionBeingWritten: Story = {
  args: { shown: drawingHeader },
  play: async ({ canvas }) => {
    await waitFor(async () =>
      expect(await canvas.findByText('Drawing · Header')).toBeVisible(),
    );
    await expect(canvas.queryByText('Drawing · List')).toBeNull();
  },
};

// The frame moves to the next region as the one before lands.
export const MovesTheFrameToTheNextRegion: Story = {
  args: { shown: drawingList },
  play: async ({ canvas }) => {
    await waitFor(async () =>
      expect(await canvas.findByText('Drawing · List')).toBeVisible(),
    );
    await waitFor(() =>
      expect(canvas.queryByText('Drawing · Header')).toBeNull(),
    );
    await waitFor(async () =>
      expect(await canvas.findByText('Issues')).toBeVisible(),
    );
  },
};

// The frame dissolves once the last region lands, and its new rows are drawn.
export const DissolvesTheFrameOnceTheRegionLands: Story = {
  play: async ({ canvas }) => {
    await waitFor(async () =>
      expect(
        await canvas.findByText('Workbench card loses its tab after a reload'),
      ).toBeVisible(),
    );
    await waitFor(() => expect(canvas.queryByText(/^Drawing · /)).toBeNull());
  },
};

// The page, with a press that lets the Agent land the list.
function LandsOnPress(): ReactElement {
  const [shown, setShown] = useState(drawingList);

  return (
    <>
      <Pressable accessibilityRole="button" onPress={() => setShown(landed)}>
        <Text>Land the list</Text>
      </Pressable>
      <DraftSteps steps={draftSteps} shown={shown} />
    </>
  );
}

// A redraw leaves the nodes whose keys are unchanged where they were: the same element, not a new one.
export const KeepsUnchangedNodesStill: Story = {
  render: () => <LandsOnPress />,
  play: async ({ canvas, userEvent }) => {
    const title = await canvas.findByText('Issues');

    await userEvent.click(
      canvas.getByRole('button', { name: 'Land the list' }),
    );
    await canvas.findByText('Workbench card loses its tab after a reload');
    await expect(canvas.getByText('Issues')).toBe(title);
  },
};
