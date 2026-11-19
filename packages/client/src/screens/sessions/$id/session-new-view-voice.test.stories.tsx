import { settleLayout } from '@repo/kit/mocks/story-layout';
import { expect, fn } from 'storybook/test';
import type { ComposerVoice } from '#features/composer';
import { readyArgs } from '../../../../mocks/new-session-view/new-session-send.test.mocks';
import {
  meta as sessionNewViewTestMeta,
  type Story,
} from '../../../../mocks/new-session-view/new-session-story.test.mocks';
import { typedDraft } from './session-new-view.mocks';

const meta = {
  ...sessionNewViewTestMeta,
  title: 'Tests/Screens/Sessions/New Session/Voice',
};

export default meta;

const voiceLabel = 'Start voice call';

// Each story's own press spy, so nothing is shared between stories.
const startOf = (voice: ComposerVoice | undefined): (() => void) | undefined =>
  voice?.kind === 'start' ? voice.onStart : undefined;

// With nothing written, New Session offers the same voice button as a Session page; pressing it starts the call.
export const OffersVoice: Story = {
  args: readyArgs({ voice: { kind: 'start', onStart: fn() } }),
  play: async ({ args, canvas, userEvent }) => {
    await settleLayout(1440);
    await expect(canvas.queryByRole('button', { name: 'Send' })).toBeNull();
    await userEvent.click(
      await canvas.findByRole('button', { name: voiceLabel }),
    );

    if (args.view.state !== 'ready') throw new Error('The view is not ready.');
    await expect(startOf(args.view.voice)).toHaveBeenCalledOnce();
  },
};

// Text in the draft keeps Send.
export const TextKeepsSend: Story = {
  args: readyArgs({
    voice: { kind: 'start', onStart: fn() },
    draft: typedDraft,
  }),
  play: async ({ canvas }) => {
    await settleLayout(1440);
    await expect(
      await canvas.findByRole('button', { name: 'Send' }),
    ).toBeEnabled();
    await expect(canvas.queryByRole('button', { name: voiceLabel })).toBeNull();
  },
};
