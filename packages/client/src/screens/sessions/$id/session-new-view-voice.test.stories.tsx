import { settleLayout } from '@repo/kit/mocks/story-layout';
import { expect, fn } from 'storybook/test';
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

const onStart = fn();

// With nothing written, New Session offers the same voice button as a Session page; pressing it starts the call.
export const OffersVoice: Story = {
  args: readyArgs({ voice: { kind: 'start', onStart } }),
  play: async ({ canvas, userEvent }) => {
    await settleLayout(1440);
    await expect(canvas.queryByRole('button', { name: 'Send' })).toBeNull();
    await userEvent.click(
      await canvas.findByRole('button', { name: voiceLabel }),
    );
    await expect(onStart).toHaveBeenCalledOnce();
  },
};

// Text in the draft keeps Send.
export const TextKeepsSend: Story = {
  args: readyArgs({ voice: { kind: 'start', onStart }, draft: typedDraft }),
  play: async ({ canvas }) => {
    await settleLayout(1440);
    await expect(
      await canvas.findByRole('button', { name: 'Send' }),
    ).toBeEnabled();
    await expect(canvas.queryByRole('button', { name: voiceLabel })).toBeNull();
  },
};
