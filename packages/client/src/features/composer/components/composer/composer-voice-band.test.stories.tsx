import { settleLayout, type LayoutName } from '@repo/kit/mocks/story-layout';
import { expect } from 'storybook/test';
import { composerProps } from '../../../../../mocks/composer-mock';
import type { Story } from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { meta as composerTestMeta } from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { Composer } from './composer';
import { bandTalkingComposer } from './composer-voice-band-fixtures';
import { voiceCallComposer } from './composer-voice-fixtures';

const meta = { ...composerTestMeta, title: 'Tests/Composer/Voice/Band' };

export default meta;

type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas'];

// The kit's Secondary size at each width, as Paper's band sets its label and timer.
const secondaryType = {
  wide: { fontSize: '12px', lineHeight: '16px' },
  phone: { fontSize: '14px', lineHeight: '20px' },
} as const;

const fieldOf = (canvas: Canvas): HTMLElement =>
  canvas.getByRole('textbox', { name: 'Message' });

interface TypeLook {
  fontSize: string;
  lineHeight: string;
  fontWeight: string;
}

const typeOf = (element: HTMLElement): TypeLook => {
  const style = getComputedStyle(element);

  return {
    fontSize: style.fontSize,
    lineHeight: style.lineHeight,
    fontWeight: style.fontWeight,
  };
};

const onCall = (
  layout: Extract<LayoutName, 'wide' | 'phone'>,
  play: (canvas: Canvas) => Promise<void>,
): Story => ({
  render: (args) => (
    <Composer {...composerProps({ ...args, sessionStarted: true })} />
  ),
  args: bandTalkingComposer,
  play: async ({ canvas }) => {
    await settleLayout(layout);
    await play(canvas);
  },
});

// The label is Secondary at medium weight and the timer Secondary at regular, not the Composer's Body.
const bandType = (layout: 'wide' | 'phone'): Story =>
  onCall(layout, async (canvas) => {
    await expect(typeOf(canvas.getByText('Talking'))).toEqual({
      ...secondaryType[layout],
      fontWeight: '500',
    });
    await expect(typeOf(canvas.getByText('2:51'))).toEqual({
      ...secondaryType[layout],
      fontWeight: '400',
    });
  });

export const BandTypeWide = bandType('wide');

export const BandTypePhone = bandType('phone');

// The label sits inside the band, hugging its words, and ends the band's 16 points padding from its right edge, at every width.
const bandEdges = (layout: 'wide' | 'phone'): Story =>
  onCall(layout, async (canvas) => {
    const band = canvas.getByTestId('voice-edge-band').getBoundingClientRect();
    const label = canvas.getByText('2:51').getBoundingClientRect();

    await expect(label.bottom).toBeLessThanOrEqual(band.bottom);
    await expect(label.top).toBeGreaterThanOrEqual(band.top);
    await expect(band.right - label.right).toBeCloseTo(16, 0);
  });

export const BandEdgesWide = bandEdges('wide');

export const BandEdgesPhone = bandEdges('phone');

// Under the band the field's top padding is 6 points, not the 12 it has without one.
export const FieldUnderTheBand = onCall('wide', async (canvas) => {
  await expect(getComputedStyle(fieldOf(canvas)).paddingTop).toBe('6px');
});

// Without a band the field keeps today's 12-point top padding.
export const FieldWithoutTheBand: Story = {
  ...onCall('wide', async (canvas) => {
    await expect(getComputedStyle(fieldOf(canvas)).paddingTop).toBe('12px');
  }),
  args: voiceCallComposer,
};
