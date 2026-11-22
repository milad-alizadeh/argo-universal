import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement } from 'react';
import { Pressable, Text } from 'react-native';
import { expect, fn, waitFor } from 'storybook/test';
import {
  declaredRegions,
  draftSteps,
  drawingHeader,
  landed,
} from '../../../../lib/product/plugin-registry/draft-drawing-fixtures';
import { DraftSteps } from '../../../../lib/product/plugin-registry/draft-drawing.mocks';
import { headerTag, listTag } from './draft-region-fixtures';
import { DraftRegionsProvider } from './draft-regions';

const headerSays = 'Header · B 2/3';

const listSays = 'List · A 1/2';

const onStep = fn();

function DraftPage({ from }: { from: number }): ReactElement {
  const [shown, setShown] = useState(from);

  return (
    <DraftRegionsProvider regions={{ tags: [headerTag, listTag], onStep }}>
      <Pressable
        accessibilityRole="button"
        onPress={() => setShown((step) => step + 1)}
      >
        <Text>Next step</Text>
      </Pressable>
      <DraftSteps steps={draftSteps} shown={shown} regions={declaredRegions} />
    </DraftRegionsProvider>
  );
}

const meta = {
  title: 'Tests/Plugins/DraftRegions',
  render: (): ReactElement => <DraftPage from={drawingHeader} />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const HidesTheTagOfAFramedRegion: Story = {
  play: async ({ canvas }) => {
    await canvas.findByTestId('draft-frame-header');
    await expect(canvas.queryByText(headerSays)).toBeNull();
    await expect(await canvas.findByText(listSays)).toBeVisible();
  },
};

export const ReturnsTheTagWhenTheFrameDissolves: Story = {
  render: (): ReactElement => <DraftPage from={drawingHeader + 2} />,
  play: async ({ canvas, userEvent }) => {
    await canvas.findByTestId('draft-frame-list');
    await expect(canvas.queryByText(listSays)).toBeNull();

    const title = await canvas.findByText('Issues');

    await userEvent.click(canvas.getByRole('button', { name: 'Next step' }));
    await waitFor(() =>
      expect(canvas.queryByTestId('draft-frame-list')).toBeNull(),
    );
    await waitFor(() => expect(canvas.getByText(listSays)).toBeVisible());
    await expect(onStep).not.toHaveBeenCalled();
    await expect(canvas.getByText('Issues')).toBe(title);
  },
};

export const HidingTheTagKeepsTheRegionContent: Story = {
  render: (): ReactElement => <DraftPage from={0} />,
  play: async ({ canvas, userEvent }) => {
    const placeholder = await canvas.findByText('Page title');
    const next = canvas.getByRole('button', { name: 'Next step' });

    await expect(await canvas.findByText(headerSays)).toBeVisible();
    await userEvent.click(next);
    await userEvent.click(next);
    await canvas.findByTestId('draft-frame-header');
    await expect(canvas.queryByText(headerSays)).toBeNull();
    await expect(canvas.getByText('Page title')).toBe(placeholder);
  },
};

export const ShowsEveryTagOnceTheDrawingHasLanded: Story = {
  render: (): ReactElement => <DraftPage from={landed} />,
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(headerSays)).toBeVisible();
    await expect(await canvas.findByText(listSays)).toBeVisible();
  },
};
