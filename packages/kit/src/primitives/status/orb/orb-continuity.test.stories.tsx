import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { expect, waitFor } from 'storybook/test';
import { Orb } from './orb';
import { OrbContinuity } from './orb-continuity';

const meta = {
  title: 'Tests/Design System/Primitives/Status/Orb/Continuity',
  parameters: { screenPreview: true },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// CanvasKit loads before the first canvas is drawn.
const drawsWithin = { timeout: 15_000 };

const canvasIn = (orb: HTMLElement): HTMLCanvasElement | null =>
  orb.querySelector('canvas');

async function drawnCanvas(orb: HTMLElement): Promise<HTMLCanvasElement> {
  await waitFor(() => expect(canvasIn(orb)).not.toBeNull(), drawsWithin);
  const canvas = canvasIn(orb);

  if (!canvas) throw new Error('The orb draws no canvas');

  return canvas;
}

// One orb at a time, as a Feed row's orb gives way to the next row's: `next` swaps it for a new one, and `toggle` takes it away or brings a new one.
function OrbAfterOrb(): React.JSX.Element {
  const [step, setStep] = useState(0);
  const [shown, setShown] = useState(true);

  return (
    <OrbContinuity>
      <Pressable testID="next" onPress={() => setStep((at) => at + 1)}>
        <View>
          {shown && (
            <Orb key={step} continues accessibilityLabel={`Orb ${step}`} />
          )}
        </View>
      </Pressable>
      <Pressable testID="toggle" onPress={() => setShown((was) => !was)}>
        <View className="size-5" />
      </Pressable>
    </OrbContinuity>
  );
}

export const NextOrbShowsTheSameCanvas: Story = {
  render: () => <OrbAfterOrb />,
  play: async ({ canvas, userEvent }) => {
    const first = await drawnCanvas(await canvas.findByLabelText('Orb 0'));

    await userEvent.click(canvas.getByTestId('next'));
    const second = await drawnCanvas(await canvas.findByLabelText('Orb 1'));

    // The canvas is moved, never made anew, so the new orb has no empty first frame.
    await expect(second === first).toBe(true);
    await expect(canvas.queryByLabelText('Orb 0')).toBeNull();
  },
};

export const OrbBackAfterAMomentShowsTheSameCanvas: Story = {
  render: () => <OrbAfterOrb />,
  play: async ({ canvas, userEvent }) => {
    const toggle = canvas.getByTestId('toggle');
    const first = await drawnCanvas(await canvas.findByLabelText('Orb 0'));

    await userEvent.click(toggle);
    await waitFor(() => expect(canvas.queryByLabelText('Orb 0')).toBeNull());
    await userEvent.click(toggle);
    const back = await drawnCanvas(await canvas.findByLabelText('Orb 0'));

    await expect(back === first).toBe(true);
  },
};

// Two orbs on screen at once, as a running Tool call group's orb beside the live header's: one shows the shared drawing and the other draws its own.
export const TwoOrbsAtOnceBothDraw: Story = {
  render: () => (
    <OrbContinuity>
      <Orb continues state="searching" accessibilityLabel="Group" />
      <Orb continues state="solving" accessibilityLabel="Header" />
    </OrbContinuity>
  ),
  play: async ({ canvas }) => {
    const group = await drawnCanvas(await canvas.findByLabelText('Group'));
    const header = await drawnCanvas(await canvas.findByLabelText('Header'));

    await expect(group === header).toBe(false);
  },
};
