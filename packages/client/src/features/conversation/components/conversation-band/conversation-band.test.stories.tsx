import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { expect, waitFor } from 'storybook/test';
import {
  silentSpectrum,
  type VoiceSpectrum,
} from '../../types/conversation-connection';
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

// The label hugs its words, inside the row; the bars take every point it leaves.
export const LabelHugsItsText: Story = {
  play: async ({ canvas }) => {
    await measure(canvas);

    const row = boxOf(canvas.getByTestId(rowId));
    const label = boxOf(canvas.getByTestId(labelId));

    const span =
      boxOf(canvas.getByText('2:43')).right -
      boxOf(canvas.getByText('Listening')).left;

    await expect(label.right).toBeLessThanOrEqual(row.right);
    await expect(label.width).toBeCloseTo(span, 0);
  },
};
