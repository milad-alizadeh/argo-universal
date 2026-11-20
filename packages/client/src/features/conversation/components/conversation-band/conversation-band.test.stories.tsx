import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { expect, waitFor } from 'storybook/test';
import {
  silentSpectrum,
  type VoiceSpectrum,
} from '../../types/conversation-connection';
import { barPitch } from './band-layout';
import { ConversationBand } from './conversation-band';

const silent = silentSpectrum();

const connected = {
  state: 'listening',
  trouble: null,
  microphoneMuted: false,
} as const;

type Props = React.ComponentProps<typeof ConversationBand>;

type Render = (args: Props) => React.JSX.Element;

const inWidth =
  (width: number): Render =>
  (args) => (
    <View style={{ width }} className="bg-card">
      <ConversationBand {...args} />
    </View>
  );

const meta = {
  title: 'Tests/Conversation/ConversationBand',
  component: ConversationBand,
  render: inWidth(640),
  args: {
    call: connected,
    elapsed: '2:43',
    spectrum: (): VoiceSpectrum => silent,
  },
} satisfies Meta<typeof ConversationBand>;

export default meta;

type Story = StoryObj<typeof meta>;

type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas'];

const rowId = 'conversation-band';

const labelId = 'conversation-band-label';

const boxOf = (element: Element | undefined): DOMRect =>
  element?.getBoundingClientRect() ?? new DOMRect();

interface Measured {
  bars: HTMLElement[];
  // From the row's left edge to the first bar.
  left: number;
  // From the last bar to the label.
  right: number;
}

// Waits for the strip to measure itself and draw its bars, then measures both gaps.
async function measure(canvas: Canvas): Promise<Measured> {
  await waitFor(() =>
    expect(canvas.queryAllByTestId('conversation-band-bar')).not.toHaveLength(
      0,
    ),
  );

  const bars = canvas.getAllByTestId('conversation-band-bar');
  const row = boxOf(canvas.getByTestId(rowId));
  const label = boxOf(canvas.getByTestId(labelId));

  return {
    bars,
    left: boxOf(bars[0]).left - row.left,
    right: label.left - boxOf(bars.at(-1)).right,
  };
}

// The gap between the Composer's left edge and the first bar equals the gap between the last bar and the label.
export const InsetsAreEqual: Story = {
  play: async ({ canvas }) => {
    const { left, right } = await measure(canvas);

    await expect(left).toBeCloseTo(right, 0);
    // The row's own 16 points, plus under half a pitch of leftover room.
    await expect(left).toBeGreaterThanOrEqual(16);
    await expect(left).toBeLessThan(16 + barPitch / 2 + 0.5);
  },
};

// A narrow Composer keeps the same equal gaps with fewer bars.
export const InsetsAreEqualWhenNarrow: Story = {
  render: inWidth(360),
  play: async ({ canvas }) => {
    const { bars, left, right } = await measure(canvas);

    await expect(left).toBeCloseTo(right, 0);
    await expect(bars.length).toBeLessThan(25);
  },
};

// The label hugs its words and ends 16 points inside the row's right edge; the bars take every point it leaves.
export const LabelHugsItsText: Story = {
  play: async ({ canvas }) => {
    await measure(canvas);

    const row = boxOf(canvas.getByTestId(rowId));
    const label = boxOf(canvas.getByTestId(labelId));

    const span =
      boxOf(canvas.getByText('2:43')).right -
      boxOf(canvas.getByText('Listening')).left;

    await expect(row.right - label.right).toBeCloseTo(16, 0);
    await expect(label.width).toBeCloseTo(span, 0);
  },
};

const colourOf = (bar: HTMLElement | undefined): string =>
  bar ? getComputedStyle(bar).backgroundColor : '';

// The ends of the strip are not faded: the first and last bars draw as strongly as the middle one at rest.
export const NoFadeAtEitherEnd: Story = {
  play: async ({ canvas }) => {
    const { bars } = await measure(canvas);
    const middle = colourOf(bars[Math.floor(bars.length / 2)]);

    await waitFor(() => expect(colourOf(bars[0])).toBe(middle));
    await expect(colourOf(bars.at(-1))).toBe(middle);
  },
};
