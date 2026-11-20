import { settleLayout, type LayoutName } from '@repo/kit/mocks/story-layout';
import { expect } from 'storybook/test';
import { composerProps } from '../../../../../mocks/composer-mock';
import type { Story } from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { meta as composerTestMeta } from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { Composer } from './composer';
import { bandTalkingComposer } from './composer-voice-band-fixtures';

const meta = { ...composerTestMeta, title: 'Tests/Composer/Voice/Band' };

export default meta;

type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas'];

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

// The label sits inside the band at every width.
const bandEdges = (layout: 'wide' | 'phone'): Story =>
  onCall(layout, async (canvas) => {
    const band = canvas.getByTestId('voice-edge-band').getBoundingClientRect();
    const label = canvas.getByText('2:51').getBoundingClientRect();

    await expect(label.bottom).toBeLessThanOrEqual(band.bottom);
    await expect(label.top).toBeGreaterThanOrEqual(band.top);
  });

export const BandEdgesWide = bandEdges('wide');

export const BandEdgesPhone = bandEdges('phone');
